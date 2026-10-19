# TrustVault — Architecture & System Design (DESIGN.md)

## 1. System Overview

TrustVault is a zero-trust enterprise document platform designed to ensure confidential documents are reachable **only** by explicitly authorized individuals, with an immutable audit record of every access attempt (both permitted and refused).

---

## 2. Relational Database Schema

TrustVault uses SQL Server (or compatible relational database) via Entity Framework Core with strict foreign key constraints and indexes:

### 2.1 Users (`Users`)
* `Id` (Guid, PK)
* `Username` (nvarchar(100), Unique)
* `Email` (nvarchar(256), Unique)
* `PasswordHash` (nvarchar(max), BCrypt salted hash)
* `Role` (int: 1=Admin, 2=Owner, 3=Viewer)
* `Department` (nvarchar(max))
* `IsActive` (bit)
* `RefreshToken` (nvarchar(max))
* `RefreshTokenExpiryTime` (datetime2)
* `IsRevoked` (bit)
* `CreatedAt` (datetime2)

### 2.2 Documents (`Documents`)
* `Id` (Guid, PK)
* `Title` (nvarchar(256))
* `Description` (nvarchar(max))
* `Category` (nvarchar(100), Indexed)
* `OriginalFileName` (nvarchar(256))
* `StorageFileName` (nvarchar(256), Random UUID on disk)
* `ContentType` (nvarchar(100))
* `FileSizeBytes` (bigint)
* `FileHashSha256` (nvarchar(64))
* `EncryptionIv` (varbinary(12), AES-GCM nonce)
* `EncryptionTag` (varbinary(16), AES-GCM authentication tag)
* `OwnerId` (Guid, FK -> Users)
* `CreatedAt` (datetime2)
* `UpdatedAt` (datetime2, nullable)
* `IsDeleted` (bit, soft delete flag)

### 2.3 Document Grants (`DocumentGrants`)
* `Id` (Guid, PK)
* `DocumentId` (Guid, FK -> Documents)
* `UserId` (Guid, FK -> Users)
* `GrantedByUserId` (Guid, FK -> Users)
* `PermissionType` (int: 1=Read, 2=Download, 3=Edit, 4=Delete)
* `CreatedAtUtc` (datetime2)
* `UpdatedAtUtc` (datetime2, nullable)
* `RevokedAtUtc` (datetime2, nullable)
* *Composite Index*: `(DocumentId, UserId, PermissionType)`

### 2.4 Cryptographic Audit Trail (`AuditLogs`)
* `Id` (bigint, PK Identity, sequential)
* `Timestamp` (datetime2 UTC)
* `UserId` (Guid, nullable)
* `UserEmail` (nvarchar(max))
* `UserRole` (nvarchar(50))
* `Action` (int: UserLogin, DocumentUpload, DocumentDownload, etc.)
* `Status` (int: 1=Allowed, 2=Refused)
* `DocumentId` (Guid, nullable)
* `DocumentTitle` (nvarchar(max))
* `IpAddress` (nvarchar(50))
* `UserAgent` (nvarchar(max))
* `Details` (nvarchar(max))
* `PreviousHash` (char(64), SHA-256 hash of previous row)
* `CurrentHash` (char(64), SHA-256 hash of this entry + PreviousHash)

### 2.5 User Tags (`UserTags`)
* `Id` (Guid, PK)
* `OwnerId` (Guid, FK -> Users)
* `UserId` (Guid, FK -> Users)
* `TagName` (nvarchar(50))
* *Unique Index*: `(OwnerId, UserId, TagName)`

---

## 3. Server-Side Authorization Algorithm

Every protected document operation invokes `DocumentAuthorizationService`:

```
Input: (DocumentId, CurrentUserId, CurrentUserRole, RequiredPermission)

1. Query database: Document WHERE Id = DocumentId AND IsDeleted = false
   If Document == null:
       Log AuditAction.AccessRefused (Status = Refused)
       Return HTTP 404 Not Found

2. If Document.OwnerId == CurrentUserId:
       Return Authorized (Owner has full permissions: Read, Download, Edit, Delete)

3. If CurrentUserRole == Admin:
       // Administrator least privilege: Admins cannot read or download documents!
       Check if an explicit grant exists for Admin user ID:
       If no grant:
           Log AuditAction.AccessRefused (Status = Refused)
           Return HTTP 404 Not Found

4. Query active grants: DocumentGrants WHERE DocumentId = DocumentId 
                        AND UserId = CurrentUserId 
                        AND PermissionType = RequiredPermission 
                        AND RevokedAtUtc IS NULL
   If matching grant found:
       Return Authorized
   Else:
       Log AuditAction.AccessRefused (Status = Refused)
       Return HTTP 404 Not Found
```

---

## 4. Storage & Encryption Architecture

* **Zero Direct Access**: No file is stored in public web paths. Storage files reside outside the web root (`Storage/encrypted_blobs/`).
* **Random GUID Storage Filename**: An uploaded file `salary_2026.pdf` is stored as `b7c9e1...blob`. The original file name exists only as encrypted database metadata.
* **AES-256-GCM AEAD Encryption**:
  * 256-bit server master encryption key.
  * Unique 96-bit (12-byte) random nonce per file generated via `RandomNumberGenerator.Fill()`.
  * 128-bit (16-byte) authentication tag computed on encryption.
  * Decryption verifies authentication tag before releasing decrypted stream. Bit flips throw `CryptographicException`.

---

## 5. Tamper-Evident Audit Chaining

Every audit log entry is linked chronologically using a cryptographic SHA-256 hash chain:

$$H_i = \text{SHA256}(H_{i-1} \parallel \text{Timestamp (ISO-8601)} \parallel \text{UserId} \parallel \text{Action} \parallel \text{Status} \parallel \text{DocumentId} \parallel \text{Details})$$

Where $H_0 = 64 \text{ zeros}$ (Genesis Hash).

### Verification
The verification algorithm sequentially iterates over all rows ordered by sequential `Id`:
1. Asserts `Row[i].PreviousHash == Row[i-1].CurrentHash`.
2. Recomputes $H_i$ from payload and asserts $H_i == \text{Row}[i].\text{CurrentHash}$.
3. Any modified row, deleted row, or reordered row breaks the chain and pinpoint the exact compromised record.
