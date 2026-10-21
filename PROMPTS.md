# TrustVault — AI Interaction & Prompt Log (PROMPTS.md)

This log tracks interactions with AI coding assistants throughout the development of TrustVault. As required by the evaluation criteria, each entry records the prompt, the AI's output, critical evaluation of flaws (specifically focusing on authorization, access control, and audit integrity), and the engineering decisions taken to fix them.

---

### Entry 1: Architecture & Access Control Model Design
* **Date**: 2026-10-19
* **Topic**: Authorization, Tag/Group Based Permissions vs Named User Revocation
* **Prompt Summary**:
  > *"How should we handle bulk permissions where an owner wants to grant document access to a group or tag (like 'Developers' or 'Finance') rather than adding users one by one? What happens if Bob needs to have his access revoked without affecting other developers?"*

* **What the AI Initially Suggested**:
  > The AI initially proposed Attribute-Based Access Control (ABAC) or direct Group Permission binding, where a document has a permission record linking directly to a `GroupId` or `Tag` (e.g., `DocumentPermissions (DocumentId, TagName = 'Developer', Permission = 'READ')`). When checking access, the server would check if the user belongs to the tag.

* **What Was Wrong With It (Security & Challenge Flaws)**:
  1. **Violation of Explicit Requirement**: The challenge specification explicitly states: *"Permissions per document, at least read and edit, granted to named people."*
  2. **The Revocation Trap**: If permission is bound directly to the `TagName` or `GroupId`, an owner *cannot* revoke access from a single user (e.g., Bob) on a specific confidential document without removing Bob from the company-wide "Developer" tag!
  3. **Permission Leakage Warning**: The prompt warned: *"Someone is given access to a folder so they can see one file, and they can now see forty... A file meant for one client is visible to another."* Loose group/tag-based access control creates severe permission creep where users inherit access to files they shouldn't see.

* **What We Did Instead**:
  > We implemented the **"Expand-on-Grant with Granular Object-Level Revocation"** pattern:
  > 1. In the UI, owners can use tags/groups as a bulk-selection convenience tool to select multiple users in one click.
  > 2. In the database, the server resolves the tag into distinct, explicit `(DocumentId, UserId, PermissionLevel)` rows for each named user.
  > 3. The owner's UI displays the explicit list of granted individuals with a dedicated `[ Revoke ]` button beside each person.
  > 4. Revocation of Bob deletes only Bob's specific row for that document. Revocation takes effect instantaneously on the very next DB query, leaving other developers untouched and keeping the audit trail precise down to the exact individual.
* **Commit**: Initial architecture commit (`feat: initial security architecture, THREATS.md, and PROMPTS.md`)

---

### Entry 2: Authorization Failure Status Codes & Information Leakage
* **Date**: 2026-10-19
* **Topic**: Authorization, HTTP Status Codes, and Metadata/Existence Enumeration Oracles
* **Prompt Summary**:
  > *"How should our DocumentAuthorizationService and DocumentsController handle requests when a user attempts to access or download a document they are not authorized to view?"*

* **What the AI Initially Suggested**:
  > The AI suggested returning `404 Not Found` if `document == null`, and returning `403 Forbidden` if `document != null && !hasPermission`. It also suggested throwing an `UnauthorizedAccessException` handled by a global filter returning `{ error: "You do not have permission to view this document." }`.

* **What Was Wrong With It (Security & Challenge Flaws)**:
  1. **Existence Oracle / Metadata Enumeration Leak**: If the server returns `403 Forbidden` for existing private documents and `404 Not Found` for invalid IDs, an attacker can enumerate document GUIDs or sequential identifiers to map out confidential corporate documents (e.g., verifying that a salary review or pending merger agreement exists).
  2. **Violates Defense-in-Depth Principle**: A secure document repository must give zero information to an unauthorized probe. The presence of the document should remain invisible to anyone without an active permission grant.

* **What We Did Instead**:
  > 1. In `DocumentAuthorizationService.cs`, both non-existent documents and unauthorized access attempts return `IsAuthorized = false` and trigger a uniform `404 Not Found` response with a generic message `"Document not found."`.
  > 2. The server-side code differentiates internally: every unauthorized attempt immediately logs an immutable `AuditAction.AccessRefused` entry with `AuditStatus.Refused`, recording the caller's IP, User ID, attempted document ID, and timestamp into the cryptographically chained audit log.
  > 3. Verified by automated tests `THREAT01_UserB_CannotDownload_UserA_PrivateDocument_Returns404` and `THREAT09_FailedAccessAttempts_AreRecordedInAuditTrail`.
* **Commit**: `feat(api): implement Auth, Documents, Permissions, Admin controllers and adversarial access control tests`

---

### Entry 3: Cryptographic Audit Hash Chaining & Database Timestamp Precision
* **Date**: 2026-10-19
* **Topic**: Audit Trail Integrity, SHA-256 Chaining, and SQL Server Datetime2 Truncation
* **Prompt Summary**:
  > *"How should our AuditService construct and verify the SHA-256 hash chain ($H_i = \text{SHA256}(H_{i-1} \parallel \text{Payload}_i)$) across all audit records when persisting to SQL Server?"*

* **What the AI Initially Suggested**:
  > The AI suggested using `timestamp:O` (round-trip ISO-8601 format) in the payload string:
  > `return $"{previousHash}|{timestamp:O}|{userId}|{(int)action}|{status}...";`

* **What Was Wrong With It (Security & Challenge Flaws)**:
  1. **Sub-microsecond Truncation Discrepancy**: .NET CLR `DateTime.UtcNow` represents time down to 100-nanosecond ticks (7 decimal places). When persisted into SQL Server `datetime2` and read back, floating-point precision truncation or microsecond rounding altered the string representation by 1 character.
  2. **False Integrity Violations**: Because SHA-256 is an avalanche hash function, even a 1-character difference in fractional seconds produced a completely different hash upon re-verification, causing `VerifyChainIntegrityAsync()` to falsely report that Record #1 had been tampered with or deleted!

* **What We Did Instead**:
  > 1. Standardized the timestamp component in `BuildPayloadString` to Unix epoch milliseconds using `new DateTimeOffset(timestamp).ToUnixTimeMilliseconds()`.
  > 2. Because an integer millisecond timestamp is invariant across SQL Server storage, In-Memory testing, and serialization formats, the recomputed SHA-256 hash matches bit-for-bit upon database roundtrips.
  > 3. Verified across all records with `isChainIntact = true`.
* **Commit**: `feat(audit): stabilize timestamp precision in audit hash chain using Unix epoch milliseconds`

---

### Entry 4: Client-Side Route Guards vs Server-Side Revocation
* **Date**: 2026-10-20
* **Topic**: Frontend Authorization, Token Expiration vs Instant Administrative Deactivation
* **Prompt Summary**:
  > *"How should our Angular client enforce user role authorization on routes, and what should happen if an administrator deactivates an owner or viewer while they are actively navigating the app?"*

* **What the AI Initially Suggested**:
  > The AI suggested decoding the JWT payload in Angular route guards to inspect the `role` claim (`jwt_decode(token).role`), and caching the permissions in `localStorage`. For deactivation, it suggested relying on the JWT expiration (`exp` claim after 60 minutes).

* **What Was Wrong With It (Security & Challenge Flaws)**:
  1. **Violation of Challenge Invariant #3**: The specification requires: *"Taking access away works immediately. Whatever you have issued to that person before that moment stops working."* If deactivation relies on token expiry, a revoked employee retains full access for up to 60 minutes!
  2. **Client-Side Role Spoofing**: Decoding untrusted JWT strings on the client without cryptographic verification allows an adversary to tamper with `localStorage` and view UI elements.
  3. **Stale Permission State**: Caching document permissions on the client hides the reality of server-side revocation.

* **What We Did Instead**:
  > 1. In `role.guard.ts`, route activation checks an in-memory Angular `AuthService` state signal synchronized via `sessionStorage` (cleared on tab close).
  > 2. On every single API request, the server executes `DocumentAuthorizationFilter` and user status checks directly against the database `IsActive` flag.
  > 3. An HTTP Interceptor (`auth.interceptor.ts`) intercepts `401 Unauthorized` responses and immediately calls `AuthService.logout()`, invalidating the session, wiping `sessionStorage`, and redirecting to `/login`.
  > 4. If an administrator deactivates an account, their very next API call (or download attempt) fails immediately, and the client UI locks out on the spot.
* **Commit**: `9fc6eef feat(security): complete 19-point verification checklist with automated tests for cross-owner isolation and instant deactivation rejection`

---

### Entry 5: The Discrete Permission Inheritance Trap (Edit vs Download)
* **Date**: 2026-10-21
* **Topic**: Granular Access Control, Discrete Permissions vs Hierarchical Implication
* **Prompt Summary**:
  > *"When defining DocumentGrant permissions (Read, Download, Edit), should 'Edit' permission automatically imply 'Download' permission so that an editor can always fetch the raw binary?"*

* **What the AI Initially Suggested**:
  > The AI strongly argued for a hierarchical model: `None < Read < Download < Edit < Delete`, where having `Edit` automatically grants `Download` and `Read` via bitwise flags or numeric comparison (`permission >= PermissionType.Download`).

* **What Was Wrong With It (Security & Challenge Flaws)**:
  1. **Violates Principle of Least Privilege**: In regulated industries (e.g., medical records, intellectual property, contract metadata review), an external editor or reviewer may be permitted to update metadata, change categories, or replace approval notes *without* having permission to extract the underlying proprietary binary file.
  2. **Hidden Exfiltration Channel**: Conflating `Edit` with `Download` allows an unauthorized actor granted metadata editing rights to siphon confidential binaries.
  3. **Requirement Clarity**: The challenge rubric highlights: *"Permissions per document, at least read and edit, granted to named people... The permission model... We will spend much of the interview here."*

* **What We Did Instead**:
  > 1. Made each capability completely discrete: `READ`, `DOWNLOAD`, `EDIT` are evaluated independently on the server.
  > 2. `DocumentsController.Download` requires an explicit `DOWNLOAD` grant or ownership. Having only `EDIT` does NOT allow binary streaming.
  > 3. The frontend displays discrete checkboxes for each capability during the grant workflow, allowing owners to fine-tune access with surgical precision.
  > 4. Verified via automated test `AccessControlTests.EditPermission_DoesNotGrant_DownloadAccess`.
* **Commit**: `0b3bff7 feat(backend): complete versioned v1 REST API, discrete permissions (READ, DOWNLOAD, EDIT), owner-scoped audit logs, Swagger OpenAPI, and docs`

---

## 4. Reused Prompts & Engineering Directives Across the Project

The following standardized prompt context directives were used repeatedly across development sessions to guide AI tools:

```markdown
Rule 1 (The Server Invariant): The server decides authorization on EVERY request. Never trust UI checks, hidden buttons, or client-decoded JWT claims.
Rule 2 (No Document Existence Leaks): Return 404 Not Found uniformly for unauthorized and non-existent documents. Refused attempts must be logged to the audit chain.
Rule 3 (Instant Revocation): Revocations must be instant on the subsequent database query. Do not cache permission grants or user active flags across requests.
Rule 4 (Tamper-Evident Chain): Every audit log entry must link to the prior hash with SHA-256. Use Unix millisecond epoch to avoid SQL Server datetime rounding errors.
Rule 5 (Least Privilege): Administrator cannot read or download user files. Discrete permissions (Edit != Download).
```

