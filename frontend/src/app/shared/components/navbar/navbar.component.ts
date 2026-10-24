import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <header class="navbar-header" *ngIf="authService.isAuthenticated()">
      <div class="navbar-container">
        <div class="navbar-brand" (click)="onBrandClick()" style="cursor: pointer;">
          <img src="/images/trustvault-monogram.png" alt="TrustVault" class="brand-logo-img" />
          <span class="brand-title">TrustVault</span>
        </div>

        <nav class="navbar-nav">
          <!-- Profile Trigger Chip (Upper Right Side) -->
          <div 
            class="user-chip" 
            *ngIf="authService.currentUser() as user" 
            (click)="openProfileModal()" 
            title="Manage Profile (Change Username or Password)"
          >
            <div class="avatar-circle">
              {{ user.username.charAt(0).toUpperCase() }}
            </div>
            <div class="user-meta">
              <span class="user-name">{{ user.username }}</span>
              <span class="user-dept">{{ user.role }} &bull; {{ user.department || 'Workspace' }}</span>
            </div>
            <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          <button class="btn-logout" (click)="onLogout()" title="Disconnect session">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Disconnect</span>
          </button>
        </nav>
      </div>
    </header>

    <!-- Profile & Security Settings Modal -->
    <div class="modal-overlay" *ngIf="showProfileModal()" (click)="closeProfileModal()">
      <div class="modal-card profile-modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="profile-modal-avatar">
              {{ authService.currentUser()?.username?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
            <div>
              <h3 class="modal-title" style="margin: 0; font-size: 1.1rem;">Account &amp; Security Profile</h3>
              <p style="margin: 0; font-size: 0.75rem; color: #64748b;">
                {{ authService.currentUser()?.email }} &bull; 
                <span class="badge" [ngClass]="getRoleBadgeClass(authService.currentUser()?.role)">
                  {{ authService.currentUser()?.role }}
                </span>
              </p>
            </div>
          </div>
          <button class="modal-close" (click)="closeProfileModal()">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Notification Alerts -->
          <div class="alert alert-success" *ngIf="profileSuccessMessage()">
            {{ profileSuccessMessage() }}
          </div>
          <div class="alert alert-danger" *ngIf="profileErrorMessage()">
            {{ profileErrorMessage() }}
          </div>

          <!-- Section 1: Change Username -->
          <div class="profile-section">
            <div class="profile-section-header">
              <div class="profile-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>Change Display Username</span>
              </div>
              <span style="font-size: 0.725rem; color: #64748b;">Visible across workspaces</span>
            </div>

            <div class="profile-form-row">
              <input 
                type="text" 
                class="form-input" 
                placeholder="New username (3-50 chars)" 
                [(ngModel)]="newUsernameInput"
                [disabled]="isUpdatingUsername()"
              />
              <button 
                class="btn btn-sm btn-primary" 
                (click)="onUpdateUsername()" 
                [disabled]="isUpdatingUsername() || !newUsernameInput || newUsernameInput === authService.currentUser()?.username"
              >
                <span *ngIf="!isUpdatingUsername()">Update Username</span>
                <span *ngIf="isUpdatingUsername()">Saving...</span>
              </button>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Section 2: Change Security Password -->
          <div class="profile-section">
            <div class="profile-section-header">
              <div class="profile-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Change Security Password</span>
              </div>
              <span style="font-size: 0.725rem; color: #64748b;">Re-encrypts credential hash</span>
            </div>

            <div class="form-group" style="margin-bottom: 0.75rem;">
              <label class="form-label" style="font-size: 0.775rem;">Current Password *</label>
              <input 
                type="password" 
                class="form-input" 
                placeholder="Enter current password" 
                [(ngModel)]="currentPasswordInput"
                [disabled]="isUpdatingPassword()"
              />
            </div>

            <div class="form-group" style="margin-bottom: 0.75rem;">
              <label class="form-label" style="font-size: 0.775rem;">New Password *</label>
              <input 
                type="password" 
                class="form-input" 
                placeholder="Min 8 characters" 
                [(ngModel)]="newPasswordInput"
                [disabled]="isUpdatingPassword()"
              />
            </div>

            <div class="form-group" style="margin-bottom: 0.75rem;">
              <label class="form-label" style="font-size: 0.775rem;">Confirm New Password *</label>
              <input 
                type="password" 
                class="form-input" 
                placeholder="Re-type new password" 
                [(ngModel)]="confirmPasswordInput"
                [disabled]="isUpdatingPassword()"
              />
            </div>

            <button 
              class="btn btn-sm btn-primary" 
              style="width: 100%; margin-top: 0.5rem;"
              (click)="onChangePassword()"
              [disabled]="isUpdatingPassword() || !currentPasswordInput || !newPasswordInput || !confirmPasswordInput"
            >
              <span *ngIf="!isUpdatingPassword()">Update Security Password</span>
              <span *ngIf="isUpdatingPassword()">Updating Password...</span>
            </button>
          </div>
        </div>

        <div class="modal-footer" style="justify-content: flex-end;">
          <button class="btn btn-sm btn-secondary" (click)="closeProfileModal()">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .navbar-header {
      background: rgba(85, 38, 18, 0.60);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border-bottom: 1px solid rgba(176, 127, 2, 0.35);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 16px rgba(176, 127, 2, 0.12);
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .navbar-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0.75rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .brand-logo-img {
      height: 36px;
      width: 36px;
      border-radius: 9px;
      object-fit: cover;
      border: 1px solid rgba(176, 127, 2, 0.45);
      box-shadow: 0 2px 10px rgba(176, 127, 2, 0.35);
    }
    .brand-title {
      font-size: 1.3rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
    }
    .env-badge {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      background: rgba(176, 127, 2, 0.25);
      color: #ffd166;
      border: 1px solid rgba(176, 127, 2, 0.5);
      padding: 2px 7px;
      border-radius: 6px;
    }
    .navbar-nav {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .user-chip {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(45, 18, 8, 0.75);
      padding: 0.35rem 0.95rem 0.35rem 0.55rem;
      border-radius: 9999px;
      border: 1px solid rgba(176, 127, 2, 0.35);
      cursor: pointer;
      user-select: none;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .user-chip:hover {
      background: rgba(85, 38, 18, 0.90);
      border-color: #ffd166;
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(176, 127, 2, 0.35);
    }
    .chevron-icon {
      color: #ffd166;
      transition: transform 0.2s ease;
    }
    .user-chip:hover .chevron-icon {
      color: #ffffff;
      transform: translateY(2px);
    }
    .avatar-circle {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: linear-gradient(90deg, #000000 0%, #3533cd 100%);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(176, 127, 2, 0.5);
      box-shadow: 0 2px 8px rgba(53, 51, 205, 0.45);
    }
    .user-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }
    .user-name {
      font-size: 0.825rem;
      font-weight: 700;
      color: #ffffff;
    }
    .user-dept {
      font-size: 0.7rem;
      color: #ffd166;
    }
    .btn-logout {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      background: rgba(220, 38, 38, 0.22);
      border: 1px solid rgba(239, 68, 68, 0.45);
      color: #fca5a5;
      padding: 0.45rem 0.95rem;
      border-radius: 9px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn-logout:hover {
      background: #dc2626;
      border-color: #ef4444;
      color: #ffffff;
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
    }
    .profile-modal-card {
      max-width: 520px;
      background: rgba(75, 32, 14, 0.96) !important;
      border: 1px solid rgba(176, 127, 2, 0.45) !important;
      color: #ffffff !important;
    }
    .profile-modal-avatar {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: linear-gradient(90deg, #000000 0%, #3533cd 100%);
      color: #ffffff;
      font-weight: 800;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #ffd166;
      box-shadow: 0 4px 16px rgba(53, 51, 205, 0.5);
      flex-shrink: 0;
    }
    .profile-section {
      background: rgba(45, 18, 8, 0.70);
      border: 1px solid rgba(176, 127, 2, 0.30);
      border-radius: 12px;
      padding: 1rem;
    }
    .profile-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .profile-section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 700;
      color: #ffffff;
    }
    .profile-form-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .profile-form-row .form-input {
      flex: 1;
    }
    .divider {
      height: 1px;
      background: rgba(176, 127, 2, 0.20);
      margin: 1.25rem 0;
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);

  showProfileModal = signal(false);
  isUpdatingUsername = signal(false);
  isUpdatingPassword = signal(false);
  profileSuccessMessage = signal<string | null>(null);
  profileErrorMessage = signal<string | null>(null);

  newUsernameInput = '';
  currentPasswordInput = '';
  newPasswordInput = '';
  confirmPasswordInput = '';

  onBrandClick(): void {
    const role = this.authService.userRole();
    if (role) {
      this.authService.redirectByRole(role);
    }
  }

  onLogout(): void {
    this.authService.logout();
  }

  openProfileModal(): void {
    const user = this.authService.currentUser();
    this.newUsernameInput = user?.username || '';
    this.currentPasswordInput = '';
    this.newPasswordInput = '';
    this.confirmPasswordInput = '';
    this.profileSuccessMessage.set(null);
    this.profileErrorMessage.set(null);
    this.showProfileModal.set(true);
  }

  closeProfileModal(): void {
    this.showProfileModal.set(false);
    this.profileSuccessMessage.set(null);
    this.profileErrorMessage.set(null);
  }

  getRoleBadgeClass(role?: string): string {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'badge-danger';
      case 'owner':
        return 'badge-warning';
      case 'viewer':
        return 'badge-info';
      default:
        return 'badge-info';
    }
  }

  onUpdateUsername(): void {
    const trimmed = this.newUsernameInput.trim();
    if (!trimmed) {
      this.profileErrorMessage.set('Username cannot be empty.');
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 50) {
      this.profileErrorMessage.set('Username must be between 3 and 50 characters.');
      return;
    }

    this.profileErrorMessage.set(null);
    this.profileSuccessMessage.set(null);
    this.isUpdatingUsername.set(true);

    this.authService.updateUsername(trimmed).subscribe({
      next: (res) => {
        this.isUpdatingUsername.set(false);
        this.profileSuccessMessage.set(`Username successfully updated to "${res.username}".`);
        this.newUsernameInput = res.username;
      },
      error: (err) => {
        this.isUpdatingUsername.set(false);
        this.profileErrorMessage.set(err.error?.message || 'Failed to update username. Please try again.');
      }
    });
  }

  onChangePassword(): void {
    if (!this.currentPasswordInput) {
      this.profileErrorMessage.set('Please provide your current password.');
      return;
    }
    if (!this.newPasswordInput || this.newPasswordInput.length < 8) {
      this.profileErrorMessage.set('New password must be at least 8 characters long.');
      return;
    }
    if (this.newPasswordInput !== this.confirmPasswordInput) {
      this.profileErrorMessage.set('New password and confirmation do not match.');
      return;
    }

    this.profileErrorMessage.set(null);
    this.profileSuccessMessage.set(null);
    this.isUpdatingPassword.set(true);

    this.authService.changePassword(this.currentPasswordInput, this.newPasswordInput).subscribe({
      next: (res) => {
        this.isUpdatingPassword.set(false);
        this.profileSuccessMessage.set(res.message || 'Password successfully updated.');
        this.currentPasswordInput = '';
        this.newPasswordInput = '';
        this.confirmPasswordInput = '';
      },
      error: (err) => {
        this.isUpdatingPassword.set(false);
        this.profileErrorMessage.set(err.error?.message || 'Failed to update password. Please check your current password.');
      }
    });
  }
}
