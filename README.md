# TrustVault 🔐

> **Secure Document Sharing with a Cryptographically Verifiable Audit Trail**

TrustVault is an enterprise document platform built with a **security-first invariant**: the wrong person can never read a document, and every access attempt (allowed or refused) is permanently, tamper-evidently recorded.

Built with **ASP.NET Core (.NET 8)**, **SQL Server**, and **Angular**.

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

## 🚀 Quickstart & Setup

### Prerequisites
- .NET 8 SDK
- SQL Server (LocalDB or MSSQL Server)
- Node.js (v18+)

*(Detailed setup scripts and seed credentials will be documented as backend scaffolding completes.)*
