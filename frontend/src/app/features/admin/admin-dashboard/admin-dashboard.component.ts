import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../../core/services/audit.service';
import { UserService } from '../../../core/services/user.service';
import { 
  AdminMetricsResponse, 
  AuditLogDto, 
  AuditVerificationResult, 
  UserDto 
} from '../../../core/models/api.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="section-header">
        <div>
          <h1 class="section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Security Administrator Portal
          </h1>
          <p class="section-subtitle">
            Zero-knowledge administration: user governance, system telemetry, and cryptographic chain verification.
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
          <button class="btn btn-primary" (click)="showNewOwnerModal.set(true)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Provision Document Owner
          </button>
        </div>
      </div>

      <!-- Security Notice Banner -->
      <div class="alert alert-info">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <div>
          <strong>Least Privilege Enforcement:</strong> As an Administrator, you can audit system actions and manage user lifecycles, but cryptographic isolation prevents downloading or viewing user documents.
        </div>
      </div>

      <!-- Metrics Cards -->
      <div class="grid-cols-4" *ngIf="metrics() as m">
        <div class="card metric-card">
          <span class="metric-label">Active Document Owners</span>
          <span class="metric-value">{{ m.totalActiveOwners }}</span>
          <span class="metric-note">Authorized to upload &amp; grant</span>
        </div>
        <div class="card metric-card">
          <span class="metric-label">Active Viewers</span>
          <span class="metric-value">{{ m.totalActiveViewers }}</span>
          <span class="metric-note">Named access recipients</span>
        </div>
        <div class="card metric-card">
          <span class="metric-label">Stored Documents</span>
          <span class="metric-value">{{ m.totalDocuments }}</span>
          <span class="metric-note">AES-256-GCM encrypted</span>
        </div>
        <div class="card metric-card alert-metric">
          <span class="metric-label">Refused Access Attempts</span>
          <span class="metric-value text-danger">{{ m.totalRefusedAttempts }}</span>
          <span class="metric-note">IDOR &amp; unauthorized blocks</span>
        </div>
      </div>

      <!-- Audit Chain Verification Panel -->
      <div class="card verification-card" style="margin-top: 1.5rem;">
        <div class="verification-header">
          <div>
            <h2 class="verification-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Cryptographic Audit Trail Integrity
            </h2>
            <p class="verification-subtitle">
              Calculates cumulative SHA-256 hash chains across SQL Server records to prove zero alteration or row deletions.
            </p>
          </div>
          <button class="btn btn-success" (click)="onVerifyChain()" [disabled]="isVerifying()">
            <span *ngIf="!isVerifying()">Verify Chain Integrity</span>
            <span *ngIf="isVerifying()">Recalculating Hashes...</span>
          </button>
        </div>

        <div *ngIf="verificationResult() as vr" class="verification-result" [ngClass]="vr.isChainIntact ? 'intact' : 'broken'">
          <div class="status-indicator">
            <span class="indicator-dot"></span>
            <strong>{{ vr.isChainIntact ? 'CHAIN INTEGRITY INTACT' : 'INTEGRITY BREACH DETECTED' }}</strong>
          </div>
          <p class="verification-msg">{{ vr.status }}</p>
          <div class="verification-stats">
            <span>Verified Records: <strong>{{ vr.totalAuditedRecords }}</strong></span>
            <span>Timestamp: <strong>{{ vr.verificationTimestamp | date:'medium' }}</strong></span>
            <span *ngIf="vr.compromisedLogId" class="text-danger">Compromised Log ID: <strong>#{{ vr.compromisedLogId }}</strong></span>
          </div>
        </div>
      </div>

      <!-- User Management Section -->
      <div class="card" style="margin-top: 1.5rem;">
        <div class="section-header">
          <div>
            <h2 class="card-title">User Account Governance</h2>
            <p class="section-subtitle">Manage system users and instantly toggle status to revoke active tokens</p>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Created</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of users()">
                <td style="font-weight: 600;">{{ u.username }}</td>
                <td class="font-mono">{{ u.email }}</td>
                <td>
                  <span class="badge" [ngClass]="u.role === 'Admin' ? 'badge-danger' : (u.role === 'Owner' ? 'badge-warning' : 'badge-info')">
                    {{ u.role }}
                  </span>
                </td>
                <td>{{ u.department || '—' }}</td>
                <td>
                  <span class="badge" [ngClass]="u.isActive ? 'badge-success' : 'badge-danger'">
                    {{ u.isActive ? 'Active' : 'Deactivated' }}
                  </span>
                </td>
                <td>{{ u.createdAt | date:'shortDate' }}</td>
                <td style="text-align: right;">
                  <button 
                    *ngIf="u.role !== 'Admin'"
                    class="btn btn-sm" 
                    [ngClass]="u.isActive ? 'btn-danger' : 'btn-success'"
                    (click)="onToggleStatus(u.id)"
                  >
                    {{ u.isActive ? 'Deactivate (Cut Off)' : 'Activate' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- System Audit Trail -->
      <div class="card" style="margin-top: 1.5rem;">
        <div class="section-header">
          <div>
            <h2 class="card-title">System-Wide Audit Trail</h2>
            <p class="section-subtitle">Immutable append-only records of all security events and access attempts</p>
          </div>
          <div class="filters-bar">
            <input 
              type="text" 
              class="form-input" 
              style="width: 240px;" 
              placeholder="Filter by email or keyword..." 
              [(ngModel)]="searchQuery" 
              (keyup.enter)="loadAuditLogs()"
            />
            <select class="form-select" style="width: 140px;" [(ngModel)]="statusFilter" (change)="loadAuditLogs()">
              <option value="">All Statuses</option>
              <option value="Allowed">Allowed</option>
              <option value="Refused">Refused</option>
            </select>
            <button class="btn btn-secondary btn-sm" (click)="loadAuditLogs()">Filter</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp (UTC)</th>
                <th>Caller</th>
                <th>Action</th>
                <th>Status</th>
                <th>Document</th>
                <th>Details</th>
                <th>Cryptographic Chain Hashes</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of auditLogs()">
                <td class="font-mono">#{{ log.id }}</td>
                <td>{{ log.timestamp | date:'short' }}</td>
                <td>
                  <div style="font-weight: 600;">{{ log.userEmail || 'Anonymous' }}</div>
                  <div style="font-size: 0.725rem; color: var(--text-muted);">{{ log.ipAddress }}</div>
                </td>
                <td>
                  <span class="badge badge-info">{{ log.action }}</span>
                </td>
                <td>
                  <span class="badge" [ngClass]="log.status === 'Allowed' ? 'badge-success' : 'badge-danger'">
                    {{ log.status }}
                  </span>
                </td>
                <td>{{ log.documentTitle || '—' }}</td>
                <td style="max-width: 280px; font-size: 0.8rem;">{{ log.details }}</td>
                <td class="font-mono hash-cell">
                  <div><span class="hash-tag">Prev:</span> {{ log.previousHash.slice(0, 16) }}...</div>
                  <div><span class="hash-tag">Curr:</span> {{ log.currentHash.slice(0, 16) }}...</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal: Provision Document Owner -->
    <div class="modal-overlay" *ngIf="showNewOwnerModal()">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Provision New Document Owner</h3>
          <button class="modal-close" (click)="showNewOwnerModal.set(false)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger" *ngIf="ownerError()">
            {{ ownerError() }}
          </div>
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" class="form-input" [(ngModel)]="newOwner.username" placeholder="e.g. legal_owner" />
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-input" [(ngModel)]="newOwner.email" placeholder="owner@company.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Temporary Password</label>
            <input type="password" class="form-input" [(ngModel)]="newOwner.password" placeholder="••••••••••••" />
          </div>
          <div class="form-group">
            <label class="form-label">Department / Unit</label>
            <input type="text" class="form-input" [(ngModel)]="newOwner.department" placeholder="e.g. Legal &amp; Compliance" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showNewOwnerModal.set(false)">Cancel</button>
          <button class="btn btn-primary" (click)="onCreateOwner()">Provision Owner</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .action-buttons { display: flex; gap: 0.75rem; }
    .card-title { font-size: 1.15rem; font-weight: 700; }
    .metric-card {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .metric-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .metric-value {
      font-size: 2rem;
      font-weight: 800;
      color: #f8fafc;
      line-height: 1.2;
    }
    .metric-note {
      font-size: 0.725rem;
      color: var(--text-secondary);
    }
    .alert-metric {
      border-color: rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.05);
    }
    .text-danger { color: #f87171 !important; }
    .verification-card {
      border: 1px solid rgba(16, 185, 129, 0.25);
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(17, 24, 39, 0.9) 100%);
    }
    .verification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .verification-title {
      font-size: 1.2rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .verification-subtitle {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 0.2rem;
    }
    .verification-result {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 8px;
    }
    .verification-result.intact {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .verification-result.broken {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      font-weight: 700;
      color: #34d399;
    }
    .verification-result.broken .status-indicator {
      color: #f87171;
    }
    .indicator-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 10px currentColor;
    }
    .verification-msg {
      font-size: 0.85rem;
      margin: 0.5rem 0;
      color: #e2e8f0;
    }
    .verification-stats {
      display: flex;
      gap: 1.5rem;
      font-size: 0.775rem;
      color: var(--text-secondary);
      flex-wrap: wrap;
    }
    .filters-bar {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .hash-cell {
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    .hash-tag {
      color: #38bdf8;
      font-weight: 600;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private auditService = inject(AuditService);
  private userService = inject(UserService);

  metrics = signal<AdminMetricsResponse | null>(null);
  users = signal<UserDto[]>([]);
  auditLogs = signal<AuditLogDto[]>([]);
  verificationResult = signal<AuditVerificationResult | null>(null);
  isVerifying = signal(false);

  searchQuery = '';
  statusFilter = '';

  showNewOwnerModal = signal(false);
  newOwner = { username: '', email: '', password: '', department: '' };
  ownerError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.auditService.getAdminMetrics().subscribe(m => this.metrics.set(m));
    this.userService.getAdminUsers().subscribe(u => this.users.set(u));
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.auditService.getAdminAuditLogs({
      search: this.searchQuery || undefined,
      status: this.statusFilter || undefined,
      page: 1,
      pageSize: 50
    }).subscribe(res => {
      this.auditLogs.set(res.items);
    });
  }

  onVerifyChain(): void {
    this.isVerifying.set(true);
    this.auditService.verifyAuditChain().subscribe({
      next: (res) => {
        this.verificationResult.set(res);
        this.isVerifying.set(false);
      },
      error: () => {
        this.isVerifying.set(false);
      }
    });
  }

  onToggleStatus(userId: string): void {
    this.userService.toggleUserStatus(userId).subscribe(() => {
      this.userService.getAdminUsers().subscribe(u => this.users.set(u));
      this.auditService.getAdminMetrics().subscribe(m => this.metrics.set(m));
    });
  }

  onCreateOwner(): void {
    if (!this.newOwner.username || !this.newOwner.email || !this.newOwner.password) {
      this.ownerError.set('Please fill out all required fields.');
      return;
    }

    this.ownerError.set(null);
    this.userService.createOwner(this.newOwner).subscribe({
      next: () => {
        this.showNewOwnerModal.set(false);
        this.newOwner = { username: '', email: '', password: '', department: '' };
        this.userService.getAdminUsers().subscribe(u => this.users.set(u));
        this.auditService.getAdminMetrics().subscribe(m => this.metrics.set(m));
      },
      error: (err) => {
        this.ownerError.set(err.error?.message || 'Failed to provision Owner account.');
      }
    });
  }
}
