# TrustVault — REST API Specification (v1)

Base URL: `/api/v1`

All protected endpoints require an `Authorization: Bearer <JWT>` header unless designated as `Anonymous`.

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### 1.1 Login
* **Method & Route**: `POST /api/v1/auth/login`
* **Access**: Anonymous
* **Request Body**:
  ```json
  {
    "email": "owner@trustvault.com",
    "password": "Owner@12345!"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "refreshToken": "base64...",
    "expiration": "2026-10-19T22:15:00Z",
    "user": {
      "id": "e7b0c...",
      "username": "document_owner",
      "email": "owner@trustvault.com",
      "role": "Owner",
      "department": "Corporate Legal",
      "isActive": true,
      "createdAt": "2026-10-19T12:00:00Z"
    }
  }
  ```
* **Security & Audit**: Refused logins are recorded in the audit trail with `Action = UserLogin`, `Status = Refused`.

### 1.2 Token Refresh
* **Method & Route**: `POST /api/v1/auth/refresh`
* **Access**: Anonymous
* **Request Body**: `{ "refreshToken": "..." }`
* **Response**: Returns rotated access token and fresh refresh token. Rejects revoked tokens.

### 1.3 Logout
* **Method & Route**: `POST /api/v1/auth/logout`
* **Access**: Authenticated
* **Behavior**: Revokes refresh token in database, invalidating the session.

### 1.4 Current Profile
* **Method & Route**: `GET /api/v1/auth/me`
* **Access**: Authenticated
* **Response**: Returns server-validated profile and role.

---

## 2. Document Operations (`/api/v1/documents`)

### 2.1 List Accessible Documents
* **Method & Route**: `GET /api/v1/documents`
* **Access**: Authenticated
* **Behavior by Role**:
  * **Document Owner**: Returns owned documents + documents explicitly granted to them.
  * **Viewer**: Returns strictly documents with active, unrevoked `DocumentGrant` entries.
  * **Administrator**: Returns strictly documents personally granted (Least Privilege).
* **Response (200 OK)**:
  ```json
  [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "title": "Enterprise Master Services Agreement",
      "description": "Standard commercial terms",
      "category": "Contracts",
      "originalFileName": "MSA_Final.pdf",
      "contentType": "application/pdf",
      "fileSizeBytes": 131072,
      "fileHashSha256": "ca9781...",
      "ownerId": "...",
      "ownerEmail": "owner@trustvault.com",
      "createdAt": "2026-10-18T10:00:00Z",
      "permittedActions": ["Read", "Download"]
    }
  ]
  ```

### 2.2 Upload Document
* **Method & Route**: `POST /api/v1/documents/upload`
* **Access**: `Owner` only
* **Content-Type**: `multipart/form-data`
* **Payload**: `file` (binary), `title` (string), `description` (string), `category` (string)
* **Security Invariants**:
  1. Inspects file magic bytes (binary header signatures). Rejects executables masked as documents (`400 Bad Request`).
  2. Enforces 25MB file size limit.
  3. Strips path traversal sequences (`../../`).
  4. Encrypts payload in-memory with AES-256-GCM using random 12-byte IV and 16-byte tag.
  5. Saves blob as cryptographically random GUID file outside web root.
  6. Dispatches `DocumentUpload` to hash-chained audit trail.

### 2.3 Download Document
* **Method & Route**: `GET /api/v1/documents/{id}/download`
* **Access**: Authenticated with explicit `Download` permission or `Owner`
* **Security Invariants**:
  * If caller lacks `Download` permission or file does not exist: returns uniform `404 Not Found` (never 403, preventing existence leaks).
  * Refused attempt is dispatched to audit trail with `Status = Refused`.
  * If authorized: decrypts AES-256-GCM blob in memory and streams to response.

### 2.4 View Document Metadata
* **Method & Route**: `GET /api/v1/documents/{id}`
* **Access**: Authenticated with `Read` permission or `Owner`
* **Response**: Returns document metadata and caller's permitted actions.

### 2.5 Search Documents
* **Method & Route**: `GET /api/v1/documents/search?query=...&category=...&ownerEmail=...&fromDate=...&toDate=...`
* **Access**: Authenticated
* **Behavior**: Evaluates search filters strictly within the user's permitted documents.

---

## 3. Permissions & Grants (`/api/v1/documents/{id}/permissions`)

### 3.1 List Document Grants
* **Method & Route**: `GET /api/v1/documents/{id}/permissions`
* **Access**: Document Owner only
* **Response**: Lists all active named individuals granted access.

### 3.2 Grant Discrete Permissions to Named User
* **Method & Route**: `POST /api/v1/documents/{id}/permissions/grant`
* **Access**: Document Owner only
* **Request Body**:
  ```json
  {
    "userId": "guid-here",
    "permissions": [1, 2] // 1 = Read, 2 = Download, 3 = Edit, 4 = Delete
  }
  ```
* **Security**: Creates explicit `DocumentGrant` rows. Dispatches `PermissionGranted` audit event.

### 3.3 Bulk-Grant by Tag (Expand-on-Grant)
* **Method & Route**: `POST /api/v1/documents/{id}/permissions/grant-by-tag`
* **Access**: Document Owner only
* **Request Body**:
  ```json
  {
    "tagName": "Developer",
    "permissions": [1, 2]
  }
  ```
* **Behavior**: Resolves users associated with the tag and creates individual per-user grants.

### 3.4 Revoke Access (Immediate Cutoff)
* **Method & Route**: `DELETE /api/v1/documents/{id}/permissions/revoke/{targetUserId}`
* **Access**: Document Owner only
* **Behavior**: Marks grants revoked in database. Any subsequent request by the revoked user is immediately denied (`404 Not Found`).

---

## 4. Owner-Scoped Operations (`/api/v1/owner`)

### 4.1 Owner Scoped Audit Logs
* **Method & Route**: `GET /api/v1/owner/audit-logs`
* **Access**: `Owner` only
* **Security Invariant**: Strictly scoped to events where `Document.OwnerId == CurrentUser.Id`. Cannot access system-wide logs.

### 4.2 Provision Viewer Account
* **Method & Route**: `POST /api/v1/owner/users/viewers`
* **Access**: `Owner` only
* **Request Body**:
  ```json
  {
    "username": "charlie_qa",
    "email": "charlie@trustvault.com",
    "password": "Viewer@12345!",
    "department": "QA",
    "initialTags": ["Tester"]
  }
  ```

---

## 5. Administrator Compliance & Audit (`/api/v1/admin`)

### 5.1 System-Wide Audit Explorer
* **Method & Route**: `GET /api/v1/admin/audit-logs`
* **Access**: `Admin` only
* **Filters**: `action`, `status` (`Allowed` vs `Refused`), `userId`, `documentId`, `search`, pagination.

### 5.2 Cryptographic Hash Chain Verification
* **Method & Route**: `GET /api/v1/admin/audit-verify`
* **Access**: `Admin` only
* **Response**: Recomputes SHA-256 hash chaining across all sequential audit rows:
  ```json
  {
    "isChainIntact": true,
    "totalAuditedRecords": 42,
    "compromisedLogId": null,
    "verificationTimestamp": "2026-10-19T21:50:00Z",
    "status": "Cryptographic chain verified: zero tampering detected."
  }
  ```

### 5.3 Provision Document Owner
* **Method & Route**: `POST /api/v1/admin/users/owners`
* **Access**: `Admin` only
* **Request Body**: `{ "username": "legal_owner", "email": "legal@trustvault.com", "password": "...", "department": "Legal" }`

### 5.4 Account Deactivation Toggle
* **Method & Route**: `PATCH /api/v1/admin/users/{userId}/toggle-status`
* **Access**: `Admin` only
