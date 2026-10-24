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
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
            <span class="badge" [ngClass]="isMasterAdmin() ? 'badge-danger' : 'badge-info'">
              {{ isMasterAdmin() ? 'Root Master Admin' : 'Secondary Administrator' }}
            </span>
          </div>
          <h1 class="section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffd166" stroke-width="2.2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Workspace Administration
          </h1>
          <p class="section-subtitle">
            User governance, telemetry metrics, and immutable cryptographic audit explorer.
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

          <!-- Master Admin Exclusive Action: Provision Secondary Admin -->
          <button 
            *ngIf="isMasterAdmin()" 
            class="btn btn-secondary btn-sm" 
            (click)="showNewAdminModal.set(true)"
            title="Create a secondary administrator with restricted privileges"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Provision Secondary Admin</span>
          </button>

          <!-- Provision Document Owner (Available for all Admins) -->
          <button 
            class="btn btn-primary btn-sm" 
            (click)="showNewOwnerModal.set(true)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Provision Document Owner</span>
          </button>
        </div>
      </div>

      <!-- Secondary Admin Information Notice -->
      <div class="alert alert-info" *ngIf="!isMasterAdmin()" style="margin-top: 0.5rem;">
        <strong>Secondary Administrator Mode:</strong> You have scoped governance rights. Your view displays audit logs and users specifically tied to yourself and your provisioned document owners.
      </div>

      <!-- Success Notification Alert -->
      <div class="alert alert-success" *ngIf="adminSuccessMessage()">
        {{ adminSuccessMessage() }}
      </div>

      <!-- Reference Stat Metric Cards (4 Columns) -->
      <div class="stat-card-grid" *ngIf="displayedMetrics as m">
        <!-- Card 1: Client Inquiries -->
        <div class="stat-box">
          <div class="stat-box-top">
            <span class="stat-box-title">Client Inquiries</span>
            <div class="stat-box-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
          </div>
          <div class="stat-box-metric">
            {{ pendingInquiriesCount }} 
            <span class="stat-box-subval">/ {{ inquiryService.inquiries().length }} total</span>
          </div>
          <div class="stat-box-desc">Awaiting cryptographic review &amp; provisioning</div>
          <div class="stat-box-footer">
            <span class="stat-box-link" (click)="activeAdminTab.set('inquiries')">Review Inquiries &rsaquo;</span>
            <span class="stat-box-pill" [ngClass]="pendingInquiriesCount ? 'pill-success' : ''">
              {{ pendingInquiriesCount }} Pending
            </span>
          </div>
        </div>

        <!-- Card 2: Active Document Owners -->
        <div class="stat-box">
          <div class="stat-box-top">
            <span class="stat-box-title">Active Owners</span>
            <div class="stat-box-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </div>
          </div>
          <div class="stat-box-metric">
            {{ m.totalActiveOwners }} <span class="stat-box-subval">authorized</span>
          </div>
          <div class="stat-box-desc">Authorized to upload &amp; grant discrete access</div>
          <div class="stat-box-footer">
            <span class="stat-box-link" (click)="showNewOwnerModal.set(true)">+ Provision Owner &rsaquo;</span>
            <span class="stat-box-pill pill-success">Enrolled</span>
          </div>
        </div>

        <!-- Card 3: Active Viewers -->
        <div class="stat-box">
          <div class="stat-box-top">
            <span class="stat-box-title">Active Viewers</span>
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
            {{ m.totalActiveViewers }} <span class="stat-box-subval">assigned seats</span>
          </div>
          <div class="stat-box-desc">Hardware token &amp; IAM enrolled accounts</div>
          <div class="stat-box-footer">
            <span class="stat-box-link" (click)="activeAdminTab.set('users')">View Directory &rsaquo;</span>
            <span class="stat-box-pill">{{ users().length }} total</span>
          </div>
        </div>

        <!-- Card 4: Cryptographic Vault -->
        <div class="stat-box">
          <div class="stat-box-top">
            <span class="stat-box-title">Cryptographic Vault</span>
            <div class="stat-box-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          </div>
          <div class="stat-box-metric">
            {{ m.totalDocuments }} <span class="stat-box-subval">AES-256 files</span>
          </div>
          <div class="stat-box-desc">Chain Invariants &amp; IDOR checks enforced</div>
          <div class="stat-box-footer">
            <span class="stat-box-link" (click)="activeAdminTab.set('integrity')">Verify Integrity &rsaquo;</span>
            <span class="stat-box-pill pill-success">Tamper-Proof</span>
          </div>
        </div>
      </div>

      <!-- Segmented Navigation Pills Bar (Matching Reference Image) -->
      <div class="segmented-nav-wrapper">
        <div class="segmented-nav">
          <button class="segmented-tab" [class.active]="activeAdminTab() === 'inquiries'" (click)="activeAdminTab.set('inquiries')">
            <span>Client Inquiries {{ pendingInquiriesCount ? '(' + pendingInquiriesCount + ')' : '' }}</span>
          </button>
          <button class="segmented-tab" [class.active]="activeAdminTab() === 'users'" (click)="activeAdminTab.set('users')">
            <span>User Directory ({{ users().length }})</span>
          </button>
          <button class="segmented-tab" [class.active]="activeAdminTab() === 'audit'" (click)="activeAdminTab.set('audit')">
            <span class="live-dot" *ngIf="activeAdminTab() === 'audit'"></span>
            <span>Audit Explorer</span>
          </button>
          <button class="segmented-tab" [class.active]="activeAdminTab() === 'integrity'" (click)="activeAdminTab.set('integrity')">
            <span>Chain Integrity</span>
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

      <!-- TAB 2: User Accounts Governance Table -->
      <div *ngIf="activeAdminTab() === 'users'" class="content-box-card">
        <div class="section-header">
          <div>
            <h2 class="card-title">User Accounts Governance</h2>
            <p class="section-subtitle">Provisioned identities, organizations, roles, authority levels, and access statuses</p>
          </div>
        </div>

        <!-- Master Admin Multi-Tenant Organization Switcher -->
        <div *ngIf="isMasterAdmin() && organizationList.length > 0" class="org-filter-container">
          <div class="org-filter-header">
            <span class="org-filter-title">Enterprise Organizations &amp; Tenants</span>
            <span class="org-filter-sub">Select an enterprise organization to inspect its dedicated personnel or filter system audit logs</span>
          </div>
          <div class="org-chips-row">
            <button 
              class="org-chip" 
              [class.active]="selectedOrganization() === null" 
              (click)="selectOrganization(null)"
            >
              <span>All Organizations ({{ users().length }})</span>
            </button>
            <button 
              *ngFor="let org of organizationList" 
              class="org-chip" 
              [class.active]="selectedOrganization() === org.name" 
              (click)="selectOrganization(org.name)"
            >
              <span>🏢 {{ org.name }}</span>
              <span class="org-chip-badge">{{ org.count }}</span>
            </button>
          </div>

          <div *ngIf="selectedOrganization()" class="selected-org-banner">
            <div>
              <span>Viewing personnel for: <strong>{{ selectedOrganization() }}</strong> ({{ displayedUsers.length }} users)</span>
            </div>
            <button class="btn btn-sm btn-outline-info" (click)="filterAuditForOrg(selectedOrganization()!)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Filter Audit Logs for {{ selectedOrganization() }} &rsaquo;</span>
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email Address</th>
                <th>Organization</th>
                <th>Role &amp; Privilege Level</th>
                <th>Department</th>
                <th>Status</th>
                <th>Provisioned Date</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of displayedUsers">
                <td style="font-weight: 600;">{{ u.username }}</td>
                <td class="font-mono">{{ u.email }}</td>
                <td>
                  <span class="badge badge-info" style="font-size: 0.72rem;">
                    {{ u.organization || u.department || 'Corporate Vault' }}
                  </span>
                </td>
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
                  <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;">
                    <button 
                      *ngIf="canToggleUser(u)"
                      class="btn btn-sm" 
                      [ngClass]="u.isActive ? 'btn-secondary' : 'btn-success'"
                      (click)="onToggleStatus(u.id)"
                    >
                      {{ u.isActive ? 'Deactivate' : 'Activate' }}
                    </button>
                    <button 
                      *ngIf="canDeleteUser(u)"
                      class="btn btn-sm btn-outline-danger" 
                      (click)="onDeleteUser(u)"
                      title="Permanently remove user account from system"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      <span>Remove</span>
                    </button>
                    <span *ngIf="!canToggleUser(u) && !canDeleteUser(u)" style="font-size: 0.75rem; color: var(--text-muted);">
                      {{ u.isMasterAdmin ? 'Master Protected' : 'Restricted' }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 1: Enterprise Client Onboarding Inquiries -->
      <div *ngIf="activeAdminTab() === 'inquiries'" class="content-box-card">
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
                  <div style="font-weight: 700; color: #ffffff;">{{ inq.organization }}</div>
                  <div style="font-size: 0.775rem; color: var(--text-muted);">{{ inq.fullName }} ({{ inq.department || 'General' }})</div>
                </td>
                <td class="font-mono">{{ inq.email }}</td>
                <td>
                  <span class="badge" [ngClass]="inq.requestedRole === 'Admin' ? 'badge-danger' : 'badge-info'">
                    {{ inq.requestedRole || 'Owner' }}
                  </span>
                </td>
                <td><span style="font-size: 0.8rem; color: #cbd5e1;">{{ inq.useCase }}</span></td>
                <td>{{ inq.createdAt | date:'short' }}</td>
                <td>
                  <span class="badge" [ngClass]="inq.status === 'Approved' ? 'badge-success' : (inq.status === 'Rejected' ? 'badge-danger' : 'badge-warning')">
                    {{ inq.status }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div *ngIf="isMasterAdmin() && inq.status === 'Pending'" style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;">
                    <button 
                      class="btn btn-sm btn-primary"
                      (click)="approveAndDispatch(inq)"
                      title="Approve organization request and dispatch security credentials email"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Approve</span>
                    </button>
                    <button 
                      class="btn btn-sm btn-outline-danger"
                      (click)="onRejectInquiry(inq)"
                      title="Reject inquiry and dispatch compliance notification email"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      <span>Disagree</span>
                    </button>
                  </div>
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
                  <div *ngIf="inq.status === 'Rejected'" style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;">
                    <span style="font-size: 0.8rem; color: #f87171; font-weight: 700;">
                      ✗ Rejected (Notice Sent)
                    </span>
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

      <!-- TAB 3: System-Wide Audit Trail -->
      <div *ngIf="activeAdminTab() === 'audit'" class="content-box-card">
        <div class="section-header" style="flex-direction: column; align-items: flex-start; gap: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <h2 class="card-title" style="margin-bottom: 0;">System-Wide Audit Trail</h2>
                <span class="badge badge-success" style="font-size: 0.65rem;">
                  <span class="live-dot" style="width: 5px; height: 5px;"></span> LIVE
                </span>
                <span class="badge badge-info">{{ timePresetLabel() }}</span>
              </div>
              <p class="section-subtitle" style="margin-bottom: 0;">
                Immutable append-only records of all security events and access attempts
              </p>
            </div>

            <!-- Download Statement / Export Button -->
            <button 
              class="btn btn-sm btn-primary" 
              (click)="onExportAuditStatement()"
              title="Download verified audit logs statement as CSV document"
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

          <!-- Time Period Presets & Search Filters -->
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 0.75rem;">
            <!-- Time Presets Bar -->
            <div class="time-presets-bar">
              <button 
                class="preset-chip" 
                [class.active]="timePreset() === 'today'" 
                (click)="setTimePreset('today')"
              >
                Today (Live)
              </button>
              <button 
                class="preset-chip" 
                [class.active]="timePreset() === 'yesterday'" 
                (click)="setTimePreset('yesterday')"
              >
                Yesterday
              </button>
              <button 
                class="preset-chip" 
                [class.active]="timePreset() === '7days'" 
                (click)="setTimePreset('7days')"
              >
                Last 7 Days
              </button>
              <button 
                class="preset-chip" 
                [class.active]="timePreset() === '30days'" 
                (click)="setTimePreset('30days')"
              >
                Last 30 Days
              </button>
              <button 
                class="preset-chip" 
                [class.active]="timePreset() === 'custom'" 
                (click)="setTimePreset('custom')"
              >
                Custom Range
              </button>
              <button 
                class="preset-chip" 
                [class.active]="timePreset() === 'all'" 
                (click)="setTimePreset('all')"
              >
                All Time
              </button>
            </div>

            <!-- Filters Bar -->
            <div class="filters-bar">
              <input 
                type="text" 
                class="form-input" 
                style="width: 200px;" 
                placeholder="Filter by email or keyword..." 
                [(ngModel)]="searchQuery" 
                (keyup.enter)="loadAuditLogs()"
              />
              <select class="form-select" style="width: 130px;" [(ngModel)]="statusFilter" (change)="loadAuditLogs()">
                <option value="">All Statuses</option>
                <option value="Allowed">Allowed</option>
                <option value="Refused">Refused</option>
              </select>
              <select *ngIf="isMasterAdmin()" class="form-select" style="width: 170px;" [(ngModel)]="selectedOrgFilter" (change)="loadAuditLogs()" title="Filter audit trail by organization">
                <option value="">All Organizations</option>
                <option *ngFor="let org of organizationList" [value]="org.name">{{ org.name }}</option>
              </select>
              <button class="btn btn-secondary btn-sm" (click)="loadAuditLogs()">Filter</button>
            </div>
          </div>

          <!-- Custom Date Range Inputs (Shown when 'custom' preset is active) -->
          <div *ngIf="timePreset() === 'custom'" class="custom-range-row">
            <span style="font-size: 0.8rem; font-weight: 600; color: #475569;">Select Time Interval:</span>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label style="font-size: 0.75rem; color: #64748b;">From:</label>
              <input type="date" class="form-input" style="width: 150px; padding: 0.3rem 0.5rem;" [(ngModel)]="fromDate" (change)="loadAuditLogs()" />
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label style="font-size: 0.75rem; color: #64748b;">To:</label>
              <input type="date" class="form-input" style="width: 150px; padding: 0.3rem 0.5rem;" [(ngModel)]="toDate" (change)="loadAuditLogs()" />
            </div>
            <button class="btn btn-sm btn-primary" (click)="loadAuditLogs()">Apply Range</button>
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

      <!-- TAB 4: Cryptographic Chain Integrity & Invariants -->
      <div *ngIf="activeAdminTab() === 'integrity'" class="content-box-card">
        <div class="verification-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
          <div>
            <h2 class="verification-title" style="display: flex; align-items: center; gap: 0.6rem; font-size: 1.2rem; font-weight: 700; color: #212529;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#18937A" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Cryptographic Audit Trail Integrity
            </h2>
            <p class="verification-subtitle" style="font-size: 0.825rem; color: #64748b; margin-top: 0.25rem;">
              Calculates cumulative SHA-256 hash chains across SQL Server records to prove zero alteration or row deletions.
            </p>
          </div>
          <button class="btn btn-success btn-sm" (click)="onVerifyChain()" [disabled]="isVerifying()">
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

        <div *ngIf="!verificationResult()" style="text-align: center; padding: 2.5rem 1rem; color: #64748b;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.75" style="margin-bottom: 0.75rem;">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <div style="font-weight: 600; color: #212529;">Audit Trail Ledger Ready for Invariant Verification</div>
          <p style="font-size: 0.825rem; max-width: 480px; margin: 0.4rem auto 1rem;">
            Click the "Verify Chain Integrity" button above to execute SHA-256 forward verification across all immutable audit trail hashes.
          </p>
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
            <div class="form-input font-mono" style="background: rgba(45, 18, 8, 0.65); color: #ffffff; border: 1px solid rgba(176, 127, 2, 0.40);">
              {{ inq.fullName }} &bull; {{ inq.organization }} ({{ inq.department || 'General' }})
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Corporate Email Address (Destination)</label>
            <div class="form-input font-mono" style="background: rgba(45, 18, 8, 0.65); color: #ffffff; border: 1px solid rgba(176, 127, 2, 0.40);">
              {{ inq.email }}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Assigned Role</label>
            <div class="form-input font-mono" style="background: rgba(45, 18, 8, 0.65); color: #ffd166; font-weight: 700; border: 1px solid rgba(176, 127, 2, 0.40);">
              {{ inq.requestedRole || 'Owner' }}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Provisioned Username</label>
            <div class="form-input font-mono" style="background: rgba(45, 18, 8, 0.65); color: #ffffff; font-weight: 700; border: 1px solid rgba(176, 127, 2, 0.40);">
              {{ inq.email.split('@')[0] }}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Temporary Security Password</label>
            <div class="form-input font-mono" style="background: rgba(45, 18, 8, 0.65); color: #ffd166; font-weight: 800; border: 1px solid rgba(176, 127, 2, 0.40);">
              {{ inq.requestedRole === 'Admin' ? 'Admin@2026!' : 'Owner@2026!' }}
            </div>
          </div>

          <div style="margin-top: 1rem; padding: 0.85rem; background: rgba(45, 18, 8, 0.55); border: 1px solid rgba(176, 127, 2, 0.35); border-radius: 8px; font-size: 0.8rem; color: rgba(255, 255, 255, 0.90); line-height: 1.5;">
            <strong>Email Dispatch Status:</strong> An HTML credentials notification email has been rendered and dispatched. The recipient can use the Sign In link to create their new permanent password.
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
export class AdminDashboardComponent implements OnInit {
  private auditService = inject(AuditService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  readonly inquiryService = inject(InquiryService);

  readonly isMasterAdmin = this.authService.isMasterAdmin;

  activeAdminTab = signal<'inquiries' | 'users' | 'audit' | 'integrity'>('inquiries');

  get pendingInquiriesCount(): number {
    return this.inquiryService.inquiries().filter(i => i.status !== 'Approved').length;
  }
  metrics = signal<AdminMetricsResponse | null>(null);

  get displayedMetrics(): AdminMetricsResponse {
    return this.metrics() || {
      totalActiveOwners: this.users().filter(u => u.role === 'Owner').length,
      totalActiveViewers: this.users().filter(u => u.role === 'Viewer').length,
      totalDocuments: 0,
      totalAuditLogs: this.auditLogs().length,
      totalRefusedAttempts: 0,
      recentRefusedAttempts: []
    };
  }
  users = signal<UserDto[]>([]);
  auditLogs = signal<AuditLogDto[]>([]);
  verificationResult = signal<AuditVerificationResult | null>(null);
  isVerifying = signal(false);

  searchQuery = '';
  statusFilter = '';
  selectedOrgFilter = '';
  selectedOrganization = signal<string | null>(null);

  get organizationList(): { name: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const u of this.users()) {
      const org = u.organization?.trim() || u.department?.trim() || 'Corporate Vault';
      counts.set(org, (counts.get(org) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  get displayedUsers(): UserDto[] {
    const selected = this.selectedOrganization();
    if (!selected) return this.users();
    return this.users().filter(u => (u.organization?.trim() || u.department?.trim() || 'Corporate Vault') === selected);
  }

  selectOrganization(org: string | null): void {
    this.selectedOrganization.set(org);
  }

  filterAuditForOrg(org: string): void {
    this.selectedOrgFilter = org;
    this.activeAdminTab.set('audit');
    this.loadAuditLogs();
  }

  // Time preset state
  timePreset = signal<'today' | 'yesterday' | '7days' | '30days' | 'custom' | 'all'>('today');
  fromDate = '';
  toDate = '';

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

  setTimePreset(preset: 'today' | 'yesterday' | '7days' | '30days' | 'custom' | 'all'): void {
    this.timePreset.set(preset);
    this.loadAuditLogs();
  }

  timePresetLabel(): string {
    switch (this.timePreset()) {
      case 'today': return "Today's Live Records";
      case 'yesterday': return "Yesterday's Records";
      case '7days': return "Past 7 Days";
      case '30days': return "Past 30 Days";
      case 'custom': return "Custom Range Filtered";
      case 'all': return "Complete Unbounded Log";
    }
  }

  loadAuditLogs(): void {
    this.auditService.getAdminAuditLogs({
      search: this.searchQuery || undefined,
      status: this.statusFilter || undefined,
      organization: this.selectedOrgFilter || undefined,
      preset: this.timePreset(),
      fromDate: this.timePreset() === 'custom' && this.fromDate ? this.fromDate : undefined,
      toDate: this.timePreset() === 'custom' && this.toDate ? this.toDate : undefined,
      page: 1,
      pageSize: 50
    }).subscribe(res => {
      this.auditLogs.set(res.items);
    });
  }

  onExportAuditStatement(): void {
    this.auditService.exportAdminAuditLogs({
      search: this.searchQuery || undefined,
      status: this.statusFilter || undefined,
      organization: this.selectedOrgFilter || undefined,
      preset: this.timePreset(),
      fromDate: this.timePreset() === 'custom' && this.fromDate ? this.fromDate : undefined,
      toDate: this.timePreset() === 'custom' && this.toDate ? this.toDate : undefined
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trustvault-audit-statement-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('Could not download audit statement from server.');
      }
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

  canDeleteUser(targetUser: UserDto): boolean {
    if (!this.isMasterAdmin()) return false;
    if (targetUser.isMasterAdmin) return false;
    return true;
  }

  onDeleteUser(user: UserDto): void {
    if (!this.isMasterAdmin()) return;
    const confirmed = window.confirm(`Permanently delete account for '${user.username}' (${user.email})?\n\nThis will remove the identity, revoke all access grants, delete user security tags, and log an immutable audit event.`);
    if (!confirmed) return;

    this.userService.deleteAdminUser(user.id).subscribe({
      next: (res) => {
        this.adminSuccessMessage.set(res.message || `Account for '${user.username}' was permanently removed.`);
        setTimeout(() => this.adminSuccessMessage.set(null), 5000);
        this.loadAll();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to remove user account.');
      }
    });
  }

  onRejectInquiry(inq: ClientInquiry): void {
    const reason = window.prompt(
      `Enter compliance or security eligibility reason for rejecting inquiry from ${inq.fullName} (${inq.organization}):`,
      'Enterprise security requirement verification criteria not satisfied'
    );
    if (reason === null) return; // User cancelled

    this.inquiryService.rejectInquiry(inq.id, reason).subscribe({
      next: () => {
        this.adminSuccessMessage.set(`Client inquiry ${inq.id} rejected. Formal compliance notice email dispatched to ${inq.email}.`);
        setTimeout(() => this.adminSuccessMessage.set(null), 6000);
        this.loadAll();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to reject inquiry.');
      }
    });
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
        const createdEmail = this.newSubAdmin.email;
        const createdPass = this.newSubAdmin.password;
        this.newSubAdmin = { username: '', email: '', password: '', department: '' };
        this.adminSuccessMessage.set(`Secondary Administrator provisioned successfully! Credentials logged for ${createdEmail}. Temporary password: ${createdPass}`);
        setTimeout(() => this.adminSuccessMessage.set(null), 10000);
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
        const createdEmail = this.newOwner.email;
        const createdPass = this.newOwner.password;
        this.newOwner = { username: '', email: '', password: '', department: '' };
        this.adminSuccessMessage.set(`Document Owner provisioned successfully! Credentials logged for ${createdEmail}. Temporary password: ${createdPass}`);
        setTimeout(() => this.adminSuccessMessage.set(null), 10000);
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
        this.selectedCredentialsInquiry.set({
          ...inq,
          status: 'Approved'
        });
        setTimeout(() => this.adminSuccessMessage.set(null), 8000);
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
