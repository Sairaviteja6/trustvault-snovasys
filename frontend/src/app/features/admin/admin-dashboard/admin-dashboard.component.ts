import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../../core/services/audit.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { InquiryService, ClientInquiry } from '../../../core/services/inquiry.service';
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
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
            <h1 class="section-title" style="margin-bottom: 0;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              Workspace Administration
            </h1>
            <span class="badge" [ngClass]="isMasterAdmin() ? 'badge-danger' : 'badge-info'">
              {{ isMasterAdmin() ? 'Root Master Admin' : 'Secondary Administrator' }}
            </span>
          </div>
          <p class="section-subtitle">
            User governance, telemetry metrics, and platform audit explorer.
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

          <!-- Master Admin Exclusive Action: Provision Secondary Admin -->
          <button 
            *ngIf="isMasterAdmin()" 
            class="btn btn-secondary" 
            (click)="showNewAdminModal.set(true)"
            title="Create a secondary administrator with restricted privileges"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Provision Secondary Admin
          </button>

          <!-- Master Admin Exclusive Action: Provision Document Owner -->
          <button 
            *ngIf="isMasterAdmin()" 
            class="btn btn-primary" 
            (click)="showNewOwnerModal.set(true)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Provision Document Owner
          </button>
        </div>
      </div>

      <!-- Secondary Admin Information Notice -->
      <div class="alert alert-info" *ngIf="!isMasterAdmin()" style="margin-top: 1rem;">
        <strong>Secondary Administrator Mode:</strong> You have restricted governance rights (telemetry monitoring and audit log inspection). Account provisioning and owner suspension require Master Administrator privileges.
      </div>

      <!-- Success Notification Alert -->
      <div class="alert alert-success" *ngIf="adminSuccessMessage()">
        {{ adminSuccessMessage() }}
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
            <span>Audited Records Verified: <strong>{{ vr.totalAuditedRecords }}</strong></span>
            <span>Verified At: <strong>{{ vr.verificationTimestamp | date:'medium' }}</strong></span>
            <span *ngIf="vr.compromisedLogId">First Compromised Record: <strong class="text-danger">#{{ vr.compromisedLogId }}</strong></span>
          </div>
        </div>
      </div>

      <!-- User Accounts Governance Table -->
      <div class="card" style="margin-top: 1.5rem;">
        <div class="section-header">
          <div>
            <h2 class="card-title">User Accounts Governance</h2>
            <p class="section-subtitle">Provisioned identities, roles, authority levels, and access statuses</p>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email Address</th>
                <th>Role &amp; Privilege Level</th>
                <th>Department</th>
                <th>Status</th>
                <th>Provisioned Date</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of users()">
                <td style="font-weight: 600;">{{ u.username }}</td>
                <td class="font-mono">{{ u.email }}</td>
                <td>
                  <span 
                    *ngIf="u.role === 'Admin'" 
                    class="badge" 
                    [ngClass]="u.isMasterAdmin ? 'badge-danger' : 'badge-info'"
                  >
                    {{ u.isMasterAdmin ? 'Master Admin' : 'Secondary Admin' }}
                  </span>
                  <span *ngIf="u.role === 'Owner'" class="badge badge-warning">
                    Document Owner
                  </span>
                  <span *ngIf="u.role === 'Viewer'" class="badge badge-info">
                    Viewer
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
                    *ngIf="canToggleUser(u)"
                    class="btn btn-sm" 
                    [ngClass]="u.isActive ? 'btn-danger' : 'btn-success'"
                    (click)="onToggleStatus(u.id)"
                  >
                    {{ u.isActive ? 'Deactivate (Cut Off)' : 'Activate' }}
                  </button>
                  <span *ngIf="!canToggleUser(u)" style="font-size: 0.75rem; color: var(--text-muted);">
                    {{ u.isMasterAdmin ? 'Master Protected' : 'Restricted' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Enterprise Client Onboarding Inquiries (From Landing Page) -->
      <div class="card" style="margin-top: 1.5rem;">
        <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <h2 class="card-title">Client Onboarding Inquiries</h2>
              <span class="badge badge-info">{{ inquiryService.inquiries().length }} Total</span>
            </div>
            <p class="section-subtitle">
              Public enterprise inquiries submitted via the TrustVault landing page. Review requirements and provision dedicated Document Owner credentials.
            </p>
          </div>
          <button 
            class="btn btn-sm btn-secondary" 
            (click)="inquiryService.refreshInquiries()" 
            title="Refresh inquiries list from server"
            style="display: flex; align-items: center; gap: 0.4rem;"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>Refresh List</span>
          </button>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Organization &amp; Contact</th>
                <th>Corporate Email</th>
                <th>Requested Role</th>
                <th>Security Requirement</th>
                <th>Received</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inq of inquiryService.inquiries()">
                <td class="font-mono"><strong>{{ inq.id }}</strong></td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">{{ inq.organization }}</div>
                  <div style="font-size: 0.775rem; color: var(--text-muted);">{{ inq.fullName }} ({{ inq.department || 'General' }})</div>
                </td>
                <td class="font-mono">{{ inq.email }}</td>
                <td>
                  <span class="badge" [ngClass]="inq.requestedRole === 'Admin' ? 'badge-danger' : 'badge-info'">
                    {{ inq.requestedRole || 'Owner' }}
                  </span>
                </td>
                <td><span style="font-size: 0.8rem; color: #475569;">{{ inq.useCase }}</span></td>
                <td>{{ inq.createdAt | date:'short' }}</td>
                <td>
                  <span class="badge" [ngClass]="inq.status === 'Approved' ? 'badge-success' : 'badge-warning'">
                    {{ inq.status }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <button 
                    *ngIf="isMasterAdmin() && inq.status !== 'Approved'" 
                    class="btn btn-sm btn-primary"
                    (click)="approveAndDispatch(inq)"
                    title="Approve organization request and dispatch security credentials email"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Approve &amp; Dispatch Mail</span>
                  </button>
                  <div *ngIf="inq.status === 'Approved'" style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;">
                    <span style="font-size: 0.8rem; color: #10b981; font-weight: 700;">
                      ✓ Approved
                    </span>
                    <button 
                      class="btn btn-sm btn-secondary" 
                      (click)="showCredentialsDetails(inq)"
                      title="View provisioned credentials and email content"
                      style="font-size: 0.75rem; padding: 0.25rem 0.5rem;"
                    >
                      View Credentials
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="inquiryService.inquiries().length === 0">
                <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                  No client onboarding inquiries received yet.
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
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of auditLogs()">
                <td class="font-mono">#{{ log.id }}</td>
                <td class="font-mono" style="font-size: 0.8rem;">{{ log.timestamp | date:'short' }}</td>
                <td>
                  <div style="font-weight: 600;">{{ log.userEmail || 'System / Anonymous' }}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">{{ log.userRole || 'N/A' }}</div>
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
                <td style="font-size: 0.8rem; color: var(--text-secondary);">{{ log.details }}</td>
              </tr>
              <tr *ngIf="auditLogs().length === 0">
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                  No audit logs matching query.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal: Provision Secondary Administrator -->
    <div class="modal-overlay" *ngIf="showNewAdminModal()">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Provision Secondary Administrator</h3>
          <button class="modal-close" (click)="showNewAdminModal.set(false)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-info">
            <strong>Restricted Admin Role:</strong> Secondary Administrators are granted access to system telemetry and audit inspection, but cannot provision additional administrators or document owners.
          </div>
          <div class="alert alert-danger" *ngIf="subAdminError()">
            {{ subAdminError() }}
          </div>
          <div class="form-group">
            <label class="form-label">Username *</label>
            <input type="text" class="form-input" [(ngModel)]="newSubAdmin.username" placeholder="e.g. sec_auditor" />
          </div>
          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input type="email" class="form-input" [(ngModel)]="newSubAdmin.email" placeholder="e.g. auditor@trustvault.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Temporary Password *</label>
            <input type="password" class="form-input" [(ngModel)]="newSubAdmin.password" placeholder="Min 8 chars, uppercase, digit, special" />
          </div>
          <div class="form-group">
            <label class="form-label">Department / Unit</label>
            <input type="text" class="form-input" [(ngModel)]="newSubAdmin.department" placeholder="e.g. Security Operations (SOC)" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showNewAdminModal.set(false)">Cancel</button>
          <button class="btn btn-primary" (click)="onCreateSubAdmin()">Provision Secondary Admin</button>
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
            <label class="form-label">Username *</label>
            <input type="text" class="form-input" [(ngModel)]="newOwner.username" placeholder="e.g. hr_director" />
          </div>
          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input type="email" class="form-input" [(ngModel)]="newOwner.email" placeholder="e.g. owner@trustvault.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Temporary Password *</label>
            <input type="password" class="form-input" [(ngModel)]="newOwner.password" placeholder="Min 8 chars, uppercase, digit, special" />
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

    <!-- Modal: View Provisioned Credentials & Email Details -->
    <div class="modal-overlay" *ngIf="selectedCredentialsInquiry()">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Provisioned Credentials &amp; Access Details</h3>
          <button class="modal-close" (click)="selectedCredentialsInquiry.set(null)">&times;</button>
        </div>
        <div class="modal-body" *ngIf="selectedCredentialsInquiry() as inq">
          <div class="alert alert-success">
            <strong>Account Provisioned:</strong> Client request approved. Credentials generated &amp; email recorded.
          </div>

          <div class="form-group">
            <label class="form-label">Client Name &amp; Organization</label>
            <div class="form-input font-mono" style="background: #f8fafc; color: #0f172a; border: 1px solid rgba(15, 23, 42, 0.12);">
              {{ inq.fullName }} &bull; {{ inq.organization }} ({{ inq.department || 'General' }})
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Corporate Email Address (Destination)</label>
            <div class="form-input font-mono" style="background: #f8fafc; color: #0f172a; border: 1px solid rgba(15, 23, 42, 0.12);">
              {{ inq.email }}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Assigned Role</label>
            <div class="form-input font-mono" style="background: #f8fafc; color: #0f172a; font-weight: 700; border: 1px solid rgba(15, 23, 42, 0.12);">
              {{ inq.requestedRole || 'Owner' }}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Provisioned Username</label>
            <div class="form-input font-mono" style="background: #f8fafc; color: #0f172a; font-weight: 700; border: 1px solid rgba(15, 23, 42, 0.12);">
              {{ inq.email.split('@')[0] }}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Temporary Security Password</label>
            <div class="form-input font-mono" style="background: #f8fafc; color: #059669; font-weight: 800; border: 1px solid rgba(15, 23, 42, 0.12);">
              {{ inq.requestedRole === 'Admin' ? 'Admin@2026!' : 'Owner@2026!' }}
            </div>
          </div>

          <div style="margin-top: 1rem; padding: 0.75rem; background: #f8fafc; border: 1px solid rgba(15, 23, 42, 0.1); border-radius: 8px; font-size: 0.775rem; color: #475569; line-height: 1.5;">
            <strong>Email Dispatch Status:</strong> An HTML credentials notification email has been rendered and archived on the server outbox. If SMTP server credentials (e.g. Gmail App Password or AWS SES) are configured in <code>appsettings.json</code>, it is transmitted over the internet to the recipient's mail inbox.
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" (click)="selectedCredentialsInquiry.set(null)">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .action-buttons { display: flex; gap: 0.75rem; flex-wrap: wrap; }
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
      color: #0f172a;
      line-height: 1.2;
    }
    .metric-note {
      font-size: 0.725rem;
      color: var(--text-secondary);
    }
    .alert-metric {
      border-color: rgba(220, 38, 38, 0.2);
      background: #fef2f2;
    }
    .text-danger { color: #dc2626 !important; }
    .verification-card {
      border: 1px solid rgba(15, 23, 42, 0.12);
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
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
      color: #0f172a;
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
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
    }
    .verification-result.broken {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      font-weight: 700;
      color: #059669;
    }
    .verification-result.broken .status-indicator {
      color: #dc2626;
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
      color: #334155;
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
  `]
})
export class AdminDashboardComponent implements OnInit {
  private auditService = inject(AuditService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  readonly inquiryService = inject(InquiryService);

  readonly isMasterAdmin = this.authService.isMasterAdmin;

  metrics = signal<AdminMetricsResponse | null>(null);
  users = signal<UserDto[]>([]);
  auditLogs = signal<AuditLogDto[]>([]);
  verificationResult = signal<AuditVerificationResult | null>(null);
  isVerifying = signal(false);

  searchQuery = '';
  statusFilter = '';

  adminSuccessMessage = signal<string | null>(null);

  // New Owner modal state
  showNewOwnerModal = signal(false);
  newOwner = { username: '', email: '', password: '', department: '' };
  ownerError = signal<string | null>(null);

  // New Secondary Admin modal state
  showNewAdminModal = signal(false);
  newSubAdmin = { username: '', email: '', password: '', department: '' };
  subAdminError = signal<string | null>(null);

  // Inquiries Credentials Inspection modal state
  selectedCredentialsInquiry = signal<ClientInquiry | null>(null);

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.auditService.getAdminMetrics().subscribe(m => this.metrics.set(m));
    this.userService.getAdminUsers().subscribe(u => this.users.set(u));
    this.loadAuditLogs();
    this.inquiryService.refreshInquiries();
  }

  showCredentialsDetails(inq: ClientInquiry): void {
    this.selectedCredentialsInquiry.set(inq);
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

  canToggleUser(targetUser: UserDto): boolean {
    if (targetUser.isMasterAdmin) return false; // Master admin is protected
    if (!this.isMasterAdmin() && targetUser.role === 'Owner') return false; // Secondary admin cannot alter owners
    if (!this.isMasterAdmin() && targetUser.role === 'Admin') return false; // Secondary admin cannot alter admins
    return true;
  }

  onToggleStatus(userId: string): void {
    this.userService.toggleUserStatus(userId).subscribe({
      next: () => {
        this.userService.getAdminUsers().subscribe(u => this.users.set(u));
        this.auditService.getAdminMetrics().subscribe(m => this.metrics.set(m));
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to update user status.');
      }
    });
  }

  onCreateSubAdmin(): void {
    if (!this.newSubAdmin.username || !this.newSubAdmin.email || !this.newSubAdmin.password) {
      this.subAdminError.set('Please fill out all required fields.');
      return;
    }

    this.subAdminError.set(null);
    this.userService.createSubAdmin(this.newSubAdmin).subscribe({
      next: () => {
        this.showNewAdminModal.set(false);
        this.newSubAdmin = { username: '', email: '', password: '', department: '' };
        this.adminSuccessMessage.set('Secondary Administrator provisioned successfully with restricted governance privileges.');
        setTimeout(() => this.adminSuccessMessage.set(null), 5000);
        this.userService.getAdminUsers().subscribe(u => this.users.set(u));
        this.auditService.getAdminMetrics().subscribe(m => this.metrics.set(m));
      },
      error: (err) => {
        this.subAdminError.set(err.error?.message || 'Failed to provision Secondary Administrator.');
      }
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
        this.adminSuccessMessage.set('Document Owner provisioned successfully.');
        setTimeout(() => this.adminSuccessMessage.set(null), 5000);
        this.userService.getAdminUsers().subscribe(u => this.users.set(u));
        this.auditService.getAdminMetrics().subscribe(m => this.metrics.set(m));
      },
      error: (err) => {
        this.ownerError.set(err.error?.message || 'Failed to provision Owner account.');
      }
    });
  }

  approveAndDispatch(inq: ClientInquiry): void {
    const roleToAssign = inq.requestedRole || 'Owner';
    const tempPassword = roleToAssign === 'Admin' ? 'Admin@2026!' : 'Owner@2026!';

    this.inquiryService.approveInquiry(inq.id, roleToAssign, tempPassword).subscribe({
      next: (res) => {
        this.adminSuccessMessage.set(`Successfully approved inquiry ${inq.id} and dispatched ${roleToAssign} credentials email to ${inq.email}!`);
        setTimeout(() => this.adminSuccessMessage.set(null), 7000);
        this.loadAll();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to approve inquiry and dispatch email.');
      }
    });
  }

  prefillAndOpenOwnerModal(inq: ClientInquiry): void {
    this.approveAndDispatch(inq);
  }
}
