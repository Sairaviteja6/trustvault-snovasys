import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <a routerLink="/" title="Return to TrustVault Home" style="display: inline-block; text-decoration: none;">
            <img src="/images/trustvault-monogram.png" alt="TrustVault Logo" class="login-logo-img" />
          </a>
          <h1 class="login-title">TrustVault</h1>
          <p class="login-subtitle">Zero-Trust Cryptographic Document Platform</p>
          <a routerLink="/" class="back-home-link">← Return to Home</a>
        </div>

        <div class="alert alert-danger" *ngIf="errorMessage()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{{ errorMessage() }}</span>
        </div>

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label class="form-label" for="email">Corporate Identity (Email)</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              class="form-input" 
              placeholder="e.g. admin@trustvault.com" 
              [(ngModel)]="email" 
              required 
              autocomplete="email"
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Security Credential (Password)</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              class="form-input" 
              placeholder="••••••••••••" 
              [(ngModel)]="password" 
              required 
              autocomplete="current-password"
              [disabled]="isLoading()"
            />
          </div>

          <button 
            type="submit" 
            class="btn btn-primary btn-block" 
            [disabled]="isLoading() || !email || !password"
          >
            <span *ngIf="!isLoading()">Authenticate Session</span>
            <span *ngIf="isLoading()" class="spinner-text">
              <span class="spinner"></span> Verifying Invariants...
            </span>
          </button>
        </form>

        <div class="info-box">
          <div class="info-title">Hierarchical Provisioning Architecture</div>
          <p class="info-desc">
            The root <strong>Administrator</strong> provisions <strong>Document Owners</strong>.
            Authorized <strong>Owners</strong> in turn provision and grant discrete access to <strong>Viewers</strong>.
          </p>
        </div>

        <div class="security-footer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>End-to-End AES-256-GCM Encrypted &amp; SHA-256 Hash Chained</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: transparent;
    }
    .login-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(24px) saturate(160%);
      -webkit-backdrop-filter: blur(24px) saturate(160%);
      border: 1px solid rgba(34, 133, 172, 0.18);
      border-radius: 20px;
      padding: 2.5rem;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 15px 35px -5px rgba(41, 42, 46, 0.10);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .login-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 25px 50px -10px rgba(34, 133, 172, 0.18);
      border-color: rgba(49, 149, 123, 0.40);
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .login-logo-img {
      height: 52px;
      width: 52px;
      border-radius: 12px;
      object-fit: cover;
      margin-bottom: 0.75rem;
      border: 1px solid rgba(34, 133, 172, 0.20);
      box-shadow: 0 4px 14px rgba(34, 133, 172, 0.25);
      transition: transform 0.25s ease;
    }
    .login-logo-img:hover {
      transform: scale(1.06);
    }
    .login-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #292A2E;
      letter-spacing: -0.03em;
    }
    .login-subtitle {
      font-size: 0.825rem;
      color: #475569;
      margin-top: 0.25rem;
    }
    .back-home-link {
      display: inline-block;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #2285AC;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.15s;
    }
    .back-home-link:hover {
      color: #31957B;
      text-decoration: underline;
    }
    .btn-block {
      width: 100%;
      padding: 0.75rem;
      font-size: 0.95rem;
      margin-top: 0.5rem;
    }
    .spinner-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .info-box {
      margin-top: 1.75rem;
      padding: 1rem;
      background: #f8fafc;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 10px;
    }
    .info-title {
      font-size: 0.775rem;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.25rem;
    }
    .info-desc {
      font-size: 0.75rem;
      color: #475569;
      line-height: 1.4;
    }
    .info-desc strong {
      color: #0f172a;
    }
    .security-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-size: 0.7rem;
      color: #64748b;
      margin-top: 1.5rem;
      text-align: center;
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (!this.email || !this.password) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 0) {
          this.errorMessage.set('Cannot reach TrustVault API at http://localhost:5000. Please ensure the backend is running.');
        } else {
          const serverMsg = err.error?.message || err.error?.error;
          this.errorMessage.set(serverMsg || 'Authentication failed. Please verify your credentials.');
        }
      }
    });
  }
}
