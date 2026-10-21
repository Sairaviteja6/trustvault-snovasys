import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../../../core/services/document.service';
import { PermissionService } from '../../../core/services/permission.service';
import { AuditService } from '../../../core/services/audit.service';
import { UserService } from '../../../core/services/user.service';
import { 
  AuditLogDto, 
  DocumentResponse, 
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
          <h1 class="section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Document Owner Control Center
          </h1>
          <p class="section-subtitle">
            Upload AES-256-GCM confidential documents, manage discrete caller grants, and inspect access logs.
          </p>
        </div>
        <div class="action-buttons">
          <button class="btn btn-secondary" (click)="loadAll()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
          <button class="btn btn-secondary" (click)="showNewViewerModal.set(true)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            Provision Viewer
          </button>
          <button class="btn btn-primary" (click)="showUploadModal.set(true)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Encrypted Document
          </button>
        </div>
      </div>

      <!-- Metrics Cards -->
      <div class="grid-cols-4" *ngIf="metrics() as m">
        <div class="card metric-card">
          <span class="metric-label">Owned Documents</span>
          <span class="metric-value">{{ m.totalOwnedDocs }}</span>
          <span class="metric-note">Stored in AES-256 encrypted blobs</span>
        </div>
        <div class="card metric-card">
          <span class="metric-label">Active Caller Grants</span>
          <span class="metric-value text-primary">{{ m.activeGrantsCount }}</span>
          <span class="metric-note">Dynamic per-user permissions</span>
        </div>
        <div class="card metric-card">
          <span class="metric-label">Available Viewers</span>
          <span class="metric-value">{{ m.totalViewers }}</span>
          <span class="metric-note">Eligible named individuals</span>
        </div>
        <div class="card metric-card">
          <span class="metric-label">Tag Groups</span>
          <span class="metric-value">{{ m.totalTags }}</span>
          <span class="metric-note">For bulk ACL assignment</span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-bar">
        <button class="tab-btn" [class.active]="activeTab() === 'documents'" (click)="activeTab.set('documents')">
          Documents Catalog ({{ documents().length }})
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'audit'" (click)="activeTab.set('audit')">
          Owner-Scoped Audit Trail
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'tags'" (click)="activeTab.set('tags')">
          User Tags &amp; Groups
        </button>
      </div>

      <!-- TAB 1: Documents Catalog -->
      <div *ngIf="activeTab() === 'documents'" class="card" style="margin-top: 1rem;">
        <div class="section-header">
          <div class="search-bar">
            <input 
              type="text" 
              class="form-input" 
              style="width: 280px;" 
              placeholder="Search by title, description or filename..." 
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
                <th>SHA-256 Digest</th>
                <th>Upload Date</th>
                <th style="text-align: right;">Security Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let doc of documents()">
                <td>
                  <div style="font-weight: 700; color: #f8fafc;">{{ doc.title }}</div>
                  <div style="font-size: 0.775rem; color: var(--text-secondary);">{{ doc.description || 'No description' }}</div>
                  <span class="badge badge-info" style="margin-top: 4px;">{{ doc.category }}</span>
                </td>
                <td>
                  <div class="font-mono" style="font-size: 0.8rem;">{{ doc.originalFileName }}</div>
                  <div style="font-size: 0.725rem; color: var(--text-muted);">{{ (doc.fileSizeBytes / 1024).toFixed(1) }} KB &bull; {{ doc.contentType }}</div>
                </td>
                <td class="font-mono" style="font-size: 0.75rem; color: #38bdf8;">
                  {{ doc.fileHashSha256.slice(0, 16) }}...
                </td>
                <td>{{ doc.createdAt | date:'short' }}</td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 0.4rem;">
                    <button class="btn btn-secondary btn-sm" (click)="openGrantModal(doc)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      Grants
                    </button>
                    <button class="btn btn-primary btn-sm" (click)="onDownload(doc.id, doc.originalFileName)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download
                    </button>
                    <button class="btn btn-danger btn-sm" (click)="onDeleteDocument(doc.id)">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="documents().length === 0">
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                  No documents found. Upload your first encrypted document above.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: Owner Audit Trail -->
      <div *ngIf="activeTab() === 'audit'" class="card" style="margin-top: 1rem;">
        <div class="section-header">
          <div>
            <h2 class="card-title">Activity on Your Documents</h2>
            <p class="section-subtitle">Real-time log of every read, download, grant, and refused attempt on files you own.</p>
          </div>
          <input 
            type="text" 
            class="form-input" 
            style="width: 260px;" 
            placeholder="Search audit events..." 
            [(ngModel)]="auditSearchQuery" 
            (keyup.enter)="loadOwnerAudit()"
          />
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

      <!-- TAB 3: User Tags -->
      <div *ngIf="activeTab() === 'tags'" class="card" style="margin-top: 1rem;">
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
    </div>

    <!-- Modal: Upload Document -->
    <div class="modal-overlay" *ngIf="showUploadModal()">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Upload Encrypted Document</h3>
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
            <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 4px;">
              Files are inspected for magic bytes, encrypted with AES-256-GCM, and stored outside the web root.
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showUploadModal.set(false)">Cancel</button>
          <button class="btn btn-primary" (click)="onUploadSubmit()" [disabled]="isUploading() || !selectedFile">
            <span *ngIf="!isUploading()">Encrypt &amp; Upload</span>
            <span *ngIf="isUploading()">Encrypting...</span>
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
            <strong>Discrete Permission Model:</strong> <code>EDIT</code> does not imply <code>DOWNLOAD</code>. Grant only the exact capabilities required. Revoking immediately takes effect on the very next HTTP request.
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
    .card-title { font-size: 1.15rem; font-weight: 700; }
    .metric-card { display: flex; flex-direction: column; gap: 0.25rem; }
    .metric-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); }
    .metric-value { font-size: 2rem; font-weight: 800; color: #f8fafc; line-height: 1.2; }
    .metric-note { font-size: 0.725rem; color: var(--text-secondary); }
    .text-primary { color: #60a5fa !important; }
    .tabs-bar {
      display: flex;
      gap: 0.5rem;
      margin-top: 1.5rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.5rem;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.9rem;
      font-weight: 600;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .tab-btn.active {
      color: #f8fafc;
      background: var(--bg-surface-elevated);
    }
    .search-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  `]
})
export class OwnerDashboardComponent implements OnInit {
  private documentService = inject(DocumentService);
  private permissionService = inject(PermissionService);
  private auditService = inject(AuditService);
  private userService = inject(UserService);

  activeTab = signal<'documents' | 'audit' | 'tags'>('documents');
  metrics = signal<OwnerMetricsResponse | null>(null);
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

  loadDocuments(): void {
    this.documentService.list().subscribe(docs => this.documents.set(docs));
  }

  loadOwnerAudit(): void {
    this.auditService.getOwnerAuditLogs({
      search: this.auditSearchQuery || undefined,
      page: 1,
      pageSize: 50
    }).subscribe(res => this.ownerAuditLogs.set(res.items));
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
        this.uploadError.set(err.error?.message || 'File upload failed. Ensure magic bytes match extension.');
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
