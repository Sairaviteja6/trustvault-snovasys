# TrustVault — Revised Architecture & Execution Plan

Based on the official specification and review of the project flow, here is the exact architectural alignment:

---

## 1. 👥 Strict Role & Data Isolation

| Persona | Allowed Endpoints | Dashboard Route | Document Content Access | Audit Log Visibility | User Provisioning |
|---|---|---|---|---|---|
| **Administrator** | `/api/v1/admin/*`, `/api/v1/auth/*` | `/admin` | ❌ **DENIED** (Cannot read or download files) | ✅ **Full System-Wide** (Metadata, refused attempts, chain verification) | Can provision & deactivate **Owners** |
| **Document Owner** | `/api/v1/owner/*`, `/api/v1/documents/*`, `/api/v1/grants/*`, `/api/v1/tags/*` | `/owner` | ✅ **Own Documents** | ✅ **Own Documents Only** (Who accessed their files) | Can provision **Viewers** & assign Tags |
| **Viewer** | `/api/v1/viewer/*`, `/api/v1/documents/{id}/read`, `/api/v1/documents/{id}/download` | `/viewer` | ✅ **Only Explicitly Granted Files** | ❌ **DENIED** (Zero access to audit logs) | ❌ None |

---

## 2. 🔐 Discrete Permission Model (`DocumentGrants`)

Instead of coarse levels, permissions are discrete:
- `READ`: View metadata and document text preview
- `DOWNLOAD`: Stream decrypted binary file
- `EDIT`: Update title, category, or replace file contents

> **Crucial Rule**: `EDIT` does **not** imply `DOWNLOAD`. Each capability is verified independently on the server.

---

## 3. 🛡️ Scoped Audit Trail Architecture

- **`GET /api/v1/admin/audit-logs`**: Accessible **only by Administrator**. Shows all system events, failed logins, and refused IDOR probes.
- **`GET /api/v1/owner/audit-logs`**: Accessible **only by Document Owner**. Filtered strictly where `Document.OwnerId == CurrentUser.Id`.
- **Viewers**: Have zero audit endpoints. Any attempt returns `403 Forbidden`.

---

## 4. 💻 Angular Frontend Architecture (`frontend/`)

No quick single-page switches or popups. A real enterprise SPA:

```
frontend/src/app/
├── core/
│   ├── guards/
│   │   ├── auth.guard.ts         # Checks if authenticated
│   │   └── role.guard.ts         # Checks if user role matches route
│   ├── interceptors/
│   │   └── auth.interceptor.ts   # Attaches Bearer JWT & handles 401/404
│   └── services/
│       ├── auth.service.ts       # Login, profile, logout, role signal
│       ├── document.service.ts   # Document operations
│       └── audit.service.ts      # Scoped audit logs & chain verification
├── features/
│   ├── auth/
│   │   └── login/                # Email + Password only. No role dropdown!
│   ├── admin/
│   │   ├── admin-dashboard/      # Metrics, Owner management, System audit explorer
│   │   └── audit-explorer/       # Tamper-evident hash chain verification
│   ├── owner/
│   │   ├── owner-dashboard/      # Document table, Upload modal, Tag manager
│   │   ├── grant-modal/          # Named viewer sharing + Tag bulk-selection
│   │   └── owner-audit/          # Activity on owner's documents
│   └── viewer/
│       └── viewer-dashboard/     # Shared docs, permitted actions (Read/Download)
```

---

## 5. 🚀 Execution Steps

1. **Step 1**: Refactor backend models to discrete `DocumentGrants` (`READ`, `DOWNLOAD`, `EDIT`) and version routes under `/api/v1/`.
2. **Step 2**: Add `/api/v1/owner/audit-logs` (strictly scoped to owner's docs) and `/api/v1/admin/users/owners` (admin creates owners).
3. **Step 3**: Scaffold the Angular application with route guards and separate dashboard views for Admin, Owner, and Viewer.
4. **Step 4**: Verify all 22 security requirements via automated xUnit integration tests.
