import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
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

        <!-- Standard Login Mode -->
        <form *ngIf="!isSetPasswordMode()" (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label class="form-label" for="email">Corporate Identity (Email)</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              class="form-input" 
              placeholder="e.g. employee@organization.com" 
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

        <!-- First-Time Onboarding / Set Permanent Password Mode -->
        <form *ngIf="isSetPasswordMode()" (ngSubmit)="onSetPasswordSubmit()">
          <div class="alert alert-info" style="font-size: 0.8rem; margin-bottom: 1rem;">
            <strong>Account Setup:</strong> Please set your permanent security password to activate your personal workspace.
          </div>

          <div class="form-group">
            <label class="form-label" for="setEmail">Account Email</label>
            <input 
              id="setEmail" 
              name="setEmail" 
              type="email" 
              class="form-input" 
              placeholder="e.g. user@company.com" 
              [(ngModel)]="email" 
              required 
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="tempPassword">Temporary Access Code</label>
            <input 
              id="tempPassword" 
              name="tempPassword" 
              type="password" 
              class="form-input" 
              placeholder="Temporary code from email" 
              [(ngModel)]="password" 
              required 
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="newPassword">New Permanent Password</label>
            <input 
              id="newPassword" 
              name="newPassword" 
              type="password" 
              class="form-input" 
              placeholder="Min 8 characters" 
              [(ngModel)]="newPassword" 
              required 
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="confirmPassword">Confirm New Password</label>
            <input 
              id="confirmPassword" 
              name="confirmPassword" 
              type="password" 
              class="form-input" 
              placeholder="Re-type new password" 
              [(ngModel)]="confirmPassword" 
              required 
              [disabled]="isLoading()"
            />
          </div>

          <button 
            type="submit" 
            class="btn btn-primary btn-block" 
            [disabled]="isLoading() || !email || !password || !newPassword || !confirmPassword"
          >
            <span *ngIf="!isLoading()">Establish Permanent Password &rarr;</span>
            <span *ngIf="isLoading()" class="spinner-text">
              <span class="spinner"></span> Encrypting Credentials...
            </span>
          </button>

          <div style="text-align: center; margin-top: 1rem;">
            <a href="javascript:void(0)" (click)="isSetPasswordMode.set(false)" style="font-size: 0.8rem; color: #64748b; text-decoration: none;">
              &larr; Return to Standard Sign In
            </a>
          </div>
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
      background: radial-gradient(ellipse at 50% 30%, rgba(31, 115, 183, 0.15) 0%, rgba(11, 15, 25, 0.95) 70%);
      position: relative;
    }
    .login-card {
      background: rgba(17, 24, 39, 0.85);
      backdrop-filter: blur(24px) saturate(160%);
      -webkit-backdrop-filter: blur(24px) saturate(160%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 2.5rem;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(31, 115, 183, 0.18);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .login-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 30px 70px -10px rgba(0, 0, 0, 0.7), 0 0 50px rgba(24, 147, 122, 0.25);
      border-color: rgba(56, 189, 248, 0.35);
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
      border: 1px solid rgba(255, 255, 255, 0.20);
      box-shadow: 0 4px 18px rgba(31, 115, 183, 0.4);
      transition: transform 0.25s ease;
    }
    .login-logo-img:hover {
      transform: scale(1.06);
    }
    .login-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.03em;
    }
    .login-subtitle {
      font-size: 0.825rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }
    .back-home-link {
      display: inline-block;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.15s;
    }
    .back-home-link:hover {
      color: #34d399;
      text-decoration: underline;
    }
    .form-label {
      color: #cbd5e1;
      font-size: 0.82rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
      display: block;
    }
    .form-input {
      background: rgba(15, 23, 42, 0.7) !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
      color: #ffffff !important;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      width: 100%;
      box-sizing: border-box;
      transition: all 0.2s;
    }
    .form-input:focus {
      outline: none;
      border-color: #38bdf8 !important;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2) !important;
    }
    .btn-block {
      width: 100%;
      padding: 0.8rem;
      font-size: 0.95rem;
      margin-top: 0.5rem;
      background: linear-gradient(135deg, #1F73B7 0%, #18937A 100%);
      border: none;
      border-radius: 10px;
      color: #ffffff;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(31, 115, 183, 0.35);
      transition: all 0.2s ease;
    }
    .btn-block:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 12px 28px rgba(24, 147, 122, 0.45);
    }
    .btn-block:disabled {
      opacity: 0.55;
      cursor: not-allowed;
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
      background: rgba(30, 41, 59, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
    }
    .info-title {
      font-size: 0.775rem;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.25rem;
    }
    .info-desc {
      font-size: 0.75rem;
      color: #94a3b8;
      line-height: 1.45;
    }
    .info-desc strong {
      color: #f1f5f9;
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
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  newPassword = '';
  confirmPassword = '';
  isSetPasswordMode = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['action'] === 'set-password') {
      this.isSetPasswordMode.set(true);
      if (params['email']) this.email = params['email'];
      if (params['temp']) this.password = params['temp'];
    } else if (this.authService.isAuthenticated()) {
      const role = this.authService.userRole();
      if (role) {
        this.authService.redirectByRole(role);
      }
    }
  }

  onSubmit(): void {
    if (!this.email || !this.password) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.user?.mustChangePassword) {
          this.isSetPasswordMode.set(true);
          this.errorMessage.set(null);
        }
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

  onSetPasswordSubmit(): void {
    if (!this.email || !this.password || !this.newPassword) return;

    if (this.newPassword.length < 8) {
      this.errorMessage.set('New password must be at least 8 characters long.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('New passwords do not match. Please re-enter.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.setPassword({
      email: this.email,
      currentPassword: this.password,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        const serverMsg = err.error?.message || err.error?.error;
        this.errorMessage.set(serverMsg || 'Could not establish permanent password. Verify temporary access code.');
      }
    });
  }
}

