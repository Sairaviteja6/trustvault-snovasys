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
        <div class="navbar-brand" routerLink="/" style="cursor: pointer;">
          <img src="/images/trustvault-monogram.png" alt="TrustVault" class="brand-logo-img" />
          <span class="brand-title">TrustVault</span>
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
  `,
  styles: [`
    .navbar-header {
      background: rgba(255, 255, 255, 0.90);
      backdrop-filter: blur(20px) saturate(140%);
      -webkit-backdrop-filter: blur(20px) saturate(140%);
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
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
      height: 34px;
      width: 34px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid rgba(15, 23, 42, 0.12);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .env-badge {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
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
      background: #f1f5f9;
      padding: 0.35rem 0.85rem 0.35rem 0.5rem;
      border-radius: 9999px;
      border: 1px solid rgba(15, 23, 42, 0.1);
      transition: all 0.2s ease;
    }
    .user-chip:hover {
      background: #e2e8f0;
      border-color: rgba(15, 23, 42, 0.2);
    }
    .avatar-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--brand-gradient, linear-gradient(135deg, #2285AC, #31957B));
      color: #ffffff;
      font-weight: 700;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(34, 133, 172, 0.35);
    }
    .user-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }
    .user-name {
      font-size: 0.825rem;
      font-weight: 700;
      color: #0f172a;
    }
    .user-dept {
      font-size: 0.7rem;
      color: #64748b;
    }
    .btn-logout {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 0.45rem 0.85rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn-logout:hover {
      background: #fee2e2;
      border-color: #f87171;
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(220, 38, 38, 0.15);
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);

  onLogout(): void {
    this.authService.logout();
  }
}
