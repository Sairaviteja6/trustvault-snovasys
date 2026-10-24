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
      <!-- Multi-Layer Luminous Background with #b07f02 60% Ambient Tone -->
      <div 
        class="ambient-mesh-bg"
        [style.transform]="'translate3d(' + (-parallaxX * 0.4) + 'px, ' + (-parallaxY * 0.4) + 'px, 0)'"
      ></div>

      <!-- Floating Radiant Gradient Orbs (#b07f02 and #3533cd) -->
      <div 
        class="floating-orb orb-gold"
        [style.transform]="'translate3d(' + (parallaxX * 0.7) + 'px, ' + (parallaxY * 0.7) + 'px, 0)'"
      ></div>
      <div 
        class="floating-orb orb-electric"
        [style.transform]="'translate3d(' + (-parallaxX * 0.6) + 'px, ' + (-parallaxY * 0.6) + 'px, 0)'"
      ></div>
      <div class="cyber-grid-lines"></div>

      <!-- Floating 3D Crypto & AI Security Badges (Dribbble Crypto & KEEL AI Inspiration) -->
      <div 
        class="floating-badge badge-top-left"
        [style.transform]="'translate3d(' + (-parallaxX * 1.2) + 'px, ' + (-parallaxY * 1.2) + 'px, 0)'"
      >
        <div class="badge-icon-box gold-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="badge-content">
          <div class="badge-header-row">
            <span class="badge-label-gold">AES-256-GCM Hardware Cipher</span>
            <span class="live-pulse-dot"></span>
          </div>
          <span class="badge-subtext">Bit-Level Invariant Encryption Verified</span>
        </div>
      </div>

      <div 
        class="floating-badge badge-top-right"
        [style.transform]="'translate3d(' + (parallaxX * 1.1) + 'px, ' + (-parallaxY * 1.1) + 'px, 0)'"
      >
        <div class="badge-icon-box electric-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div class="badge-content">
          <div class="badge-header-row">
            <span class="badge-label-electric">Multi-Tenant Vault</span>
            <span class="badge-pill-micro">Zero-Trust</span>
          </div>
          <span class="badge-subtext">Cross-Organization Boundary Isolation</span>
        </div>
      </div>

      <div 
        class="floating-badge badge-bottom-left"
        [style.transform]="'translate3d(' + (-parallaxX * 0.9) + 'px, ' + (parallaxY * 0.9) + 'px, 0)'"
      >
        <div class="badge-icon-box gold-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div class="badge-content">
          <span class="badge-label-white">SHA-256 Cryptographic Chain</span>
          <span class="badge-mono-code font-mono">HASH: 0x8f4b...e921 [OK]</span>
        </div>
      </div>

      <div 
        class="floating-badge badge-bottom-right"
        [style.transform]="'translate3d(' + (parallaxX * 1.3) + 'px, ' + (parallaxY * 1.3) + 'px, 0)'"
      >
        <div class="badge-icon-box electric-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="12" cy="12" r="10"/>
            <path d="m4.93 4.93 4.24 4.24"/>
            <path d="m14.83 9.17 4.24-4.24"/>
            <path d="m14.83 14.83 4.24 4.24"/>
            <path d="m9.17 14.83-4.24 4.24"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </div>
        <div class="badge-content">
          <div class="badge-header-row">
            <span class="badge-label-white">Cloud Sentinel Active</span>
            <span class="badge-latency-pill">12ms Latency</span>
          </div>
          <span class="badge-subtext">Multi-AZ Load Balanced Node</span>
        </div>
      </div>

      <!-- Core Glassmorphic Authentication Card: #552612 at 60% Transparency -->
      <div class="login-card">
        <div class="login-header">
          <a routerLink="/" title="Return to TrustVault Home" class="logo-link">
            <div class="logo-ring">
              <img src="/images/trustvault-monogram.png" alt="TrustVault Logo" class="login-logo-img" />
            </div>
          </a>
          <h1 class="login-title">TrustVault</h1>
          <p class="login-subtitle">Zero-Trust Cryptographic Document Platform</p>
          <a routerLink="/" class="back-home-link">&larr; Return to Home</a>
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

          <!-- Gradient Button: #000000 to #3533cd. On Hover: #b07f02 background and Black Text -->
          <button 
            type="submit" 
            class="btn btn-primary btn-block legend-btn" 
            [disabled]="isLoading() || !email || !password"
          >
            <span *ngIf="!isLoading()" class="btn-text-flex">
              <span>Authenticate Session</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </span>
            <span *ngIf="isLoading()" class="spinner-text">
              <span class="spinner"></span> Verifying Invariants...
            </span>
          </button>
        </form>

        <!-- First-Time Onboarding / Set Permanent Password Mode -->
        <form *ngIf="isSetPasswordMode()" (ngSubmit)="onSetPasswordSubmit()">
          <div class="alert alert-info" style="font-size: 0.8rem; margin-bottom: 1rem;">
            <strong>Account Setup:</strong> Please establish your permanent security password to activate your personal workspace.
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
            class="btn btn-primary btn-block legend-btn" 
            [disabled]="isLoading() || !email || !password || !newPassword || !confirmPassword"
          >
            <span *ngIf="!isLoading()" class="btn-text-flex">
              <span>Establish Permanent Password</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </span>
            <span *ngIf="isLoading()" class="spinner-text">
              <span class="spinner"></span> Encrypting Credentials...
            </span>
          </button>

          <div style="text-align: center; margin-top: 1rem;">
            <a href="javascript:void(0)" (click)="isSetPasswordMode.set(false)" style="font-size: 0.8rem; color: #ffd166; text-decoration: none;">
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffd166" stroke-width="2">
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
      padding: 2rem 1.5rem;
      position: relative;
      overflow: hidden;
      background: #080503;
    }

    /* Ambient multi-layer mesh with #b07f02 60% overlay */
    .ambient-mesh-bg {
      position: fixed;
      inset: -120px;
      pointer-events: none;
      z-index: 1;
      background: 
        radial-gradient(circle 900px at 15% 15%, rgba(176, 127, 2, 0.50), transparent 60%),
        radial-gradient(circle 800px at 85% 85%, rgba(53, 51, 205, 0.38), transparent 60%),
        radial-gradient(circle 700px at 50% 50%, rgba(176, 127, 2, 0.30), transparent 70%),
        linear-gradient(135deg, rgba(176, 127, 2, 0.40) 0%, rgba(8, 5, 3, 0.95) 100%);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: transform;
    }

    /* Glowing floating radiant orbs (#b07f02 amber and #3533cd electric indigo) */
    .floating-orb {
      position: fixed;
      border-radius: 50%;
      pointer-events: none;
      filter: blur(120px);
      z-index: 2;
      opacity: 0.70;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: transform;
    }

    .orb-gold {
      width: 520px;
      height: 520px;
      top: 5%;
      left: 10%;
      background: radial-gradient(circle, #b07f02 0%, rgba(176, 127, 2, 0.3) 70%, transparent 100%);
      animation: floatBreathGold 12s ease-in-out infinite alternate;
    }

    .orb-electric {
      width: 580px;
      height: 580px;
      bottom: 5%;
      right: 8%;
      background: radial-gradient(circle, #3533cd 0%, rgba(53, 51, 205, 0.3) 70%, transparent 100%);
      animation: floatBreathElectric 14s ease-in-out infinite alternate;
    }

    @keyframes floatBreathGold {
      0% { transform: translateY(0) scale(1); opacity: 0.65; }
      100% { transform: translateY(-40px) scale(1.15); opacity: 0.85; }
    }

    @keyframes floatBreathElectric {
      0% { transform: translateY(0) scale(1.1); opacity: 0.75; }
      100% { transform: translateY(45px) scale(0.95); opacity: 0.55; }
    }

    .cyber-grid-lines {
      position: fixed;
      inset: -50px;
      pointer-events: none;
      z-index: 2;
      background-image: 
        linear-gradient(rgba(176, 127, 2, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(176, 127, 2, 0.08) 1px, transparent 1px);
      background-size: 58px 58px;
      opacity: 0.85;
    }

    /* Floating 3D Crypto & AI Security Badges (Dribbble Reference Quality) */
    .floating-badge {
      position: fixed;
      z-index: 5;
      display: flex;
      align-items: center;
      gap: 0.95rem;
      padding: 0.95rem 1.35rem;
      border-radius: 16px;
      background: rgba(85, 38, 18, 0.60);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(176, 127, 2, 0.40);
      box-shadow: 0 16px 36px -6px rgba(0, 0, 0, 0.7), 0 0 25px rgba(176, 127, 2, 0.16);
      color: #ffffff;
      pointer-events: none;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: transform;
    }

    .badge-top-left {
      top: 12%;
      left: 6%;
      animation: badgeDriftA 8s ease-in-out infinite alternate;
    }

    .badge-top-right {
      top: 14%;
      right: 6%;
      animation: badgeDriftB 9s ease-in-out infinite alternate;
    }

    .badge-bottom-left {
      bottom: 12%;
      left: 7%;
      animation: badgeDriftB 8.5s ease-in-out infinite alternate;
    }

    .badge-bottom-right {
      bottom: 14%;
      right: 7%;
      animation: badgeDriftA 9.5s ease-in-out infinite alternate;
    }

    @keyframes badgeDriftA {
      0% { transform: translateY(0px) rotate(0deg); }
      100% { transform: translateY(-14px) rotate(0.8deg); }
    }

    @keyframes badgeDriftB {
      0% { transform: translateY(0px) rotate(0deg); }
      100% { transform: translateY(16px) rotate(-0.8deg); }
    }

    .badge-icon-box {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .badge-icon-box.gold-icon {
      background: rgba(176, 127, 2, 0.25);
      border: 1px solid rgba(176, 127, 2, 0.60);
      color: #ffd166;
      box-shadow: 0 0 16px rgba(176, 127, 2, 0.35);
    }

    .badge-icon-box.electric-icon {
      background: rgba(53, 51, 205, 0.30);
      border: 1px solid rgba(53, 51, 205, 0.70);
      color: #c7d2fe;
      box-shadow: 0 0 18px rgba(53, 51, 205, 0.45);
    }

    .badge-content {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .badge-header-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .badge-label-gold {
      font-size: 0.825rem;
      font-weight: 700;
      color: #ffd166;
      letter-spacing: -0.01em;
    }

    .badge-label-electric {
      font-size: 0.825rem;
      font-weight: 700;
      color: #c7d2fe;
      letter-spacing: -0.01em;
    }

    .badge-label-white {
      font-size: 0.825rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.01em;
    }

    .badge-subtext {
      font-size: 0.725rem;
      color: rgba(255, 255, 255, 0.80);
    }

    .badge-mono-code {
      font-size: 0.725rem;
      color: #ffd166;
      background: rgba(0, 0, 0, 0.4);
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid rgba(176, 127, 2, 0.3);
    }

    .live-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ffd166;
      box-shadow: 0 0 10px #ffd166;
      animation: pulseGold 2s infinite;
    }

    @keyframes pulseGold {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.6; }
    }

    .badge-pill-micro {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 999px;
      background: rgba(53, 51, 205, 0.4);
      border: 1px solid rgba(53, 51, 205, 0.6);
      color: #ffffff;
    }

    .badge-latency-pill {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.25);
      border: 1px solid rgba(16, 185, 129, 0.5);
      color: #34d399;
    }

    /* Core Glassmorphic Authentication Card: #552612 at 60% Transparency */
    .login-card {
      position: relative;
      z-index: 10;
      background: rgba(85, 38, 18, 0.60);
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border: 1px solid rgba(176, 127, 2, 0.40);
      border-radius: 22px;
      padding: 2.75rem 2.4rem;
      width: 100%;
      max-width: 450px;
      box-shadow: 
        0 30px 80px -15px rgba(0, 0, 0, 0.85), 
        0 0 50px rgba(176, 127, 2, 0.20),
        0 0 25px rgba(53, 51, 205, 0.25);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .login-card:hover {
      border-color: rgba(176, 127, 2, 0.70);
      box-shadow: 
        0 35px 90px -10px rgba(0, 0, 0, 0.90), 
        0 0 65px rgba(176, 127, 2, 0.35),
        0 0 35px rgba(53, 51, 205, 0.35);
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .logo-link {
      display: inline-block;
      text-decoration: none;
    }

    .logo-ring {
      display: inline-flex;
      padding: 4px;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(176, 127, 2, 0.6), rgba(53, 51, 205, 0.6));
      box-shadow: 0 0 24px rgba(176, 127, 2, 0.45);
      margin-bottom: 0.85rem;
      transition: transform 0.25s ease;
    }

    .logo-ring:hover {
      transform: scale(1.08) rotate(3deg);
    }

    .login-logo-img {
      height: 52px;
      width: 52px;
      border-radius: 12px;
      object-fit: cover;
      display: block;
    }

    .login-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.03em;
    }

    .login-subtitle {
      font-size: 0.825rem;
      color: rgba(255, 255, 255, 0.85);
      margin-top: 0.25rem;
    }

    .back-home-link {
      display: inline-block;
      margin-top: 0.5rem;
      font-size: 0.775rem;
      color: #ffd166;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s;
    }

    .back-home-link:hover {
      color: #ffffff;
      text-decoration: underline;
      transform: translateX(-2px);
    }

    .form-label {
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
      display: block;
    }

    .form-input {
      background: rgba(45, 18, 8, 0.80) !important;
      border: 1px solid rgba(176, 127, 2, 0.38) !important;
      color: #ffffff !important;
      border-radius: 11px;
      padding: 0.8rem 1rem;
      width: 100%;
      box-sizing: border-box;
      font-size: 0.925rem;
      transition: all 0.22s;
    }

    .form-input:focus {
      outline: none;
      border-color: #3533cd !important;
      box-shadow: 0 0 0 3px rgba(53, 51, 205, 0.40) !important;
      background: rgba(55, 22, 10, 0.95) !important;
    }

    /* Legendary Button: #000000 to #3533cd gradient. On Hover -> #b07f02 with Black Text */
    .legend-btn {
      width: 100%;
      padding: 0.85rem;
      font-size: 0.95rem;
      margin-top: 0.6rem;
      background: linear-gradient(90deg, #000000 0%, #3533cd 100%) !important;
      border: 1px solid rgba(53, 51, 205, 0.60) !important;
      border-radius: 11px;
      color: #ffffff !important;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 20px rgba(53, 51, 205, 0.35);
      transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .legend-btn:hover:not(:disabled) {
      transform: translateY(-2px) scale(1.02);
      background: #b07f02 !important;
      color: #000000 !important;
      font-weight: 700 !important;
      border-color: #ffd166 !important;
      box-shadow: 0 12px 32px rgba(176, 127, 2, 0.65), 0 0 25px rgba(255, 209, 102, 0.45) !important;
    }

    .legend-btn:hover:not(:disabled) svg {
      stroke: #000000 !important;
    }

    .btn-text-flex {
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
      padding: 1.05rem;
      background: rgba(45, 18, 8, 0.60);
      border: 1px solid rgba(176, 127, 2, 0.30);
      border-radius: 13px;
    }

    .info-title {
      font-size: 0.775rem;
      font-weight: 700;
      color: #ffd166;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.3rem;
    }

    .info-desc {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.85);
      line-height: 1.45;
    }

    .info-desc strong {
      color: #ffffff;
    }

    .security-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      font-size: 0.725rem;
      color: rgba(255, 255, 255, 0.70);
      margin-top: 1.5rem;
      text-align: center;
    }

    /* Responsive Handling for Mobile Screens */
    @media (max-width: 1100px) {
      .floating-badge {
        display: none;
      }
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

  // Dynamic Parallax Variables
  mouseX = 0;
  mouseY = 0;
  parallaxX = 0;
  parallaxY = 0;

  onMouseMove(e: MouseEvent): void {
    const { innerWidth, innerHeight } = window;
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.parallaxX = ((e.clientX - innerWidth / 2) / (innerWidth / 2)) * 20;
    this.parallaxY = ((e.clientY - innerHeight / 2) / (innerHeight / 2)) * 20;
  }

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
