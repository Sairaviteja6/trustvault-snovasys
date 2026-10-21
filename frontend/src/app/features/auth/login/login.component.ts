import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <div class="login-shield">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 class="login-title">TrustVault</h1>
          <p class="login-subtitle">Zero-Trust Cryptographic Document Platform</p>
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
              placeholder="e.g. owner@trustvault.com" 
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

        <div class="seed-section">
          <p class="seed-title">Quick Fill Credentials (Demo Accounts)</p>
          <div class="seed-grid">
            <button type="button" class="seed-btn admin" (click)="fill('admin@trustvault.com', 'Admin@12345!')">
              <span class="seed-role">Admin</span>
              <span class="seed-email">admin&#64;trustvault.com</span>
            </button>
            <button type="button" class="seed-btn owner" (click)="fill('owner@trustvault.com', 'Owner@12345!')">
              <span class="seed-role">Owner</span>
              <span class="seed-email">owner&#64;trustvault.com</span>
            </button>
            <button type="button" class="seed-btn viewer" (click)="fill('alice@trustvault.com', 'Viewer@12345!')">
              <span class="seed-role">Viewer (Alice)</span>
              <span class="seed-email">alice&#64;trustvault.com</span>
            </button>
            <button type="button" class="seed-btn viewer" (click)="fill('bob@trustvault.com', 'Viewer@12345!')">
              <span class="seed-role">Viewer (Bob)</span>
              <span class="seed-email">bob&#64;trustvault.com</span>
            </button>
          </div>
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
      background: radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.15), transparent 70%), var(--bg-primary);
    }
    .login-card {
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 460px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .login-shield {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: linear-gradient(135deg, #2563eb, #1e40af);
      color: white;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      box-shadow: 0 0 25px rgba(37, 99, 235, 0.5);
    }
    .login-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.03em;
    }
    .login-subtitle {
      font-size: 0.825rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
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
    .seed-section {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
    }
    .seed-title {
      font-size: 0.725rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
      text-align: center;
    }
    .seed-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .seed-btn {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.5rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
    }
    .seed-btn:hover {
      background: rgba(30, 41, 59, 0.9);
      border-color: var(--border-color-hover);
    }
    .seed-role {
      font-size: 0.75rem;
      font-weight: 700;
      color: #e2e8f0;
    }
    .seed-email {
      font-size: 0.675rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .seed-btn.admin .seed-role { color: #f87171; }
    .seed-btn.owner .seed-role { color: #fbbf24; }
    .seed-btn.viewer .seed-role { color: #60a5fa; }
    .security-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-size: 0.7rem;
      color: var(--text-muted);
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

  fill(emailVal: string, passVal: string): void {
    this.email = emailVal;
    this.password = passVal;
    this.errorMessage.set(null);
  }

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
        const serverMsg = err.error?.message || err.error?.error;
        this.errorMessage.set(serverMsg || 'Authentication failed. Please verify your credentials.');
      }
    });
  }
}
