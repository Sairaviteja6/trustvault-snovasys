import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="login-wrapper" (mousemove)="onMouseMove($event)">
      <!-- Soft Warm Background Overlay matching Canva (#b07f02 at 60% transparency over office photo) -->
      <div class="ambient-photo-overlay"></div>

      <!-- Floating Graphic Design Spheres / Floating Balls (Clean, No Text Clutter) -->
      <div 
        class="floating-sphere sphere-1"
        [style.transform]="'translate3d(' + (-parallaxX * 0.8) + 'px, ' + (-parallaxY * 0.8) + 'px, 0)'"
      ></div>
      <div 
        class="floating-sphere sphere-2"
        [style.transform]="'translate3d(' + (parallaxX * 0.9) + 'px, ' + (parallaxY * 0.9) + 'px, 0)'"
      ></div>
      <div 
        class="floating-sphere sphere-3"
        [style.transform]="'translate3d(' + (-parallaxX * 1.2) + 'px, ' + (parallaxY * 1.2) + 'px, 0)'"
      ></div>
      <div 
        class="floating-sphere sphere-4"
        [style.transform]="'translate3d(' + (parallaxX * 0.7) + 'px, ' + (-parallaxY * 0.7) + 'px, 0)'"
      ></div>
      <div 
        class="floating-sphere sphere-5"
        [style.transform]="'translate3d(' + (-parallaxX * 0.5) + 'px, ' + (parallaxY * 0.5) + 'px, 0)'"
      ></div>

      <!-- Core Translucent Container Card: #552612 with 60% Transparency -->
      <div class="login-card">
        <div class="login-header">
          <a routerLink="/" title="Return to TrustVault Home" class="logo-link">
            <div class="logo-ring">
              <img src="/images/trustvault-monogram.png" alt="TrustVault Logo" class="login-logo-img" />
            </div>
          </a>
          <h1 class="login-title">TrustVault</h1>
          <p class="login-subtitle">Confidential Document Platform</p>
          <a routerLink="/" class="back-home-link">&larr; Return to Home</a>
        </div>

        <!-- Success Message Banner -->
        <div class="alert alert-success" *ngIf="successMessage()" style="display: flex; align-items: center; gap: 0.5rem; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.5); color: #6ee7b7; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.85rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>{{ successMessage() }}</span>
        </div>

        <!-- Error Message Banner -->
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
            <label class="form-label" for="email">Username or Corporate Email</label>
            <input 
              id="email" 
              name="email" 
              type="text" 
              class="form-input" 
              placeholder="e.g. admin or user@company.com" 
              [(ngModel)]="email" 
              required 
              autocomplete="username"
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <div style="position: relative;">
              <input 
                id="password" 
                name="password" 
                [type]="showPassword() ? 'text' : 'password'" 
                class="form-input" 
                placeholder="••••••••••••" 
                [(ngModel)]="password" 
                required 
                autocomplete="current-password"
                [disabled]="isLoading()"
                style="padding-right: 2.75rem;"
              />
              <button 
                type="button" 
                (click)="showPassword.set(!showPassword())"
                style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: #ffd166; cursor: pointer; padding: 0.25rem; display: flex; align-items: center;"
                [title]="showPassword() ? 'Hide password' : 'Show password'"
              >
                <svg *ngIf="!showPassword()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg *ngIf="showPassword()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Linear gradient #552612 to #b07f02. On Hover: #b07f02 Background with Black Text -->
          <button 
            type="submit" 
            class="btn btn-primary btn-block custom-gradient-btn" 
            [disabled]="isLoading() || !email || !password"
          >
            <span *ngIf="!isLoading()" class="btn-text-content">
              <span>Sign In</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </span>
            <span *ngIf="isLoading()" class="spinner-text">
              <span class="spinner"></span> Authenticating...
            </span>
          </button>
        </form>

        <!-- First-Time Onboarding / Create Permanent Password Mode -->
        <form *ngIf="isSetPasswordMode()" (ngSubmit)="onSetPasswordSubmit()">
          <div style="background: rgba(176,127,2,0.15); border: 1px solid rgba(176,127,2,0.4); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem;">
            <div style="font-size: 0.9rem; font-weight: 700; color: #ffd166; margin-bottom: 0.25rem;">Create Permanent Password</div>
            <div style="font-size: 0.775rem; color: #e2e8f0;">
              Account: <strong style="color: #fff;">{{ email }}</strong>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="newPassword">Create New Password</label>
            <div style="position: relative;">
              <input 
                id="newPassword" 
                name="newPassword" 
                [type]="showNewPassword() ? 'text' : 'password'" 
                class="form-input" 
                placeholder="Enter your new permanent password" 
                [(ngModel)]="newPassword" 
                required 
                [disabled]="isLoading()"
                style="padding-right: 2.75rem;"
              />
              <button 
                type="button" 
                (click)="showNewPassword.set(!showNewPassword())"
                style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: #ffd166; cursor: pointer; padding: 0.25rem; display: flex; align-items: center;"
              >
                <svg *ngIf="!showNewPassword()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg *ngIf="showNewPassword()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>

            <!-- Password Strength Bar -->
            <div *ngIf="newPassword" style="margin-top: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; font-size: 0.75rem;">
                <span style="color: #cbd5e1;">Password Strength:</span>
                <span [style.color]="passwordStrength.color" style="font-weight: 700;">{{ passwordStrength.label }}</span>
              </div>
              <div style="height: 4px; width: 100%; background: rgba(255,255,255,0.15); border-radius: 2px; overflow: hidden;">
                <div [style.width]="passwordStrength.width" [style.background]="passwordStrength.color" style="height: 100%; transition: width 0.3s ease, background 0.3s ease;"></div>
              </div>
              <!-- Requirement Badges -->
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.4rem; font-size: 0.725rem;">
                <span [style.color]="hasMinLength ? '#10b981' : '#94a3b8'" style="display: flex; align-items: center; gap: 0.2rem;">
                  <span>{{ hasMinLength ? '✓' : '○' }}</span> 8+ chars
                </span>
                <span [style.color]="hasUpper ? '#10b981' : '#94a3b8'" style="display: flex; align-items: center; gap: 0.2rem;">
                  <span>{{ hasUpper ? '✓' : '○' }}</span> Uppercase
                </span>
                <span [style.color]="hasNumberOrSymbol ? '#10b981' : '#94a3b8'" style="display: flex; align-items: center; gap: 0.2rem;">
                  <span>{{ hasNumberOrSymbol ? '✓' : '○' }}</span> Number/Symbol
                </span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="confirmPassword">Confirm New Password</label>
            <div style="position: relative;">
              <input 
                id="confirmPassword" 
                name="confirmPassword" 
                [type]="showConfirmPassword() ? 'text' : 'password'" 
                class="form-input" 
                placeholder="Re-enter your new password" 
                [(ngModel)]="confirmPassword" 
                required 
                [disabled]="isLoading()"
                style="padding-right: 2.75rem;"
              />
              <button 
                type="button" 
                (click)="showConfirmPassword.set(!showConfirmPassword())"
                style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: #ffd166; cursor: pointer; padding: 0.25rem; display: flex; align-items: center;"
              >
                <svg *ngIf="!showConfirmPassword()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg *ngIf="showConfirmPassword()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <div *ngIf="confirmPassword" style="font-size: 0.725rem; margin-top: 0.35rem;">
              <span *ngIf="passwordsMatch" style="color: #10b981;">✓ Passwords match</span>
              <span *ngIf="!passwordsMatch" style="color: #ef4444;">✗ Passwords do not match</span>
            </div>
          </div>

          <button 
            type="submit" 
            class="btn btn-primary btn-block custom-gradient-btn" 
            [disabled]="isLoading() || !newPassword || !confirmPassword || !passwordsMatch || !hasMinLength"
          >
            <span *ngIf="!isLoading()" class="btn-text-content">
              <span>Save Password &amp; Proceed to Sign In</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </span>
            <span *ngIf="isLoading()" class="spinner-text">
              <span class="spinner"></span> Saving Password...
            </span>
          </button>

          <div style="text-align: center; margin-top: 1rem;">
            <a href="javascript:void(0)" (click)="isSetPasswordMode.set(false)" style="font-size: 0.8rem; color: #ffd166; text-decoration: none;">
              &larr; Return to Sign In
            </a>
          </div>
        </form>

        <div class="security-footer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffd166" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>End-to-End Cryptographically Secured</span>
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
      padding: 2rem 1.5rem;
      position: relative;
      overflow: hidden;
      background: 
        linear-gradient(135deg, rgba(176, 127, 2, 0.20) 0%, rgba(85, 38, 18, 0.30) 100%),
        url('/images/executive-office-bg.png') center/cover no-repeat,
        #15100b;
    }

    /* Soft Warm Light Overlay: #b07f02 with 60% Transparency over bright office photo */
    .ambient-photo-overlay {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      background: radial-gradient(circle at 50% 30%, rgba(176, 127, 2, 0.22) 0%, rgba(85, 38, 18, 0.25) 100%);
    }

    /* Floating Abstract Graphic Design Spheres / Balls (Clean & Elegant, No Text) */
    .floating-sphere {
      position: fixed;
      border-radius: 50%;
      pointer-events: none;
      z-index: 2;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: transform;
    }

    /* Sphere 1: Warm Amber Glass Ball (Top Left) */
    .sphere-1 {
      width: 72px;
      height: 72px;
      top: 15%;
      left: 10%;
      background: radial-gradient(circle at 35% 35%, rgba(255, 220, 140, 0.85) 0%, rgba(176, 127, 2, 0.55) 50%, rgba(85, 38, 18, 0.40) 100%);
      box-shadow: 0 12px 28px rgba(176, 127, 2, 0.35), inset 0 2px 6px rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(8px);
      animation: floatBounce1 7s ease-in-out infinite alternate;
    }

    /* Sphere 2: Deep Espresso Glass Ball (Top Right) */
    .sphere-2 {
      width: 58px;
      height: 58px;
      top: 18%;
      right: 12%;
      background: radial-gradient(circle at 35% 35%, rgba(176, 127, 2, 0.80) 0%, rgba(85, 38, 18, 0.70) 55%, rgba(35, 14, 6, 0.45) 100%);
      box-shadow: 0 10px 25px rgba(85, 38, 18, 0.50), inset 0 2px 6px rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(8px);
      animation: floatBounce2 8.5s ease-in-out infinite alternate;
    }

    /* Sphere 3: Small Amber Glow Pearl (Bottom Left) */
    .sphere-3 {
      width: 44px;
      height: 44px;
      bottom: 18%;
      left: 14%;
      background: radial-gradient(circle at 35% 35%, rgba(255, 235, 180, 0.90) 0%, rgba(176, 127, 2, 0.60) 60%, transparent 100%);
      box-shadow: 0 8px 20px rgba(176, 127, 2, 0.35);
      animation: floatBounce2 6.5s ease-in-out infinite alternate;
    }

    /* Sphere 4: Floating Espresso-Gold Orb (Bottom Right) */
    .sphere-4 {
      width: 80px;
      height: 80px;
      bottom: 16%;
      right: 10%;
      background: radial-gradient(circle at 35% 35%, rgba(176, 127, 2, 0.75) 0%, rgba(85, 38, 18, 0.75) 55%, rgba(20, 8, 3, 0.45) 100%);
      box-shadow: 0 14px 32px rgba(85, 38, 18, 0.45), inset 0 2px 8px rgba(255, 255, 255, 0.4);
      animation: floatBounce1 9s ease-in-out infinite alternate;
    }

    /* Sphere 5: Tiny Floating Node (Center Left) */
    .sphere-5 {
      width: 28px;
      height: 28px;
      top: 52%;
      left: 6%;
      background: radial-gradient(circle at 35% 35%, #ffd166 0%, rgba(176, 127, 2, 0.6) 100%);
      box-shadow: 0 6px 14px rgba(176, 127, 2, 0.35);
      animation: floatBounce1 5.5s ease-in-out infinite alternate;
    }

    @keyframes floatBounce1 {
      0% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-18px) scale(1.05); }
      100% { transform: translateY(10px) scale(0.96); }
    }

    @keyframes floatBounce2 {
      0% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(16px) scale(0.95); }
      100% { transform: translateY(-14px) scale(1.04); }
    }

    /* Core Translucent Container Card: #552612 with 60% Transparency */
    .login-card {
      position: relative;
      z-index: 10;
      background: rgba(85, 38, 18, 0.48);
      backdrop-filter: blur(24px) saturate(160%);
      -webkit-backdrop-filter: blur(24px) saturate(160%);
      border: 1px solid rgba(176, 127, 2, 0.35);
      border-radius: 20px;
      padding: 2.5rem 2.25rem;
      width: 100%;
      max-width: 440px;
      box-shadow: 
        0 20px 60px -10px rgba(0, 0, 0, 0.55), 
        0 0 30px rgba(176, 127, 2, 0.12);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .login-card:hover {
      border-color: rgba(176, 127, 2, 0.60);
      box-shadow: 
        0 25px 70px -10px rgba(0, 0, 0, 0.65), 
        0 0 40px rgba(176, 127, 2, 0.22);
    }

    .login-header {
      text-align: center;
      margin-bottom: 1.75rem;
    }

    .logo-link {
      display: inline-block;
      text-decoration: none;
    }

    .logo-ring {
      display: inline-flex;
      padding: 3px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(176, 127, 2, 0.8), rgba(85, 38, 18, 0.8));
      box-shadow: 0 0 16px rgba(176, 127, 2, 0.35);
      margin-bottom: 0.75rem;
      transition: transform 0.25s ease;
    }

    .logo-ring:hover {
      transform: scale(1.06);
    }

    .login-logo-img {
      height: 48px;
      width: 48px;
      border-radius: 11px;
      object-fit: cover;
      display: block;
    }

    .login-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.025em;
    }

    .login-subtitle {
      font-size: 0.825rem;
      color: rgba(255, 255, 255, 0.90);
      margin-top: 0.2rem;
    }

    .back-home-link {
      display: inline-block;
      margin-top: 0.45rem;
      font-size: 0.775rem;
      color: #ffd166;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s;
    }

    .back-home-link:hover {
      color: #ffffff;
      text-decoration: underline;
    }

    .form-label {
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
      display: block;
    }

    .form-input {
      background: rgba(45, 18, 8, 0.55) !important;
      border: 1px solid rgba(176, 127, 2, 0.35) !important;
      color: #ffffff !important;
      border-radius: 10px;
      padding: 0.75rem 0.95rem;
      width: 100%;
      box-sizing: border-box;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: #ffd166 !important;
      box-shadow: 0 0 0 3px rgba(176, 127, 2, 0.40) !important;
      background: rgba(55, 22, 10, 0.75) !important;
    }

    /* Button Gradient #552612 to #b07f02. On Hover: #b07f02 background with Black text */
    .custom-gradient-btn {
      width: 100%;
      padding: 0.8rem;
      font-size: 0.925rem;
      margin-top: 0.5rem;
      background: linear-gradient(135deg, #552612 0%, #b07f02 100%) !important;
      border: 1px solid rgba(176, 127, 2, 0.65) !important;
      border-radius: 10px;
      color: #ffffff !important;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4), 0 0 14px rgba(176, 127, 2, 0.30);
      transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .custom-gradient-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      background: #b07f02 !important;
      color: #000000 !important;
      font-weight: 700 !important;
      border-color: #ffd166 !important;
      box-shadow: 0 8px 24px rgba(176, 127, 2, 0.55), 0 0 20px rgba(255, 209, 102, 0.35) !important;
    }

    .custom-gradient-btn:hover:not(:disabled) svg {
      stroke: #000000 !important;
    }

    .btn-text-content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .spinner-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .spinner {
      width: 15px;
      height: 15px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .security-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-size: 0.725rem;
      color: rgba(255, 255, 255, 0.75);
      margin-top: 1.35rem;
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
  successMessage = signal<string | null>(null);

  showPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  // Gentle Mouse Parallax
  mouseX = 0;
  mouseY = 0;
  parallaxX = 0;
  parallaxY = 0;

  get passwordStrength(): { score: number; label: string; color: string; width: string } {
    const p = this.newPassword || '';
    if (!p) return { score: 0, label: '', color: '', width: '0%' };
    
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    switch (score) {
      case 1: return { score: 1, label: 'Weak', color: '#ef4444', width: '25%' };
      case 2: return { score: 2, label: 'Fair', color: '#f59e0b', width: '50%' };
      case 3: return { score: 3, label: 'Good', color: '#3b82f6', width: '75%' };
      case 4: return { score: 4, label: 'Strong', color: '#10b981', width: '100%' };
      default: return { score: 0, label: 'Too short', color: '#ef4444', width: '15%' };
    }
  }

  get hasMinLength(): boolean { return (this.newPassword || '').length >= 8; }
  get hasUpper(): boolean { return /[A-Z]/.test(this.newPassword || ''); }
  get hasNumberOrSymbol(): boolean { return /[0-9]|[^A-Za-z0-9]/.test(this.newPassword || ''); }
  get passwordsMatch(): boolean { return !!this.newPassword && this.newPassword === this.confirmPassword; }

  onMouseMove(e: MouseEvent): void {
    const { innerWidth, innerHeight } = window;
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.parallaxX = ((e.clientX - innerWidth / 2) / (innerWidth / 2)) * 15;
    this.parallaxY = ((e.clientY - innerHeight / 2) / (innerHeight / 2)) * 15;
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['action'] === 'set-password') {
      this.isSetPasswordMode.set(true);
      if (params['email']) this.email = params['email'].trim();
      if (params['temp']) this.password = params['temp'].trim();
    } else if (this.authService.isAuthenticated()) {
      const role = this.authService.userRole();
      if (role) {
        this.authService.redirectByRole(role);
      }
    }
  }

  onSubmit(): void {
    const cleanEmail = this.email?.trim();
    const cleanPassword = this.password?.trim();

    if (!cleanEmail || !cleanPassword) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.login(cleanEmail, cleanPassword).subscribe({
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
        } else if (err.status === 429) {
          this.errorMessage.set('Too many authentication attempts. Please wait a moment before trying again.');
        } else {
          const serverMsg = err.error?.message || err.error?.error;
          this.errorMessage.set(serverMsg || 'Authentication failed. Please verify your username/email and password.');
        }
      }
    });
  }

  onSetPasswordSubmit(): void {
    const cleanEmail = this.email?.trim();
    const cleanCurrent = this.password?.trim();
    const cleanNew = this.newPassword?.trim();

    if (!cleanEmail || !cleanCurrent || !cleanNew) {
      this.errorMessage.set('Please provide all password details.');
      return;
    }

    if (cleanNew.length < 8) {
      this.errorMessage.set('New password must be at least 8 characters long.');
      return;
    }

    if (cleanNew !== this.confirmPassword?.trim()) {
      this.errorMessage.set('New passwords do not match. Please re-enter.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.setPassword({
      email: cleanEmail,
      currentPassword: cleanCurrent,
      newPassword: cleanNew
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSetPasswordMode.set(false);
        this.successMessage.set('✓ Permanent password created successfully! Please sign in with your new password.');
        this.password = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.router.navigate([], { queryParams: {} });
      },
      error: (err) => {
        this.isLoading.set(false);
        const serverMsg = err.error?.message || err.error?.error;
        this.errorMessage.set(serverMsg || 'Could not establish permanent password. Verify temporary access code.');
      }
    });
  }
}
