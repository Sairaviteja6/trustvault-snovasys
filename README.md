# TrustVault 🔐

> **Secure Document Sharing with a Cryptographically Verifiable Audit Trail**

TrustVault is an enterprise document platform built with a **security-first invariant**: the wrong person can never read a document, and every access attempt (allowed or refused) is permanently, tamper-evidently recorded.

Built with **ASP.NET Core (.NET 8)**, **SQL Server**, and **Angular 19**.

---

## 🌐 Live Production Deployments

| Component | Target URL | Notes |
| :--- | :--- | :--- |
| **Official Live Production URL (HTTPS)** | **[https://trustvault-snovasys.vercel.app](https://trustvault-snovasys.vercel.app)** | Complete Angular 19 SPA + Edge API Proxy over TLS/HTTPS (Green Padlock). |
| **AWS Cloud Infrastructure (ALB)** | `http://trustvault-alb-production-1074225278.us-east-1.elb.amazonaws.com` | AWS Application Load Balancer, EC2 Linux Docker backend, RDS SQL Server. |
| **GitHub Repository** | [https://github.com/Sairaviteja6/trustvault-snovasys](https://github.com/Sairaviteja6/trustvault-snovasys) | Clean commit history spanning full sprint week. |

> **Evaluator Quick Start**: Open [https://trustvault-snovasys.vercel.app](https://trustvault-snovasys.vercel.app) in an incognito or private browser window. Click **Sign In** to access the sign-in modal, or use the one-click **Evaluation Quick-Access Bar** to instantly log in as Admin, Owner, or Viewer.

---

## 🏛️ System Architecture

TrustVault enforces security at the protocol and storage layers, not just UI visibility:

1. **Role-Based Access Control (RBAC)**:
   - **Administrator**: User provisioning, health metrics, and tamper-evident audit trail monitoring. Admins **cannot** read or download user documents.
   - **Document Owner**: Uploads, categorizes, grants/revokes permissions to named individuals, and inspects document-level access logs.
   - **Viewer**: Authenticated user who can only view/download documents explicitly granted to them.

2. **Zero-Trust File Delivery**:
   - Files are stored as AES-256-GCM encrypted blobs outside the web root.
   - Files are **never** exposed via public URLs or static file directories.
   - Every file download triggers an in-memory decryption stream only after server-side authorization passes.
   - Unauthorized requests return **`404 Not Found`** uniformly (not `403`), eliminating document existence enumeration.

3. **Cryptographically Chained Audit Trail**:
   - Every event (Upload, Download, Revoke, Grant, Failed Attempt) is recorded with SHA-256 hash chaining ($H_i = \text{SHA256}(H_{i-1} \parallel R_i)$).
   - Any manual tampering in the database breaks the chain verification.

4. **Instant Revocation**:
   - Permissions are evaluated dynamically against the database on each request.
   - Revoking a user immediately cuts off their access without waiting for token expirations.

---

## 📁 Repository Structure

```
├── backend/                  # ASP.NET Core Web API (.NET 8)
│   ├── TrustVault.Api/       # Controllers, Middlewares, Auth, Startup
│   ├── TrustVault.Core/      # Domain Entities, Interfaces, Enums
│   ├── TrustVault.Infrastructure/ # EF Core, SQL Server, Encryption, Audit
│   └── TrustVault.Tests/     # Adversarial Security & Access Control Tests
├── frontend/                 # Angular 17+ Enterprise SPA
├── THREATS.md                # STRIDE Threat Model & Security Decisions
├── PROMPTS.md                # AI Interaction, Prompt Log & Critical Reviews
└── README.md
```

---

## 🔑 Seed User Accounts & Roles

The system seeds three primary roles out of the box with zero setup required:

| Role | Email | Password | Permissions & Scope |
|---|---|---|---|
| **Administrator** | `admin@trustvault.com` | `Admin@12345!` | Manages user accounts, reviews full audit logs, verifies cryptographic chain integrity. **Cannot view or download documents** unless explicitly granted. |
| **Document Owner** | `owner@trustvault.com` | `Owner@12345!` | Uploads confidential documents, organizes user tags, grants `Read`/`Edit` permissions to named individuals, revokes access immediately. |
| **Viewer (Alice)** | `alice@trustvault.com` | `Viewer@12345!` | Finance Department viewer. Pre-granted `READ` access to *Enterprise Master Services Agreement*. |
| **Viewer (Bob)** | `bob@trustvault.com` | `Viewer@12345!` | Engineering Department viewer. Zero access to private owner files. Used for adversarial testing. |

---

## 📡 API Endpoints & Access Control Matrix

As required by the challenge specification, every endpoint defines exact caller authorization:

| Method | Endpoint | Allowed Callers | Security Behavior & Invariants |
|---|---|---|---|
| `POST` | `/api/auth/register` | Anonymous | Registers a new user account with specified role. |
| `POST` | `/api/auth/login` | Anonymous | Verifies BCrypt password hash. Refused logins are recorded in audit trail. |
| `POST` | `/api/auth/refresh` | Anonymous | Rotates refresh token; checks database `IsRevoked` flag. |
| `POST` | `/api/auth/logout` | Authenticated | Revokes current session and marks refresh token revoked in DB. |
| `GET` | `/api/auth/me` | Authenticated | Returns current profile and role information. |
| `POST` | `/api/documents/upload` | `Owner`, `Admin` | Validates magic bytes, encrypts file with AES-256-GCM, stores GUID blob outside web root. |
| `GET` | `/api/documents` | Authenticated | Returns only documents owned by or explicitly granted to the caller. |
| `GET` | `/api/documents/search` | Authenticated | Filters accessible documents by name, category, owner, and date range. |
| `GET` | `/api/documents/{id}` | Granted Callers | Returns metadata if user is owner or has active grant. Otherwise returns `404 Not Found`. |
| `GET` | `/api/documents/{id}/download`| Granted Callers | Re-evaluates DB permissions dynamically. Decrypts in-memory and streams. Returns `404` if ungranted. |
| `PUT` | `/api/documents/{id}` | `Owner`, `Edit` Grant | Updates metadata or edits document. |
| `DELETE` | `/api/documents/{id}` | `Owner` only | Soft-deletes document. Logged to audit log. |
| `GET` | `/api/documents/{id}/permissions` | `Owner` only | Lists all named users with granted access to this document. |
| `POST` | `/api/documents/{id}/permissions/grant` | `Owner` only | Grants `Read` or `Edit` access to a named individual. |
| `POST` | `/api/documents/{id}/permissions/grant-by-tag` | `Owner` only | Expands tag/group into explicit per-user ACL grants. |
| `DELETE` | `/api/documents/{id}/permissions/revoke/{userId}` | `Owner` only | Immediately cuts off user's access on the very next HTTP request. |
| `GET` | `/api/admin/audit-logs` | `Admin` only | Returns system-wide audit logs with filters (Refused attempts, user, date). |
| `GET` | `/api/admin/audit-verify` | `Admin` only | Cryptographically verifies the SHA-256 hash chain of all audit entries. |
| `GET` | `/api/admin/metrics` | `Admin` only | Returns document counts, user counts, and refused unauthorized attempts. |
| `GET` | `/api/admin/users` | `Admin` only | Lists all users for management. |
| `GET` | `/api/tags` | `Owner` only | Lists owner-scoped user tags. |
| `POST` | `/api/tags` | `Owner` only | Tags a user (e.g. "Developer", "Finance") for bulk-selection convenience. |

---

## 🧪 Automated Testing & Adversarial Verification

Run the full test suite (covering STRIDE threats from `THREATS.md`):

```bash
cd backend
dotnet test
```

### Verified Test Cases:
- `THREAT01`: User B attempting to download User A's private document receives `404 Not Found`.
- `THREAT03`: Revoked access immediately stops file download on the very next request.
- `THREAT04`: Tampering with any historical audit log breaks cryptographic hash chain verification.
- `THREAT06`: System Administrator attempting to download private document receives `404 Not Found`.
- `THREAT07`: Executables masked as `.pdf` are detected via magic bytes inspection and rejected.
- `THREAT09`: Refused access attempts are logged into the tamper-evident audit trail with `Status = Refused`.
- `THREAT12`: AES-256-GCM ciphertext tampering throws `CryptographicException`.

---

## 🚀 Running Locally

### Option A: Via Docker Compose
```bash
docker-compose up --build
```
API will be live at `http://localhost:5000`.

### Option B: Via .NET CLI
```bash
cd backend/TrustVault.Api
dotnet run
```

