import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="navbar-header" *ngIf="authService.isAuthenticated()">
      <div class="navbar-container">
        <div class="navbar-brand">
          <div class="brand-shield">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span class="brand-title">TrustVault</span>
          <span class="env-badge">SECURE</span>
        </div>

        <nav class="navbar-nav">
          <div class="user-chip" *ngIf="authService.currentUser() as user">
            <div class="avatar-circle">
              {{ user.username.charAt(0).toUpperCase() }}
            </div>
            <div class="user-meta">
              <span class="user-name">{{ user.username }}</span>
              <span class="user-dept" *ngIf="user.department">{{ user.department }}</span>
            </div>
            <span class="role-pill" [ngClass]="user.role.toLowerCase()">
              {{ user.role }}
            </span>
          </div>

          <button class="btn-logout" (click)="onLogout()" title="Terminate secure session">
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
  `,
  styles: [`
    .navbar-header {
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
    .brand-shield {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px rgba(37, 99, 235, 0.4);
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #f8fafc;
    }
    .env-badge {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
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
      background: rgba(30, 41, 59, 0.7);
      padding: 0.35rem 0.85rem 0.35rem 0.5rem;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .avatar-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #3b82f6;
      color: white;
      font-weight: 600;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }
    .user-name {
      font-size: 0.825rem;
      font-weight: 600;
      color: #e2e8f0;
    }
    .user-dept {
      font-size: 0.7rem;
      color: #94a3b8;
    }
    .role-pill {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .role-pill.admin {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .role-pill.owner {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .role-pill.viewer {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .btn-logout {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: transparent;
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 0.45rem 0.85rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-logout:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.5);
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);

  onLogout(): void {
    this.authService.logout();
  }
}
