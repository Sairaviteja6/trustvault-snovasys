# TrustVault — AI Interaction & Prompt Log (PROMPTS.md)

This log tracks interactions with AI tools throughout the development of TrustVault. As required by the evaluation criteria, each entry records the prompt, the AI's output, critical evaluation of flaws (specifically focusing on authorization, access control, and audit integrity), and the engineering decisions taken to fix them.

### 🛠️ AI Tools Utilized:
- **ChatGPT**: Used initially for breaking down and deeply analyzing the hiring challenge problem statement, threat scenarios, and zero-trust edge cases.
- **Google Antigravity (Gemini 2.5 Flash / Pro)**: Primary engineering pair programmer for full-stack architecture, ASP.NET Core backend implementation, Angular 19 reactive components, cryptographic audit chain engineering, and AWS cloud debugging.
- **GitHub Copilot**: Inline code completion, repetitive DTO/Entity mappings, and adversarial unit test scaffolding.
- **Canva AI**: Conceptualization of UI typography, color harmonies (espresso glass `#552612` and gold accents `#b07f02`), and executive layout structure.
- **Wixel & Stitch**: Generation of brand graphics, monogram assets, and visual architectural flowcharts.

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

### Entry 4: Frontend Zero-Trust Architecture & In-Memory Decryption
* **Date**: 2026-10-21
* **Topic**: Zero-Trust File Delivery, DOM Leakage Prevention, and DRM In-Memory Inspection
* **Prompt Summary**:
  > *"How should the Angular frontend display confidential documents without exposing unencrypted URLs or allowing casual browser downloads?"*

* **What the AI Initially Suggested**:
  > The AI suggested generating temporary blob URLs (`URL.createObjectURL(blob)`) and setting them as the `src` attribute on `<iframe>` or `<embed>` tags, or opening a temporary browser tab.

* **What Was Wrong With It (Security & Challenge Flaws)**:
  1. **Blob URL Exfiltration**: `blob:` URLs remain accessible in the browser's memory and can be copied or opened in another tab with full browser download capabilities.
  2. **Browser Print/Download Controls**: Standard `<embed>` and `<iframe>` PDF plugins render browser-native download, print, and save buttons that completely bypass application-level DRM controls.
  3. **Violation of Read != Download Principle**: An authorized user with only `Read` permission could simply right-click and save the raw decrypted document.

* **What We Did Instead**:
  > 1. In `viewer-dashboard.component.ts`, documents decrypted in-memory are rendered directly via canvas and controlled protected viewports.
  > 2. Applied global CSS DRM protections: disabling context menu, `user-select: none`, pointer-event shielding, and watermark overlay with the viewer's identity and timestamp.
  > 3. Enforced discrete server permissions where `Read` permission returns document bytes strictly for protected viewport rendering, while binary download endpoints enforce `Download` permission separately and return `404` for read-only sessions.
* **Commit**: `feat(viewer): implement protected in-memory document inspection with dynamic watermarking`

---

### Entry 5: Evaluator & Hiring Team Frictionless Quick-Access
* **Date**: 2026-10-22
* **Topic**: Demonstration Usability vs Security Separation in Evaluation Environments
* **Prompt Summary**:
  > *"How can technical recruiters and hiring managers instantly inspect all three role dashboards (System Admin, Document Owner, Authorized Viewer) without tedious credential setup while maintaining real role boundaries?"*

* **What the AI Initially Suggested**:
  > The AI suggested bypassing authentication in development mode or allowing a dropdown in the navbar that switches the role on the client side without backend re-authentication.

* **What Was Wrong With It (Security & Challenge Flaws)**:
  1. **Compromises Zero-Trust Invariant**: Switching roles purely in the client without server-issued JWTs breaks the core guarantee that the backend strictly verifies cryptographic claims.
  2. **False Evaluation Experience**: Bypassing real auth hides the actual RBAC enforcement, making it impossible to evaluate real token expiration, refresh rotation, and permission checks.

* **What We Did Instead**:
  > 1. Created an authenticated **Evaluation Quick Access Bar** directly on the sign-in screen (`login.component.ts`).
  > 2. Clicking any persona (👑 Owner, 🛡️ Admin, 👁️ Viewer) initiates a real, full authentication handshake against `/api/v1/auth/login` using seeded production-grade credentials.
  > 3. The backend issues valid cryptographically signed JWT tokens, populates actual role claims, and enforces exact server-side permissions for that role.
  > 4. Evaluators experience authentic institutional security enforcement in one click with zero manual friction.
* **Commit**: `feat(auth): add evaluation quick-access bar with authentic token handshakes`

---

### Entry 6: High-Fidelity Enterprise Visual Architecture & Authentic Workflow Flowchart
* **Date**: 2026-10-23
* **Topic**: Corporate Visual Polish, Color Harmony, Interactive Parallax, and Project Lifecycle Visualization
* **Prompt Summary**:
  > *"How can we elevate the TrustVault experience to feel like a high-end enterprise platform with sleek dark styling (#212529, #1F73B7, #18937A), interactive cursor lighting, and a clear visualization of how the platform works?"*

* **What the AI Initially Suggested**:
  > The AI suggested a flashy multi-colored animated tree diagram with large cursor spotlights and rapid particle effects.

* **What Was Wrong With It (Security & Challenge Flaws)**:
  1. **Visual Noise & Distortion**: Oversized cursor lighting (650px) and dramatic parallax created motion sickness and washed out high-contrast text and audit badges.
  2. **Irrelevant Representation**: An artificial tree diagram failed to communicate TrustVault's real 4-step security lifecycle (Inquiry -> Governance -> Upload -> Protected Inspection).

* **What We Did Instead**:
  > 1. Refined mouse spotlight to a compact 250px radius using TrustVault brand colors (Steel Blue `#1F73B7` and Teal `#18937A`) with gentle parallax damping factor (0.006).
  > 2. Built an authentic **4-Step Architectural Flowchart** detailing the real TrustVault lifecycle:
  >    - **Step 01**: Inquiry & Invitation (Enterprise Client)
  >    - **Step 02**: Institutional Governance & SHA-256 Ledger (System Admin)
  >    - **Step 03**: AES-256 Upload & DRM Policies (Document Owner)
  >    - **Step 04**: Protected In-Memory Viewing & Revocation (Authorized Viewer)
  > 3. Verified across all screen sizes and confirmed 0 build warnings.
* **Commit**: `feat(ui): refine dark enterprise styling, authentic 4-step workflow, and button micro-interactions`

---

### Entry 7: Foreign Key Cascades & Audit Referential Integrity on User Deprovisioning
* **Date**: 2026-10-24
* **Topic**: Database Constraints, Relational Integrity vs Audit Non-Repudiation
* **Prompt Summary**:
  > *"How should our AdminController handle the deletion or deprovisioning of a compromised or departing user account when that user is referenced across DocumentGrants, ClientInquiries, UserTags, and AuditLogs?"*

* **What the AI Initially Suggested**:
  > The AI suggested a simple `_context.Users.Remove(user)` with `ON DELETE CASCADE` enabled globally on all relational tables, including the `AuditLogs` table.

* **What Was Wrong With It (Security & Challenge Flaws)**:
  1. **Audit Trail Destruction (Critical Security Flaw)**: Cascading deletes to the `AuditLogs` table would silently erase all forensic history and previous actions taken by the departed user, violating the non-repudiation guarantee!
  2. **SQL Server Foreign Key Collisions**: SQL Server forbids multiple cascade paths (`cycles or multiple cascade paths` error). Directly deleting the user failed with an unhandled 500 SqlException due to foreign key constraints on `ClientInquiries` and `DocumentPermissions`.

* **What We Did Instead**:
  > 1. In `AdminController.cs`, engineered an explicit safe deprovisioning sequence:
  >    - First, unlinked non-destructive associations (cleared `ConvertedByAdminId` in `ClientInquiries`).
  >    - Second, purged active `DocumentPermissions` (cutting off all granted access immediately).
  >    - Third, unlinked or soft-flagged owned documents.
  >    - Fourth, preserved all historical records in `AuditLogs` by leaving the cryptographic hash chain intact and nullifying the user foreign key reference (`UserId = null`) without altering the immutable payload string or SHA-256 hash.
  > 2. Verified via live testing script `scripts/TestDeleteUser.ps1` against live production database with zero constraint errors.
* **Commit**: `fix(admin): implement safe user deletion with inquiry and audit fk unlinking`

---

### Entry 8: Edge Proxying, Mixed Content Elimination, and Root State Routing
* **Date**: 2026-10-24
* **Topic**: HTTPS Edge Delivery, Mixed-Content Protocol Security, and Angular SPA Routing
* **Prompt Summary**:
  > *"How do we deliver a public HTTPS green-padlock production URL when AWS CloudFront distribution creation requires support ticket verification on new accounts, and ensure the root domain always lands on the TrustVault product overview?"*

* **What the AI Initially Suggested**:
  > The AI suggested configuring Angular to query the HTTP ALB URL directly (`http://trustvault-alb.../api`) from an HTTPS frontend, or using client-side redirects from `/` to `/login` based on stored session tokens.

* **What Was Wrong With It (Security & Challenge Flaws)**:
  1. **Browser Mixed-Content Blocking**: Browsers strictly block unencrypted `http://` API requests initiated from an `https://` origin, failing all logins and file downloads.
  2. **Violated Evaluator Flow**: Forcing an automatic redirect to `/login` on the root route broke the public landing page experience, preventing recruiters from viewing the platform architecture and security documentation.

* **What We Did Instead**:
  > 1. Created Vercel edge reverse-proxy configuration (`vercel.json`) that proxies `/api/*` server-to-server to the AWS ALB backend over dedicated edge nodes. The client browser communicates 100% over HTTPS with zero mixed-content warnings.
  > 2. Fixed `LandingComponent` to ensure the root route (`/`) permanently renders the product landing page and enterprise architecture overview without premature redirects.
  > 3. Verified across private/incognito browser sessions: landing page, login modal, and admin dashboards execute seamlessly with 100% SSL encryption.
* **Commit**: `feat(deploy): full production deployment on Vercel with edge API proxy and landing root routing`

