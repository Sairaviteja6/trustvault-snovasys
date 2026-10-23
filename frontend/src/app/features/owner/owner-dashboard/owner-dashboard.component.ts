import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService } from '../../../core/services/document.service';
import { PermissionService } from '../../../core/services/permission.service';
import { AuditService } from '../../../core/services/audit.service';
import { UserService } from '../../../core/services/user.service';
import { 
  AuditLogDto, 
  DocumentContentResponse,
  DocumentResponse, 
  DocumentSnapshotDto,
  OwnerMetricsResponse, 
  PermissionResponse, 
  PermissionType, 
  UserDto, 
  UserTagDto 
} from '../../../core/models/api.models';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="section-header">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
            <span class="badge badge-info" style="font-size: 0.7rem; font-weight: 600;">
              Enterprise Tenant &rsaquo; prod-vault-owner-us1
            </span>
            <span class="badge badge-success" style="font-size: 0.7rem; font-weight: 600;">
              <span class="live-dot" style="width: 5px; height: 5px;"></span> KMS Hardware Enclave: Active
            </span>
            <span class="badge badge-info" style="font-size: 0.7rem; font-weight: 600;">
              Verified Mainnet
            </span>
          </div>
          <h1 class="section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#18937A" stroke-width="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Document Workspace
          </h1>
          <p class="section-subtitle">
            Manage zero-knowledge confidential files, discrete caller grants, deterministic snapshots, and inspect immutable access audit trails.
          </p>
        </div>
        <div class="action-buttons">
          <button class="btn btn-secondary btn-sm" (click)="loadAll()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span>Refresh</span>
          </button>
          <button class="btn btn-secondary btn-sm" (click)="showNewViewerModal.set(true)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            <span>Provision Viewer</span>
          </button>
          <button class="btn btn-primary btn-sm" (click)="showUploadModal.set(true)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Upload Document</span>
            <span class="badge badge-success" style="font-size: 0.65rem; padding: 1px 5px; background: rgba(255,255,255,0.2); color: #fff; border: none;">E2EE</span>
          </button>
        </div>
      </div>

      <!-- Reference Stat Metric Cards (4 Columns) -->
      <div class="stat-card-grid" *ngIf="displayedMetrics as m">
        <!-- Card 1: Owned Documents -->
        <div class="stat-box">
          <div class="stat-box-top">
            <span class="stat-box-title">Owned Documents</span>
            <div class="stat-box-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="9"/>
                <line x1="9" y1="13" x2="15" y2="13"/>
                <line x1="9" y1="17" x2="13" y2="17"/>
              </svg>
            </div>
          </div>
          <div class="stat-box-metric">
            {{ m.totalOwnedDocs }} <span class="stat-box-subval">/ 250 GB limit</span>
          </div>
          <div class="stat-box-desc">Stored securely &bull; AES-256 GCM encrypted</div>
          <div class="stat-box-footer">
            <span class="stat-box-link" (click)="showUploadModal.set(true)">+ Add First File &rsaquo;</span>
            <span class="stat-box-pill">{{ m.totalOwnedDocs > 0 ? 'Vault Active' : 'Vault Idle' }}</span>
          </div>
        </div>

        <!-- Card 2: Active Caller Grants -->
        <div class="stat-box">
          <div class="stat-box-top">
            <span class="stat-box-title">Active Caller Grants</span>
            <div class="stat-box-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 2l-2 2m-1-1l-2 2m-2-2l-2 2m-2-2l-2 2M3 21l9-9m0 0a5 5 0 1 0-7-7 5 5 0 0 0 7 7z"/>
              </svg>
            </div>
          </div>
          <div class="stat-box-metric">
            {{ m.activeGrantsCount }} <span class="stat-box-subval">ephemeral tokens</span>
          </div>
          <div class="stat-box-desc">Dynamic session-bound caller keys</div>
          <div class="stat-box-footer">
            <span class="stat-box-link" (click)="activeTab.set('tags')">Manage Grants &rsaquo;</span>
            <span class="stat-box-pill pill-success">{{ m.activeGrantsCount }} TTL active</span>
          </div>
        </div>

        <!-- Card 3: Provisioned Viewers -->
        <div class="stat-box">
          <div class="stat-box-top">
            <span class="stat-box-title">Provisioned Viewers</span>
            <div class="stat-box-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
          </div>
          <div class="stat-box-metric">
            {{ m.totalViewers }} <span class="stat-box-subval">assigned seats</span>
          </div>
          <div class="stat-box-desc">Hardware token &amp; IAM enrolled accounts</div>
          <div class="stat-box-footer">
            <span class="stat-box-link" (click)="showNewViewerModal.set(true)">+ Invite Viewer &rsaquo;</span>
            <span class="stat-box-pill">{{ viewers().length > 0 ? (viewers().length + ' enrolled') : 'Empty directory' }}</span>
          </div>
        </div>

        <!-- Card 4: Security Audit Tags -->
        <div class="stat-box">
          <div class="stat-box-top">
            <span class="stat-box-title">Security Audit Tags</span>
            <div class="stat-box-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </div>
          </div>
          <div class="stat-box-metric">
            {{ m.totalTags }} <span class="stat-box-subval">active rules</span>
          </div>
          <div class="stat-box-desc">Bulk classification &amp; sensitivity groups</div>
          <div class="stat-box-footer">
            <span class="stat-box-link" (click)="activeTab.set('tags')">Configure Tags &rsaquo;</span>
            <span class="stat-box-pill pill-success">Standard DLP</span>
          </div>
        </div>
      </div>

      <!-- Segmented Navigation Pills Bar (Matching Reference Image) -->
      <div class="segmented-nav-wrapper">
        <div class="segmented-nav">
          <button class="segmented-tab" [class.active]="activeTab() === 'documents'" (click)="activeTab.set('documents')">
            <span>Documents {{ documents().length }}</span>
          </button>
          <button class="segmented-tab" [class.active]="activeTab() === 'viewers'" (click)="activeTab.set('viewers')">
            <span>Viewers {{ viewers().length }}</span>
          </button>
          <button class="segmented-tab" [class.active]="activeTab() === 'tags'" (click)="activeTab.set('tags')">
            <span>Tags &amp; Groups</span>
          </button>
          <button class="segmented-tab" [class.active]="activeTab() === 'audit'" (click)="activeTab.set('audit')">
            <span class="live-dot" *ngIf="activeTab() === 'audit'"></span>
            <span>Audit Activity</span>
          </button>
        </div>

        <div class="ledger-stream-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#18937A" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Ledger stream: SHA256 Chained Hash</span>
        </div>
      </div>

      <!-- TAB 1: Documents Catalog (Contained in dedicated Content Box Card) -->
      <div *ngIf="activeTab() === 'documents'" class="content-box-card">
        <div class="section-header">
          <div class="search-bar">
            <input 
              type="text" 
              class="form-input" 
              style="width: 280px;" 
              placeholder="Search documents..." 
              [(ngModel)]="searchQuery" 
              (keyup.enter)="onSearch()"
            />
            <input 
              type="text" 
              class="form-input" 
              style="width: 160px;" 
              placeholder="Category..." 
              [(ngModel)]="categoryFilter" 
              (keyup.enter)="onSearch()"
            />
            <button class="btn btn-secondary btn-sm" (click)="onSearch()">Search</button>
            <button class="btn btn-secondary btn-sm" (click)="resetSearch()">Reset</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Title &amp; Category</th>
                <th>File Metadata</th>
                <th>Upload Date</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let doc of documents()">
                <td>
                  <div style="font-weight: 700; color: #0f172a;">{{ doc.title }}</div>
                  <div style="font-size: 0.775rem; color: var(--text-secondary);">{{ doc.description || 'No description' }}</div>
                  <span class="badge badge-info" style="margin-top: 4px;">{{ doc.category }}</span>
                </td>
                <td>
                  <div class="font-mono" style="font-size: 0.8rem;">{{ doc.originalFileName }}</div>
                  <div style="font-size: 0.725rem; color: var(--text-muted);">{{ (doc.fileSizeBytes / 1024).toFixed(1) }} KB &bull; {{ doc.contentType }}</div>
                </td>
                <td>{{ doc.createdAt | date:'short' }}</td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 0.35rem; flex-wrap: wrap; justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm" (click)="onViewDocument(doc)" title="Open in secure inspection panel">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      View
                    </button>
                    <button class="btn btn-secondary btn-sm" (click)="openSnapshotsModal(doc)" title="View snapshot history and revert changes">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 14 14"/>
                      </svg>
                      Snapshots
                    </button>
                    <button class="btn btn-secondary btn-sm" (click)="openGrantModal(doc)" title="Manage discrete grants">
                      Grants
                    </button>
                    <button class="btn btn-primary btn-sm" (click)="onDownload(doc.id, doc.originalFileName)">
                      Download
                    </button>
                    <button class="btn btn-danger btn-sm" (click)="onDeleteDocument(doc.id)">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="documents().length === 0">
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                  No documents found. Upload your first document above.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: Viewers Management -->
      <div *ngIf="activeTab() === 'viewers'" class="content-box-card">
        <div class="section-header">
          <div>
            <h2 class="card-title">Authorized Viewers</h2>
            <p class="section-subtitle">Manage viewers eligible for receiving document access grants.</p>
          </div>
          <button class="btn btn-primary btn-sm" (click)="showNewViewerModal.set(true)">
            Provision Viewer
          </button>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Department</th>
                <th>Created</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let v of viewers()">
                <td style="font-weight: 600;">{{ v.username }}</td>
                <td class="font-mono">{{ v.email }}</td>
                <td>{{ v.department || '—' }}</td>
                <td>{{ v.createdAt | date:'shortDate' }}</td>
                <td style="text-align: right;">
                  <button class="btn btn-danger btn-sm" (click)="onDeleteViewer(v)">
                    Delete Viewer
                  </button>
                </td>
              </tr>
              <tr *ngIf="viewers().length === 0">
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                  No viewers provisioned yet. Click "Provision Viewer" to add one.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: User Tags -->
      <div *ngIf="activeTab() === 'tags'" class="content-box-card">
        <div class="section-header">
          <div>
            <h2 class="card-title">User Tags for Bulk Permissions</h2>
            <p class="section-subtitle">Group viewers into tags like "Finance" or "Engineering" to bulk-grant discrete access.</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <select class="form-select" style="width: 200px;" [(ngModel)]="newTagUserId">
              <option value="">Select Viewer...</option>
              <option *ngFor="let v of viewers()" [value]="v.id">{{ v.username }} ({{ v.email }})</option>
            </select>
            <input type="text" class="form-input" style="width: 160px;" placeholder="Tag name..." [(ngModel)]="newTagName" />
            <button class="btn btn-primary btn-sm" (click)="onAssignTag()">Assign Tag</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Tag Name</th>
                <th>Tagged Viewer</th>
                <th>Email</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of tags()">
                <td><span class="badge badge-warning">{{ t.tagName }}</span></td>
                <td style="font-weight: 600;">{{ t.username }}</td>
                <td class="font-mono">{{ t.email }}</td>
                <td style="text-align: right;">
                  <button class="btn btn-danger btn-sm" (click)="onDeleteTag(t.id)">Remove Tag</button>
                </td>
              </tr>
              <tr *ngIf="tags().length === 0">
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                  No tags created yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 4: Owner Audit Trail (Matching Reference Image) -->
      <div *ngIf="activeTab() === 'audit'" class="content-box-card">
        <div class="section-header" style="flex-direction: column; align-items: flex-start; gap: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <h2 class="card-title" style="margin-bottom: 0;">Document Access Activity</h2>
                <span class="badge badge-success" style="font-size: 0.65rem;">
                  <span class="live-dot" style="width: 5px; height: 5px;"></span> LIVE
                </span>
                <span class="badge badge-info">{{ ownerTimePresetLabel() }}</span>
              </div>
              <p class="section-subtitle" style="margin-bottom: 0;">
                Real-time cryptographic log of reads, edits, downloads, and grants on documents you own.
              </p>
            </div>

            <!-- Download Statement / Export Button -->
            <button 
              class="btn btn-sm btn-primary" 
              (click)="onExportOwnerAuditStatement()"
              title="Download verified document access statement as CSV"
              style="display: flex; align-items: center; gap: 0.4rem;"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Download Statement (CSV)</span>
            </button>
          </div>

          <!-- Time Presets Bar & Search -->
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 0.75rem;">
            <div class="time-presets-bar">
              <button class="preset-chip" [class.active]="ownerTimePreset() === 'today'" (click)="setOwnerTimePreset('today')">
                Today (Live)
              </button>
              <button class="preset-chip" [class.active]="ownerTimePreset() === 'yesterday'" (click)="setOwnerTimePreset('yesterday')">
                Yesterday
              </button>
              <button class="preset-chip" [class.active]="ownerTimePreset() === '7days'" (click)="setOwnerTimePreset('7days')">
                Last 7 Days
              </button>
              <button class="preset-chip" [class.active]="ownerTimePreset() === '30days'" (click)="setOwnerTimePreset('30days')">
                Last 30 Days
              </button>
              <button class="preset-chip" [class.active]="ownerTimePreset() === 'custom'" (click)="setOwnerTimePreset('custom')">
                Custom Range
              </button>
              <button class="preset-chip" [class.active]="ownerTimePreset() === 'all'" (click)="setOwnerTimePreset('all')">
                All Records
              </button>
            </div>

            <input 
              type="text" 
              class="form-input" 
              style="width: 240px;" 
              placeholder="Search audit events..." 
              [(ngModel)]="auditSearchQuery" 
              (keyup.enter)="loadOwnerAudit()"
            />
          </div>

          <!-- Custom Date Range Inputs -->
          <div *ngIf="ownerTimePreset() === 'custom'" class="custom-range-row">
            <span style="font-size: 0.8rem; font-weight: 600; color: #475569;">Select Time Interval:</span>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label style="font-size: 0.75rem; color: #64748b;">From:</label>
              <input type="date" class="form-input" style="width: 150px; padding: 0.3rem 0.5rem;" [(ngModel)]="ownerFromDate" (change)="loadOwnerAudit()" />
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label style="font-size: 0.75rem; color: #64748b;">To:</label>
              <input type="date" class="form-input" style="width: 150px; padding: 0.3rem 0.5rem;" [(ngModel)]="ownerToDate" (change)="loadOwnerAudit()" />
            </div>
            <button class="btn btn-sm btn-primary" (click)="loadOwnerAudit()">Apply Range</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Caller</th>
                <th>Action</th>
                <th>Status</th>
                <th>Document</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of ownerAuditLogs()">
                <td class="font-mono">#{{ log.id }}</td>
                <td>{{ log.timestamp | date:'short' }}</td>
                <td>
                  <div style="font-weight: 600;">{{ log.userEmail || 'Anonymous' }}</div>
                  <div style="font-size: 0.725rem; color: var(--text-muted);">{{ log.ipAddress }}</div>
                </td>
                <td><span class="badge badge-info">{{ log.action }}</span></td>
                <td>
                  <span class="badge" [ngClass]="log.status === 'Allowed' ? 'badge-success' : 'badge-danger'">
                    {{ log.status }}
                  </span>
                </td>
                <td style="font-weight: 600;">{{ log.documentTitle }}</td>
                <td style="font-size: 0.8rem; color: var(--text-secondary);">{{ log.details }}</td>
              </tr>
              <tr *ngIf="ownerAuditLogs().length === 0">
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                  No audit logs recorded for your documents yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal: Secure View Panel (Read Protection) -->
    <div class="modal-overlay" *ngIf="viewingDocContent()">
      <div class="modal-card" style="max-width: 800px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Secure Document Viewer</h3>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              {{ viewingDocContent()?.title }} &bull; Version {{ viewingDocContent()?.currentVersion }}
            </div>
          </div>
          <button class="modal-close" (click)="viewingDocContent.set(null)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="protected-viewer-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>CONFIDENTIAL SESSION — COPY &amp; CLIPBOARD RESTRICTED</span>
          </div>

          <!-- View mode switcher for documents with both Visual PDF and Extracted Text -->
          <div *ngIf="isPdf(viewingDocContent()) && viewingDocContent()?.textContent" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
            <button 
              type="button" 
              class="btn btn-sm" 
              [ngClass]="ownerViewerMode() === 'pdf' ? 'btn-primary' : 'btn-secondary'"
              (click)="ownerViewerMode.set('pdf')"
            >
              📄 Visual PDF Document
            </button>
            <button 
              type="button" 
              class="btn btn-sm" 
              [ngClass]="ownerViewerMode() === 'text' ? 'btn-primary' : 'btn-secondary'"
              (click)="ownerViewerMode.set('text')"
            >
              📝 Extracted Plain Text
            </button>
          </div>

          <div 
            class="document-content-area"
            (contextmenu)="$event.preventDefault()"
            (copy)="$event.preventDefault()"
          >
            <!-- Case 1: PDF Document rendered directly in browser via iframe (Default for PDF) -->
            <div *ngIf="isPdf(viewingDocContent()) && ownerViewerMode() === 'pdf' && viewingDocContent()?.base64Data" style="width: 100%; height: 600px;">
              <iframe 
                [src]="getSafePdfUrl(viewingDocContent()!)" 
                style="width: 100%; height: 100%; border: none; border-radius: 6px; background: #ffffff;"
                title="Secure PDF Viewer"
              ></iframe>
            </div>

            <!-- Case 2: Plain text / Code / Markdown / JSON / CSV / XML / PDF Extracted Text -->
            <div *ngIf="viewingDocContent()?.textContent && (!isPdf(viewingDocContent()) || ownerViewerMode() === 'text')">
              <pre class="secure-text-view">{{ viewingDocContent()?.textContent }}</pre>
            </div>


            <!-- Case 3: Image rendered directly in browser -->
            <div *ngIf="isImage(viewingDocContent()) && viewingDocContent()?.base64Data" style="text-align: center; padding: 1rem;">
              <img 
                [src]="getSafeImageUrl(viewingDocContent()!)" 
                style="max-width: 100%; max-height: 540px; object-fit: contain; border-radius: 6px; pointer-events: none; border: 1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.4);" 
                alt="Secure Document Preview"
              />
            </div>

            <!-- Case 4: Other binary (fallback info only) -->
            <div *ngIf="!viewingDocContent()?.textContent && !isPdf(viewingDocContent()) && !isImage(viewingDocContent())" style="text-align: center; padding: 2.5rem;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔒</div>
              <p style="color: var(--text-primary); font-weight: 600; margin-bottom: 0.25rem;">
                Protected Document ({{ viewingDocContent()?.contentType }})
              </p>
              <p style="color: var(--text-muted); font-size: 0.85rem;">
                This document is verified and loaded securely in memory.
              </p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="viewingDocContent.set(null)">Close</button>
        </div>
      </div>
    </div>

    <!-- Modal: Snapshot History & Revert Changes -->
    <div class="modal-overlay" *ngIf="showSnapshotsModal()">
      <div class="modal-card" style="max-width: 720px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Document Version History &amp; Snapshots</h3>
            <div style="font-size: 0.8rem; color: var(--text-muted);">{{ activeSnapshotDoc?.title }}</div>
          </div>
          <button class="modal-close" (click)="showSnapshotsModal.set(false)">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.825rem; color: var(--text-secondary); margin-bottom: 1rem;">
            Every modification creates an immutable snapshot. You can revert any changes made by viewers at any time.
          </p>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Modified By</th>
                  <th>Change Summary</th>
                  <th>Timestamp</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of snapshots()">
                  <td>
                    <span class="badge badge-info">v{{ s.versionNumber }}</span>
                  </td>
                  <td>
                    <div style="font-weight: 600;">{{ s.editedByUserEmail }}</div>
                    <div style="font-size: 0.725rem; color: var(--text-muted);">Role: {{ s.editedByRole }}</div>
                  </td>
                  <td>{{ s.changeSummary || '—' }}</td>
                  <td>{{ s.createdAt | date:'short' }}</td>
                  <td style="text-align: right;">
                    <button 
                      class="btn btn-warning btn-sm" 
                      [disabled]="snapshots().length > 0 && s.versionNumber === snapshots()[0].versionNumber"
                      (click)="onRevertSnapshot(s.versionNumber)"
                      title="Undo subsequent edits and restore this version"
                    >
                      Revert Here
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showSnapshotsModal.set(false)">Close</button>
        </div>
      </div>
    </div>

    <!-- Modal: Upload Document -->
    <div class="modal-overlay" *ngIf="showUploadModal()">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Upload Document</h3>
          <button class="modal-close" (click)="showUploadModal.set(false)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger" *ngIf="uploadError()">
            {{ uploadError() }}
          </div>
          <div class="form-group">
            <label class="form-label">Document Title</label>
            <input type="text" class="form-input" [(ngModel)]="uploadTitle" placeholder="e.g. Master Services Agreement" />
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <input type="text" class="form-input" [(ngModel)]="uploadCategory" placeholder="e.g. Contracts, Legal, Salary" />
          </div>
          <div class="form-group">
            <label class="form-label">Description (Optional)</label>
            <textarea class="form-textarea" rows="2" [(ngModel)]="uploadDescription" placeholder="Notes or classification details..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Select File (PDF, DOCX, XLSX, TXT, PNG, JPG)</label>
            <input type="file" class="form-input" (change)="onFileSelected($event)" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showUploadModal.set(false)">Cancel</button>
          <button class="btn btn-primary" (click)="onUploadSubmit()" [disabled]="isUploading() || !selectedFile">
            <span *ngIf="!isUploading()">Upload Document</span>
            <span *ngIf="isUploading()">Uploading...</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Manage Grants & Instant Revocation -->
    <div class="modal-overlay" *ngIf="showGrantModal()">
      <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Discrete Permissions &amp; Access Control</h3>
            <div style="font-size: 0.8rem; color: var(--text-muted);">{{ activeDoc?.title }}</div>
          </div>
          <button class="modal-close" (click)="showGrantModal.set(false)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-info">
            <strong>Discrete Permissions:</strong> READ allows viewing in secure panel. DOWNLOAD allows saving the file. EDIT allows modifying content. Each permission is independently verified.
          </div>

          <div class="alert alert-danger" *ngIf="grantError()">
            {{ grantError() }}
          </div>

          <!-- Section 1: Active Grants on this Document -->
          <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.5rem;">Current Active Grants</h4>
          <div class="table-responsive" style="margin-bottom: 1.5rem;">
            <table class="table">
              <thead>
                <tr>
                  <th>Granted User</th>
                  <th>Permission</th>
                  <th>Granted At</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let g of currentGrants()">
                  <td>
                    <div style="font-weight: 600;">{{ g.username }}</div>
                    <div class="font-mono" style="font-size: 0.75rem; color: var(--text-muted);">{{ g.email }}</div>
                  </td>
                  <td>
                    <span class="badge badge-info">{{ g.permissionType }}</span>
                  </td>
                  <td>{{ g.grantedAtUtc | date:'short' }}</td>
                  <td style="text-align: right;">
                    <button class="btn btn-danger btn-sm" (click)="onRevokeGrant(g.userId)">
                      Revoke Access
                    </button>
                  </td>
                </tr>
                <tr *ngIf="currentGrants().length === 0">
                  <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                    No external users currently have access to this document.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Section 2: Grant to Individual Viewer -->
          <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.5rem;">Grant to Named Viewer</h4>
          <div class="grid-cols-2" style="margin-bottom: 1rem;">
            <div>
              <label class="form-label">Select Viewer</label>
              <select class="form-select" [(ngModel)]="selectedViewerId">
                <option value="">Select a viewer...</option>
                <option *ngFor="let v of viewers()" [value]="v.id">{{ v.username }} ({{ v.email }})</option>
              </select>
            </div>
            <div>
              <label class="form-label">Discrete Capabilities</label>
              <div style="display: flex; gap: 0.75rem; align-items: center; padding-top: 0.5rem;">
                <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.825rem;">
                  <input type="checkbox" [(ngModel)]="permRead" /> Read
                </label>
                <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.825rem;">
                  <input type="checkbox" [(ngModel)]="permDownload" /> Download
                </label>
                <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.825rem;">
                  <input type="checkbox" [(ngModel)]="permEdit" /> Edit
                </label>
              </div>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" (click)="onGrantIndividual()">Grant Permissions</button>

          <!-- Section 3: Bulk Grant by Tag -->
          <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
            <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.5rem;">Bulk Grant by Tag Group</h4>
            <div class="grid-cols-2">
              <div>
                <label class="form-label">Select Tag</label>
                <input type="text" class="form-input" [(ngModel)]="tagToGrant" placeholder="e.g. Finance, Developer" />
              </div>
              <div style="display: flex; align-items: flex-end;">
                <button class="btn btn-secondary btn-sm" (click)="onGrantByTag()">Bulk Grant to Tag</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showGrantModal.set(false)">Close</button>
        </div>
      </div>
    </div>

    <!-- Modal: Provision Viewer -->
    <div class="modal-overlay" *ngIf="showNewViewerModal()">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Provision New Viewer Account</h3>
          <button class="modal-close" (click)="showNewViewerModal.set(false)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger" *ngIf="viewerError()">
            {{ viewerError() }}
          </div>
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" class="form-input" [(ngModel)]="newViewer.username" placeholder="e.g. charlie_viewer" />
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-input" [(ngModel)]="newViewer.email" placeholder="charlie@trustvault.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Temporary Password</label>
            <input type="password" class="form-input" [(ngModel)]="newViewer.password" placeholder="••••••••••••" />
          </div>
          <div class="form-group">
            <label class="form-label">Department</label>
            <input type="text" class="form-input" [(ngModel)]="newViewer.department" placeholder="e.g. Operations" />
          </div>
          <div class="form-group">
            <label class="form-label">Initial Tag (Optional)</label>
            <input type="text" class="form-input" [(ngModel)]="newViewerTag" placeholder="e.g. Finance" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showNewViewerModal.set(false)">Cancel</button>
          <button class="btn btn-primary" (click)="onCreateViewer()">Provision Viewer</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .action-buttons { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .card-title { font-size: 1.15rem; font-weight: 700; color: #0f172a; }
    .metric-card { display: flex; flex-direction: column; gap: 0.25rem; }
    .metric-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); }
    .metric-value { font-size: 2rem; font-weight: 800; color: #0f172a; line-height: 1.2; }
    .metric-note { font-size: 0.725rem; color: var(--text-secondary); }
    .text-primary { color: #0f172a !important; }
    .tabs-bar {
      display: flex;
      gap: 0.5rem;
      margin-top: 1.5rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.5rem;
    }
    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      font-size: 0.9rem;
      font-weight: 600;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tab-btn:hover {
      color: #0f172a;
      background: #f1f5f9;
      transform: translateY(-1px);
    }
    .tab-btn.active {
      color: #ffffff;
      background: #0f172a;
      border-color: #0f172a;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
    }
    .search-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .protected-viewer-banner {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #b45309;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .document-content-area {
      user-select: none;
      -webkit-user-select: none;
      background: #f8fafc;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 10px;
      padding: 1.25rem;
      max-height: 480px;
      overflow-y: auto;
    }
    .secure-text-view {
      font-family: var(--font-sans);
      font-size: 0.9rem;
      color: #0f172a;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .time-presets-bar {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
      align-items: center;
    }
    .preset-chip {
      background: #f1f5f9;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 20px;
      padding: 0.3rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .preset-chip:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .preset-chip.active {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3);
    }
    .custom-range-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      background: #f8fafc;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      border: 1px dashed rgba(15, 23, 42, 0.15);
      margin-top: 0.25rem;
      width: 100%;
    }
  `]
})
export class OwnerDashboardComponent implements OnInit {
  private documentService = inject(DocumentService);
  private permissionService = inject(PermissionService);
  private auditService = inject(AuditService);
  private userService = inject(UserService);
  private sanitizer = inject(DomSanitizer);

  isPdf(doc: DocumentContentResponse | null): boolean {
    if (!doc) return false;
    return doc.contentType.toLowerCase().includes('pdf') || doc.title.toLowerCase().endsWith('.pdf');
  }

  isImage(doc: DocumentContentResponse | null): boolean {
    if (!doc) return false;
    return doc.contentType.toLowerCase().startsWith('image/');
  }

  getSafePdfUrl(doc: DocumentContentResponse): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`data:application/pdf;base64,${doc.base64Data}#toolbar=0`);
  }

  getSafeImageUrl(doc: DocumentContentResponse): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`data:${doc.contentType};base64,${doc.base64Data}`);
  }

  activeTab = signal<'documents' | 'viewers' | 'tags' | 'audit'>('documents');
  ownerViewerMode = signal<'pdf' | 'text'>('pdf');
  metrics = signal<OwnerMetricsResponse | null>(null);

  get displayedMetrics(): OwnerMetricsResponse {
    return this.metrics() || {
      totalOwnedDocs: this.documents().length,
      activeGrantsCount: 0,
      totalViewers: this.viewers().length,
      totalTags: this.tags().length
    };
  }
  documents = signal<DocumentResponse[]>([]);

  ownerAuditLogs = signal<AuditLogDto[]>([]);
  viewers = signal<UserDto[]>([]);
  tags = signal<UserTagDto[]>([]);

  searchQuery = '';
  categoryFilter = '';
  auditSearchQuery = '';

  // Upload modal state
  showUploadModal = signal(false);
  uploadTitle = '';
  uploadCategory = '';
  uploadDescription = '';
  selectedFile: File | null = null;
  isUploading = signal(false);
  uploadError = signal<string | null>(null);

  // View content modal state
  viewingDocContent = signal<DocumentContentResponse | null>(null);

  // Snapshots modal state
  showSnapshotsModal = signal(false);
  activeSnapshotDoc: DocumentResponse | null = null;
  snapshots = signal<DocumentSnapshotDto[]>([]);

  // Grant modal state
  showGrantModal = signal(false);
  activeDoc: DocumentResponse | null = null;
  currentGrants = signal<PermissionResponse[]>([]);
  selectedViewerId = '';
  permRead = true;
  permDownload = true;
  permEdit = false;
  tagToGrant = '';
  grantError = signal<string | null>(null);

  // Owner time preset state
  ownerTimePreset = signal<'today' | 'yesterday' | '7days' | '30days' | 'custom' | 'all'>('today');
  ownerFromDate = '';
  ownerToDate = '';

  // New viewer modal state
  showNewViewerModal = signal(false);
  newViewer = { username: '', email: '', password: '', department: '' };
  newViewerTag = '';
  viewerError = signal<string | null>(null);

  // New tag state
  newTagUserId = '';
  newTagName = '';

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.auditService.getOwnerMetrics().subscribe(m => this.metrics.set(m));
    this.loadDocuments();
    this.loadOwnerAudit();
    this.userService.getViewers().subscribe(v => this.viewers.set(v));
    this.userService.getTags().subscribe(t => this.tags.set(t));
  }

  setOwnerTimePreset(preset: 'today' | 'yesterday' | '7days' | '30days' | 'custom' | 'all'): void {
    this.ownerTimePreset.set(preset);
    this.loadOwnerAudit();
  }

  ownerTimePresetLabel(): string {
    switch (this.ownerTimePreset()) {
      case 'today': return "Today's Activity";
      case 'yesterday': return "Yesterday's Activity";
      case '7days': return "Past 7 Days";
      case '30days': return "Past 30 Days";
      case 'custom': return "Custom Range Filtered";
      case 'all': return "Complete Unbounded Activity";
    }
  }

  loadDocuments(): void {
    this.documentService.list().subscribe(docs => this.documents.set(docs));
  }

  loadOwnerAudit(): void {
    this.auditService.getOwnerAuditLogs({
      search: this.auditSearchQuery || undefined,
      preset: this.ownerTimePreset(),
      fromDate: this.ownerTimePreset() === 'custom' && this.ownerFromDate ? this.ownerFromDate : undefined,
      toDate: this.ownerTimePreset() === 'custom' && this.ownerToDate ? this.ownerToDate : undefined,
      page: 1,
      pageSize: 50
    }).subscribe(res => this.ownerAuditLogs.set(res.items));
  }

  onExportOwnerAuditStatement(): void {
    this.auditService.exportOwnerAuditLogs({
      search: this.auditSearchQuery || undefined,
      preset: this.ownerTimePreset(),
      fromDate: this.ownerTimePreset() === 'custom' && this.ownerFromDate ? this.ownerFromDate : undefined,
      toDate: this.ownerTimePreset() === 'custom' && this.ownerToDate ? this.ownerToDate : undefined
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document-access-statement-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('Could not download document access statement from server.');
      }
    });
  }

  onSearch(): void {
    this.documentService.search({
      query: this.searchQuery || undefined,
      category: this.categoryFilter || undefined
    }).subscribe(docs => this.documents.set(docs));
  }

  resetSearch(): void {
    this.searchQuery = '';
    this.categoryFilter = '';
    this.loadDocuments();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onUploadSubmit(): void {
    if (!this.selectedFile) return;

    this.isUploading.set(true);
    this.uploadError.set(null);

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('title', this.uploadTitle || this.selectedFile.name);
    formData.append('category', this.uploadCategory || 'General');
    if (this.uploadDescription) {
      formData.append('description', this.uploadDescription);
    }

    this.documentService.upload(formData).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.showUploadModal.set(false);
        this.uploadTitle = '';
        this.uploadCategory = '';
        this.uploadDescription = '';
        this.selectedFile = null;
        this.loadAll();
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadError.set(err.error?.message || 'File upload failed.');
      }
    });
  }

  onViewDocument(doc: DocumentResponse): void {
    this.documentService.getContent(doc.id).subscribe({
      next: (contentRes) => {
        this.ownerViewerMode.set('pdf');
        this.viewingDocContent.set(contentRes);
      },
      error: () => {
        alert('Unable to load document content.');
      }
    });
  }


  openSnapshotsModal(doc: DocumentResponse): void {
    this.activeSnapshotDoc = doc;
    this.documentService.getSnapshots(doc.id).subscribe(s => this.snapshots.set(s));
    this.showSnapshotsModal.set(true);
  }

  onRevertSnapshot(versionNumber: number): void {
    if (!this.activeSnapshotDoc) return;
    if (!confirm(`Are you sure you want to revert this document to Version ${versionNumber}? This will revoke subsequent edits.`)) return;

    this.documentService.revertSnapshot(this.activeSnapshotDoc.id, versionNumber).subscribe({
      next: () => {
        this.documentService.getSnapshots(this.activeSnapshotDoc!.id).subscribe(s => this.snapshots.set(s));
        this.loadDocuments();
        this.loadOwnerAudit();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to revert to snapshot.');
      }
    });
  }

  onDownload(docId: string, fileName: string): void {
    this.documentService.download(docId).subscribe(res => {
      const blob = res.body;
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  onDeleteDocument(docId: string): void {
    if (!confirm('Are you sure you want to delete this document?')) return;

    this.documentService.delete(docId).subscribe(() => {
      this.loadAll();
    });
  }

  openGrantModal(doc: DocumentResponse): void {
    this.activeDoc = doc;
    this.grantError.set(null);
    this.permissionService.list(doc.id).subscribe(grants => this.currentGrants.set(grants));
    this.showGrantModal.set(true);
  }

  onGrantIndividual(): void {
    if (!this.activeDoc || !this.selectedViewerId) {
      this.grantError.set('Please select a viewer.');
      return;
    }

    const perms: PermissionType[] = [];
    if (this.permRead) perms.push(PermissionType.Read);
    if (this.permDownload) perms.push(PermissionType.Download);
    if (this.permEdit) perms.push(PermissionType.Edit);

    if (perms.length === 0) {
      this.grantError.set('Please select at least one permission.');
      return;
    }

    this.permissionService.grant(this.activeDoc.id, {
      userId: this.selectedViewerId,
      permissions: perms
    }).subscribe({
      next: () => {
        this.grantError.set(null);
        this.permissionService.list(this.activeDoc!.id).subscribe(grants => this.currentGrants.set(grants));
        this.auditService.getOwnerMetrics().subscribe(m => this.metrics.set(m));
      },
      error: (err) => {
        this.grantError.set(err.error?.message || 'Failed to grant permissions.');
      }
    });
  }

  onGrantByTag(): void {
    if (!this.activeDoc || !this.tagToGrant) return;

    const perms: PermissionType[] = [];
    if (this.permRead) perms.push(PermissionType.Read);
    if (this.permDownload) perms.push(PermissionType.Download);
    if (this.permEdit) perms.push(PermissionType.Edit);

    this.permissionService.grantByTag(this.activeDoc.id, {
      tagName: this.tagToGrant,
      permissions: perms
    }).subscribe({
      next: () => {
        this.tagToGrant = '';
        this.grantError.set(null);
        this.permissionService.list(this.activeDoc!.id).subscribe(grants => this.currentGrants.set(grants));
        this.auditService.getOwnerMetrics().subscribe(m => this.metrics.set(m));
      },
      error: (err) => {
        this.grantError.set(err.error?.message || 'Failed to grant by tag.');
      }
    });
  }

  onRevokeGrant(targetUserId: string): void {
    if (!this.activeDoc) return;

    this.permissionService.revoke(this.activeDoc.id, targetUserId).subscribe({
      next: () => {
        this.permissionService.list(this.activeDoc!.id).subscribe(grants => this.currentGrants.set(grants));
        this.auditService.getOwnerMetrics().subscribe(m => this.metrics.set(m));
      }
    });
  }

  onCreateViewer(): void {
    if (!this.newViewer.username || !this.newViewer.email || !this.newViewer.password) {
      this.viewerError.set('Please fill out all required fields.');
      return;
    }

    const tags = this.newViewerTag ? [this.newViewerTag.trim()] : [];
    this.userService.createViewer({
      ...this.newViewer,
      initialTags: tags
    }).subscribe({
      next: () => {
        this.showNewViewerModal.set(false);
        this.newViewer = { username: '', email: '', password: '', department: '' };
        this.newViewerTag = '';
        this.userService.getViewers().subscribe(v => this.viewers.set(v));
        this.userService.getTags().subscribe(t => this.tags.set(t));
        this.auditService.getOwnerMetrics().subscribe(m => this.metrics.set(m));
      },
      error: (err) => {
        this.viewerError.set(err.error?.message || 'Failed to provision Viewer account.');
      }
    });
  }

  onDeleteViewer(v: UserDto): void {
    if (!confirm(`Are you sure you want to permanently delete viewer "${v.username}" (${v.email})? All permissions and tags will be revoked immediately.`)) return;

    this.userService.deleteViewer(v.id).subscribe({
      next: () => {
        this.userService.getViewers().subscribe(vl => this.viewers.set(vl));
        this.userService.getTags().subscribe(t => this.tags.set(t));
        this.auditService.getOwnerMetrics().subscribe(m => this.metrics.set(m));
        this.loadDocuments();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to delete viewer.');
      }
    });
  }

  onAssignTag(): void {
    if (!this.newTagUserId || !this.newTagName) return;

    this.userService.assignTag(this.newTagUserId, this.newTagName).subscribe(() => {
      this.newTagName = '';
      this.userService.getTags().subscribe(t => this.tags.set(t));
      this.auditService.getOwnerMetrics().subscribe(m => this.metrics.set(m));
    });
  }

  onDeleteTag(tagId: string): void {
    this.userService.deleteTag(tagId).subscribe(() => {
      this.userService.getTags().subscribe(t => this.tags.set(t));
      this.auditService.getOwnerMetrics().subscribe(m => this.metrics.set(m));
    });
  }
}
