import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { InquiryService, ClientInquiry } from '../../core/services/inquiry.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="landing-page">
      <!-- Dynamic Interactive Mouse-Tracking Background (Reference: trustvault.biz) -->
      <div 
        class="interactive-ambient-mesh" 
        [style.transform]="'translate3d(' + (-parallaxX) + 'px, ' + (-parallaxY) + 'px, 0)'"
      ></div>
      <div 
        class="interactive-cursor-spotlight"
        [style.transform]="'translate3d(' + mouseX + 'px, ' + mouseY + 'px, 0)'"
      ></div>
      <div 
        class="interactive-grid-lines"
        [style.transform]="'translate3d(' + (parallaxX * 0.4) + 'px, ' + (parallaxY * 0.4) + 'px, 0)'"
      ></div>

      <!-- Top Sticky Navigation -->
      <header class="landing-header">
        <div class="nav-container">
          <div class="brand-link" routerLink="/">
            <img src="/images/trustvault-monogram.png" alt="TrustVault Logo" class="brand-logo" />
            <span class="brand-text">TrustVault</span>
          </div>

          <nav class="nav-links">
            <a href="#workflow" class="nav-item">How It Works</a>
            <a href="#architecture" class="nav-item">Architecture</a>
            <a href="#access-control" class="nav-item">Access Tiers</a>
            <a href="#transparency" class="nav-item">Audit Ledger</a>
            <a href="#inquiry" class="nav-item">Get Started</a>
          </nav>

          <div class="nav-actions">
            <button class="btn btn-secondary btn-sm" (click)="goToLogin()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              <span>Sign In</span>
            </button>
            <button class="btn btn-primary btn-sm" (click)="scrollToInquiry()">
              <span>Get Started</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="hero-section">
        <div class="container hero-container">
          <div class="hero-content">
            <div class="hero-badge">
              <span class="badge-dot"></span>
              <span>Enterprise Confidential Document Platform</span>
            </div>

            <h1 class="hero-title">
              Your documents, organized and <span class="hero-highlight">under your control</span>.
            </h1>

            <p class="hero-subtitle">
              Share critical files with authorized teams, maintain complete sovereign control over access, and track every single interaction on a clear, verifiable timeline.
            </p>

            <div class="hero-buttons">
              <button class="btn btn-primary btn-lg" (click)="scrollToInquiry()">
                <span>Get Started</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
              <button class="btn btn-secondary btn-lg" (click)="goToLogin()">
                <span>Explore the Platform</span>
              </button>
            </div>

            <div class="hero-trust-bar">
              <div class="trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>AES-256 Bit-Level Security</span>
              </div>
              <div class="trust-divider"></div>
              <div class="trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Server-Enforced Access Invariants</span>
              </div>
              <div class="trust-divider"></div>
              <div class="trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Tamper-Proof Audit History</span>
              </div>
            </div>
          </div>

          <div class="hero-preview-card card">
            <div class="preview-header">
              <img src="/images/trustvault-monogram.png" alt="TrustVault Logo" class="card-logo" />
              <div class="preview-meta">
                <span class="preview-app-title">TrustVault Core</span>
                <span class="preview-status">Operational &bull; Zero-Knowledge Isolation Active</span>
              </div>
            </div>

            <!-- TrustVault Core Graphic with humanized active overlay -->
            <div class="core-image-wrapper">
              <img 
                src="/images/trustvault-core.jpg" 
                alt="TrustVault Core Architecture" 
                class="core-image" 
              />
              <div class="core-image-overlay-badge">
                <span class="dot-pulse"></span>
                <span>Security Engine Active</span>
              </div>
            </div>

            <div class="preview-stats-grid">
              <div class="preview-stat">
                <span class="stat-number">256-bit</span>
                <span class="stat-label">AES Authenticated Encryption</span>
              </div>
              <div class="preview-stat">
                <span class="stat-number">0-Knowledge</span>
                <span class="stat-label">Admin Content Access</span>
              </div>
              <div class="preview-stat">
                <span class="stat-number">100%</span>
                <span class="stat-label">Audit Log Immutability</span>
              </div>
              <div class="preview-stat">
                <span class="stat-number">Instant</span>
                <span class="stat-label">Access Revocation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Platform Workflow (How TrustVault Works) -->
      <section id="workflow" class="section-block workflow-section">
        <div class="container">
          <div class="section-heading text-center">
            <div class="workflow-badge">
              <span class="badge-dot-teal"></span>
              <span>Platform Workflow</span>
            </div>
            <h2 class="section-title-large">How TrustVault Works</h2>
            <p class="section-desc-large">
              A transparent, end-to-end security lifecycle: from enterprise inquiry and administrative governance to sovereign document ownership and audited viewer inspection.
            </p>
          </div>

          <!-- 4-Step Process Flow Grid -->
          <div class="workflow-flow-grid">
            <!-- Step 1 -->
            <div class="workflow-card">
              <div class="step-indicator">
                <span class="step-num">01</span>
                <span class="step-connector"></span>
              </div>
              <div class="workflow-icon-box icon-teal">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </div>
              <div class="workflow-role-tag tag-client">Enterprise Client</div>
              <h3 class="workflow-card-title">Inquiry &amp; Invitation</h3>
              <p class="workflow-card-desc">
                Prospective teams submit an inquiry through the portal. The system automatically dispatches an onboarding email with temporary access credentials for account activation.
              </p>
              <div class="workflow-pill-row">
                <span class="workflow-pill">Self-Service Portal</span>
                <span class="workflow-pill">Secure Email Dispatch</span>
              </div>
            </div>

            <!-- Step 2 -->
            <div class="workflow-card">
              <div class="step-indicator">
                <span class="step-num">02</span>
                <span class="step-connector"></span>
              </div>
              <div class="workflow-icon-box icon-blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <div class="workflow-role-tag tag-admin">System Admin</div>
              <h3 class="workflow-card-title">Institutional Governance</h3>
              <p class="workflow-card-desc">
                The Administrator manages organization directories and provisions Document Owner workspaces while strictly isolated from viewing unencrypted document contents.
              </p>
              <div class="workflow-pill-row">
                <span class="workflow-pill">Zero File Access</span>
                <span class="workflow-pill">SHA-256 Ledger Audit</span>
              </div>
            </div>

            <!-- Step 3 -->
            <div class="workflow-card">
              <div class="step-indicator">
                <span class="step-num">03</span>
                <span class="step-connector"></span>
              </div>
              <div class="workflow-icon-box icon-purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="workflow-role-tag tag-owner">Document Owner</div>
              <h3 class="workflow-card-title">Upload &amp; DRM Policy</h3>
              <p class="workflow-card-desc">
                Owners upload sensitive files with AES-256 client encryption, configure fine-grained permissions, dynamic session watermarking, and time-to-live (TTL) expiration rules.
              </p>
              <div class="workflow-pill-row">
                <span class="workflow-pill">AES-256 Encryption</span>
                <span class="workflow-pill">TTL Expiry &amp; DRM</span>
              </div>
            </div>

            <!-- Step 4 -->
            <div class="workflow-card">
              <div class="step-indicator">
                <span class="step-num">04</span>
              </div>
              <div class="workflow-icon-box icon-emerald">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div class="workflow-role-tag tag-viewer">Authorized Viewer</div>
              <h3 class="workflow-card-title">Protected Inspection</h3>
              <p class="workflow-card-desc">
                Authorized viewers receive notification emails, activate their credentials, and inspect documents decrypted safely in-memory with immutable tamper-proof audit tracking.
              </p>
              <div class="workflow-pill-row">
                <span class="workflow-pill">In-Memory Decryption</span>
                <span class="workflow-pill">Immutable Audit Trail</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Architectural Integrity -->
      <section id="architecture" class="section-block">
        <div class="container">
          <div class="section-heading text-center">
            <h2 class="section-title-large">Architectural Integrity</h2>
            <p class="section-desc-large">
              TrustVault utilizes AES-256-GCM encryption to ensure that every document is protected at the bit level. Our granular permission model allows administrators to define precise access levels, ensuring that only authorized personnel can view, edit, or download sensitive information. This server-enforced control provides a tamper-evident audit trail, giving you total visibility into security activity without ever needing to inspect private document contents.
            </p>
          </div>

          <div class="grid-cols-3 feature-grid">
            <div class="card feature-card">
              <div class="feature-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3 class="feature-title">Cryptographic Envelope</h3>
              <p class="feature-text">
                Every uploaded file is transformed into ciphertext with an authenticating tag. Plain text never resides on physical disk storage unencrypted.
              </p>
            </div>

            <div class="card feature-card">
              <div class="feature-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              <h3 class="feature-title">Granular Permissions</h3>
              <p class="feature-text">
                Dynamic Read, Edit, and Revoke permissions evaluated server-side on every request to permanently prevent horizontal privilege escalation.
              </p>
            </div>

            <div class="card feature-card">
              <div class="feature-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <h3 class="feature-title">Version Snapshots</h3>
              <p class="feature-text">
                Every edit preserves an immutable snapshot. Document Owners can inspect historical states and rollback unauthorized revisions with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Access Control (Role Hierarchy) -->
      <section id="access-control" class="section-block">
        <div class="container">
          <div class="section-heading text-center">
            <h2 class="section-title-large">Server-Enforced Access Control</h2>
            <p class="section-desc-large">
              Three sovereign tiers designed to prevent unauthorized lateral movement and maintain mathematical zero-knowledge privacy.
            </p>
          </div>

          <div class="grid-cols-3 role-grid">
            <!-- Administrator Card -->
            <div class="card role-card role-card-admin">
              <div class="role-badge badge-admin">Master &amp; Secondary Governance</div>
              <div class="role-icon-box">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <h3 class="role-title">Administrator</h3>
              <p class="role-summary">
                Full system management and verified security activity monitoring without reading private document contents.
              </p>
              <ul class="role-features-list">
                <li>System-wide user governance</li>
                <li>Live telemetry &amp; security metrics</li>
                <li>Cryptographic SHA-256 chain verification</li>
                <li>Zero access to document contents</li>
              </ul>
              <button class="btn btn-secondary btn-block" (click)="goToLogin()">
                <span>Platform Governance</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            <!-- Document Owner Card -->
            <div class="card role-card role-card-owner featured">
              <div class="featured-ribbon">Core Workspace</div>
              <div class="role-badge badge-owner">Data Authority</div>
              <div class="role-icon-box">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1F73B7" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <h3 class="role-title">Document Owner</h3>
              <p class="role-summary">
                Manage individual permissions, share files with specific teams, and maintain granular control over your data.
              </p>
              <ul class="role-features-list">
                <li>AES-256-GCM encrypted upload</li>
                <li>Discrete caller permissions</li>
                <li>Tag-based team provisioning</li>
                <li>Snapshot history &amp; rollback</li>
              </ul>
              <button class="btn btn-primary btn-block" (click)="goToLogin()">
                <span>Manage Workspace</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            <!-- Viewer Card -->
            <div class="card role-card role-card-viewer">
              <div class="role-badge badge-viewer">Target Recipient</div>
              <div class="role-icon-box">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <h3 class="role-title">Viewer</h3>
              <p class="role-summary">
                Securely view and search documents with server-enforced access control and tamper-evident audit logs.
              </p>
              <ul class="role-features-list">
                <li>Plain text in-memory decryption</li>
                <li>Copy-protected secure preview</li>
                <li>Controlled collaborative editing</li>
                <li>Audit-tracked session activity</li>
              </ul>
              <button class="btn btn-secondary btn-block" (click)="goToLogin()">
                <span>Access Documents</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Verified Transparency -->
      <section id="transparency" class="section-block">
        <div class="container">
          <div class="transparency-card card">
            <div class="transparency-grid">
              <div class="transparency-content">
                <div class="badge badge-warning" style="margin-bottom: 1rem;">Immutable Audit Proof</div>
                <h2 class="section-title-large">Verified Transparency</h2>
                <p class="transparency-desc">
                  Administrators maintain full visibility into security activity without ever accessing private document contents. Our tamper-evident audit logs provide a clear, immutable record of every action taken within your vault, ensuring total accountability and peace of mind.
                </p>
                <div class="transparency-checks">
                  <div class="check-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Continuous SHA-256 Block-Style Hash Chaining</span>
                  </div>
                  <div class="check-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Instant Detection of Manual Database Row Alterations</span>
                  </div>
                  <div class="check-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Comprehensive Security Logging: IP, Timestamp, and Outcome</span>
                  </div>
                </div>
              </div>

              <div class="transparency-visual">
                <div class="transparency-image-box">
                  <img 
                    src="/images/verified-transparency.jpg" 
                    alt="Enterprise Audit Ledger Visualization" 
                    class="transparency-image" 
                  />
                  <div class="transparency-image-caption">
                    <span class="dot-pulse"></span>
                    <span>Continuous SHA-256 Block Chaining &bull; Real-Time Verification</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <!-- Section: Ready to take control? & Inquiry Form -->
      <section id="inquiry" class="section-block inquiry-section">
        <div class="container">
          <div class="inquiry-wrapper">
            <div class="inquiry-intro text-center">
              <h2 class="section-title-large">Ready to take control?</h2>
              <p class="section-desc-large">
                Secure your confidential documents with TrustVault. Our platform provides enterprise-grade encryption and granular access control to ensure your data remains under your complete authority.
              </p>
              <p class="inquiry-subnote">
                Submit your organization details below to request access credentials, tailored security onboarding, and platform provision data.
              </p>
            </div>

            <div class="card inquiry-card">
              <!-- Success Feedback Screen -->
              <div *ngIf="submittedInquiry()" class="inquiry-success-view">
                <div class="success-icon-box">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <h3 class="success-title">Inquiry Logged Successfully!</h3>
                <div class="success-ref-pill">
                  Reference: <strong>{{ submittedInquiry()?.id }}</strong>
                </div>
                <p class="success-message">
                  Thank you, <strong>{{ submittedInquiry()?.fullName }}</strong>. We have registered your request for <strong>{{ submittedInquiry()?.organization }}</strong>.
                </p>
                <div class="success-box-details">
                  <p>Our security onboarding team will review your organization profile and dispatch your dedicated <strong>Document Owner credentials</strong> and platform configuration details to <strong>{{ submittedInquiry()?.email }}</strong>.</p>
                </div>
                <div class="success-actions">
                  <button class="btn btn-primary" (click)="resetInquiryForm()">
                    Submit Another Inquiry
                  </button>
                  <button class="btn btn-secondary" (click)="goToLogin()">
                    Go to Platform Sign In
                  </button>
                </div>
              </div>

              <!-- Interactive Inquiry Form -->
              <form *ngIf="!submittedInquiry()" (ngSubmit)="onSubmitInquiry()" #inquiryForm="ngForm">
                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label" for="fullName">Full Name *</label>
                    <input 
                      id="fullName" 
                      name="fullName" 
                      type="text" 
                      class="form-input" 
                      placeholder="e.g. Sarah Jenkins" 
                      [(ngModel)]="formData.fullName" 
                      required 
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="email">Corporate Email *</label>
                    <input 
                      id="email" 
                      name="email" 
                      type="email" 
                      class="form-input" 
                      placeholder="s.jenkins@enterprise.com" 
                      [(ngModel)]="formData.email" 
                      required 
                    />
                  </div>
                </div>

                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label" for="organization">Organization / Company *</label>
                    <input 
                      id="organization" 
                      name="organization" 
                      type="text" 
                      class="form-input" 
                      placeholder="Acme Global Corporation" 
                      [(ngModel)]="formData.organization" 
                      required 
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="department">Department / Division</label>
                    <input 
                      id="department" 
                      name="department" 
                      type="text" 
                      class="form-input" 
                      placeholder="e.g. Legal & Compliance, M&A, Finance" 
                      [(ngModel)]="formData.department" 
                    />
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 1.25rem;">
                  <label class="form-label" for="requestedRole">Requested Authority Level / Platform Role *</label>
                  <select 
                    id="requestedRole" 
                    name="requestedRole" 
                    class="form-select" 
                    [(ngModel)]="formData.requestedRole" 
                    required
                  >
                    <option value="Owner">Document Owner — Upload, encrypt, and grant viewer permissions (Recommended for team leads, legal, finance)</option>
                    <option value="Admin">Organization Administrator — User governance, key management, and security telemetry (For IT &amp; Security)</option>
                  </select>
                  <span style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem; display: block;">
                    Choose <strong>Document Owner</strong> to manage and control confidential documents. Choose <strong>Organization Administrator</strong> for enterprise governance.
                  </span>
                </div>

                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label" for="useCase">Primary Security Requirement *</label>
                    <select 
                      id="useCase" 
                      name="useCase" 
                      class="form-select" 
                      [(ngModel)]="formData.useCase" 
                      required
                    >
                      <option value="M&A & Confidential Due Diligence">M&amp;A &amp; Confidential Due Diligence</option>
                      <option value="Board Governance & Executive Papers">Board Governance &amp; Executive Papers</option>
                      <option value="Legal Contracts & Intellectual Property">Legal Contracts &amp; Intellectual Property</option>
                      <option value="Financial Audits & Regulatory Filings">Financial Audits &amp; Regulatory Filings</option>
                      <option value="Healthcare & Confidential Records">Healthcare &amp; Confidential Records</option>
                      <option value="Other Enterprise Security Requirements">Other Enterprise Security Requirements</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="teamSize">Target Users / Document Owners</label>
                    <select 
                      id="teamSize" 
                      name="teamSize" 
                      class="form-select" 
                      [(ngModel)]="formData.teamSize"
                    >
                      <option value="1-10 Users">1 - 10 Users</option>
                      <option value="10-50 Users">10 - 50 Users</option>
                      <option value="50-250 Users">50 - 250 Users</option>
                      <option value="Enterprise (250+ Users)">Enterprise (250+ Users)</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="message">Specific Platform Inquiries or Security Invariants</label>
                  <textarea 
                    id="message" 
                    name="message" 
                    rows="3" 
                    class="form-textarea" 
                    placeholder="Describe any compliance standards (SOC 2, ISO 27001, HIPAA), custom key storage requirements, or deployment models..." 
                    [(ngModel)]="formData.message"
                  ></textarea>
                </div>

                <div class="form-agreement">
                  <input type="checkbox" id="agree" name="agree" [(ngModel)]="agreeTerms" required />
                  <label for="agree">
                    I confirm this request is for verified business purposes and agree to receive provisioned credential details and security onboarding packages.
                  </label>
                </div>

                <button 
                  type="submit" 
                  class="btn btn-primary btn-block btn-lg" 
                  [disabled]="!inquiryForm.valid || !agreeTerms || isSubmitting()"
                >
                  <span *ngIf="!isSubmitting()">Submit Inquiry &amp; Request Credentials</span>
                  <span *ngIf="isSubmitting()">Logging Organization Invariants...</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer Matching Reference Site -->
      <footer class="landing-footer">
        <div class="container footer-container">
          <div class="footer-brand-col">
            <div class="brand-link">
              <img src="/images/trustvault-monogram.png" alt="TrustVault Logo" class="brand-logo" />
              <span class="brand-text">TrustVault</span>
            </div>

            <p class="footer-tagline">
              Secure document sharing for professionals and organizations.
            </p>
          </div>

          <div class="footer-contact-col">
            <h4 class="footer-col-title">Corporate Headquarters</h4>
            <p class="footer-address">
              123 Secure Way, Suite 400, Tech District, CA 94105
            </p>
            <p class="footer-email">
              <a href="mailto:hello@trustvault.com">hello&#64;trustvault.com</a>
            </p>
          </div>

          <div class="footer-links-col">
            <h4 class="footer-col-title">Platform &amp; Navigation</h4>
            <ul class="footer-nav">
              <li><a href="#architecture">Architectural Integrity</a></li>
              <li><a href="#access-control">Access Control Tiers</a></li>
              <li><a href="#transparency">Audit Trail Proof</a></li>
              <li><a (click)="goToLogin()" style="cursor: pointer;">Client Sign In</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <div class="container footer-bottom-inner">
            <span>&copy; 2026 TrustVault. All rights reserved.</span>
            <span>Cryptographic Platform Built for Enterprise Security Invariants.</span>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .landing-page {
      min-height: 100vh;
      color: #ffffff;
      position: relative;
      overflow-x: hidden;
      background: 
        linear-gradient(135deg, rgba(176, 127, 2, 0.20) 0%, rgba(85, 38, 18, 0.30) 100%),
        url('/images/executive-office-bg.png') center/cover fixed no-repeat,
        #15100b;
    }

    /* Ambient Soft Warm Light Mesh with 60% Transparency, keeping photo visible */
    .interactive-ambient-mesh {
      position: fixed;
      inset: -150px;
      pointer-events: none;
      z-index: 0;
      background: 
        radial-gradient(circle 800px at 15% 15%, rgba(176, 127, 2, 0.18), transparent 55%),
        radial-gradient(circle 700px at 85% 35%, rgba(53, 51, 205, 0.14), transparent 50%),
        radial-gradient(circle 650px at 50% 75%, rgba(176, 127, 2, 0.14), transparent 55%);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: transform;
    }

    /* Refined Cursor Spotlight with Golden Amber & Electric Blue Glow */
    .interactive-cursor-spotlight {
      position: fixed;
      top: -140px;
      left: -140px;
      width: 280px;
      height: 280px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 5;
      background: radial-gradient(circle, rgba(176, 127, 2, 0.40) 0%, rgba(53, 51, 205, 0.25) 45%, transparent 70%);
      mix-blend-mode: screen;
      opacity: 0.55;
      transition: transform 0.04s linear;
      will-change: transform;
    }

    .interactive-grid-lines {
      position: fixed;
      inset: -50px;
      pointer-events: none;
      z-index: 0;
      background-image: 
        linear-gradient(rgba(176, 127, 2, 0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(176, 127, 2, 0.07) 1px, transparent 1px);
      background-size: 56px 56px;
      transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: transform;
    }

    .hero-highlight {
      color: #ffd166;
      background: linear-gradient(135deg, #ffd166 0%, #b07f02 50%, #c7d2fe 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* Section Hierarchy */
    .landing-header, .hero-section, section, footer {
      position: relative;
      z-index: 1;
    }

    /* Sticky Navigation Header with #552612 60% Transparency */
    .landing-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(85, 38, 18, 0.60);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border-bottom: 1px solid rgba(176, 127, 2, 0.35);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 16px rgba(176, 127, 2, 0.12);
    }
    .nav-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0.85rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      cursor: pointer;
    }
    .brand-logo {
      height: 40px;
      width: 40px;
      border-radius: 10px;
      object-fit: cover;
      border: 1px solid rgba(56, 189, 248, 0.35);
      box-shadow: 0 4px 14px rgba(31, 115, 183, 0.35);
      transition: all 0.25s ease;
    }
    .brand-link:hover .brand-logo {
      transform: scale(1.08) rotate(-2deg);
      box-shadow: 0 6px 20px rgba(24, 147, 122, 0.45);
      border-color: rgba(24, 147, 122, 0.6);
    }
    .brand-text {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #FFFFFF !important;
      font-family: var(--font-sans);
    }
    .nav-links {
      display: flex;
      gap: 1.75rem;
      align-items: center;
    }
    .nav-item {
      color: #94a3b8;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .nav-item:hover {
      color: #38bdf8;
      transform: translateY(-1px);
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Hero Section */
    .hero-section {
      padding: 6.5rem 0 5.5rem;
      background: transparent;
      border-bottom: 1px solid rgba(176, 127, 2, 0.20);
      position: relative;
    }
    .hero-container {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 3.5rem;
      align-items: center;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(85, 38, 18, 0.48);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(176, 127, 2, 0.45);
      color: #ffd166;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.45rem 1rem;
      border-radius: 9999px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 1.5rem;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.35);
    }
    .hero-badge:hover {
      background: rgba(85, 38, 18, 0.70);
      border-color: #ffd166;
    }
    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    .hero-title {
      font-size: 3.25rem;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: #FFFFFF;
      margin-bottom: 1.25rem;
    }
    .hero-subtitle {
      font-size: 1.15rem;
      color: #FFFFFF;
      font-weight: 500;
      line-height: 1.6;
      margin-bottom: 2rem;
      max-width: 620px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
    }
    .hero-buttons {
      display: flex;
      gap: 1rem;
      margin-bottom: 2.5rem;
      flex-wrap: wrap;
    }
    .btn-lg {
      padding: 0.85rem 1.75rem;
      font-size: 1rem;
      border-radius: 12px;
    }
    .hero-trust-bar {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .trust-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: #cbd5e1;
      font-weight: 600;
      transition: color 0.2s ease;
    }
    .trust-item:hover {
      color: #FFFFFF;
    }
    .trust-divider {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.25);
    }

    /* Hero Preview Card: #552612 60% Transparency */
    .hero-preview-card {
      padding: 2.2rem;
      border-radius: 20px;
      background: rgba(85, 38, 18, 0.60);
      border: 1px solid rgba(176, 127, 2, 0.38);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.70), 0 0 30px rgba(176, 127, 2, 0.15);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hero-preview-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 35px 75px rgba(0, 0, 0, 0.80), 0 0 45px rgba(176, 127, 2, 0.35);
      border-color: rgba(176, 127, 2, 0.70);
    }
    .preview-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .card-logo {
      height: 44px;
      width: 44px;
      border-radius: 10px;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }
    .preview-app-title {
      display: block;
      font-size: 1.1rem;
      font-weight: 700;
      color: #FFFFFF;
    }
    .preview-status {
      font-size: 0.75rem;
      color: #10b981;
      font-weight: 700;
    }
    .preview-stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .preview-stat {
      background: rgba(85, 38, 18, 0.48);
      border: 1px solid rgba(176, 127, 2, 0.35);
      border-radius: 12px;
      padding: 1rem;
      backdrop-filter: blur(16px);
      transition: all 0.2s ease;
    }
    .preview-stat:hover {
      background: rgba(85, 38, 18, 0.70);
      border-color: rgba(176, 127, 2, 0.60);
      transform: translateY(-2px);
    }
    .stat-number {
      display: block;
      font-size: 1.5rem;
      font-weight: 800;
      color: #FFFFFF;
    }
    .stat-label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.85);
      margin-top: 0.2rem;
    }
    .core-image-wrapper {
      position: relative;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(176, 127, 2, 0.40);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      background: rgba(85, 38, 18, 0.50);
    }
    .core-image {
      width: 100%;
      height: 260px;
      object-fit: cover;
      display: block;
      transition: transform 0.4s ease;
    }
    .core-image-wrapper:hover .core-image {
      transform: scale(1.03);
    }
    .core-image-overlay-badge {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(85, 38, 18, 0.80);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(176, 127, 2, 0.55);
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
    .dot-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulseTeal 2s infinite;
    }
    @keyframes pulseTeal {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.3); }
    }

    /* Sections Shared Styling: Unified Warm Light Theme */
    .section-block {
      padding: 5.5rem 0;
      background: transparent;
      backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(176, 127, 2, 0.18);
    }
    #architecture {
      background: linear-gradient(180deg, rgba(18, 14, 10, 0.90) 0%, rgba(85, 38, 18, 0.85) 100%), url('/images/trustvault-core.jpg') center/cover no-repeat;
      position: relative;
    }
    #transparency {
      background: linear-gradient(180deg, rgba(18, 14, 10, 0.90) 0%, rgba(85, 38, 18, 0.85) 100%), url('/images/verified-transparency.jpg') center/cover no-repeat;
      position: relative;
    }
    .section-heading {
      max-width: 850px;
      margin: 0 auto 3.5rem;
    }
    .text-center {
      text-align: center;
    }
    .section-title-large {
      font-size: 2.4rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #FFFFFF;
      margin-bottom: 1rem;
    }
    .section-desc-large {
      font-size: 1.05rem;
      color: rgba(255, 255, 255, 0.90);
      line-height: 1.7;
    }

    /* ========================================================
       PLATFORM WORKFLOW PROCESS (HOW TRUSTVAULT WORKS)
       ======================================================== */
    .workflow-section {
      background: linear-gradient(180deg, rgba(176, 127, 2, 0.10) 0%, rgba(85, 38, 18, 0.18) 100%);
      border-top: 1px solid rgba(176, 127, 2, 0.18);
      border-bottom: 1px solid rgba(176, 127, 2, 0.18);
    }
    .workflow-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(176, 127, 2, 0.20);
      border: 1px solid rgba(176, 127, 2, 0.40);
      color: #ffd166;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.4rem 0.9rem;
      border-radius: 9999px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 1.25rem;
    }
    .badge-dot-teal {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ffd166;
      box-shadow: 0 0 8px #ffd166;
    }
    .workflow-flow-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      margin-top: 3.5rem;
      position: relative;
    }
    @media (max-width: 1024px) {
      .workflow-flow-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 640px) {
      .workflow-flow-grid {
        grid-template-columns: 1fr;
      }
    }
    .workflow-card {
      background: rgba(85, 38, 18, 0.48);
      border: 1px solid rgba(176, 127, 2, 0.32);
      border-radius: 18px;
      padding: 2rem 1.6rem;
      position: relative;
      display: flex;
      flex-direction: column;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
    }
    .workflow-card:hover {
      transform: translateY(-5px);
      border-color: rgba(176, 127, 2, 0.60);
      box-shadow: 0 18px 45px rgba(0, 0, 0, 0.55), 0 0 25px rgba(176, 127, 2, 0.20);
    }
    .step-indicator {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }
    .step-num {
      font-family: var(--font-mono);
      font-size: 1.1rem;
      font-weight: 800;
      color: #ffd166;
      letter-spacing: 0.05em;
      background: rgba(176, 127, 2, 0.22);
      padding: 0.25rem 0.65rem;
      border-radius: 8px;
      border: 1px solid rgba(176, 127, 2, 0.40);
    }
    .step-connector {
      height: 2px;
      flex: 1;
      margin-left: 1rem;
      background: linear-gradient(90deg, rgba(176, 127, 2, 0.4), rgba(53, 51, 205, 0.2));
      border-radius: 2px;
    }
    .workflow-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      transition: transform 0.25s ease;
      background: rgba(176, 127, 2, 0.20);
      border: 1px solid rgba(176, 127, 2, 0.40);
      color: #ffd166;
    }
    .workflow-card:hover .workflow-icon-box {
      transform: scale(1.08);
      background: #b07f02;
      color: #000000;
    }
    .icon-teal { color: #ffd166; }
    .icon-blue { color: #c7d2fe; }
    .icon-purple { color: #ffd166; }
    .icon-emerald { color: #c7d2fe; }
    .workflow-role-tag {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.35rem;
      color: #ffd166;
    }
    .tag-client { color: #ffd166; }
    .tag-admin { color: #c7d2fe; }
    .tag-owner { color: #ffd166; }
    .tag-viewer { color: #c7d2fe; }
    .workflow-card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 0.65rem;
      letter-spacing: -0.01em;
    }
    .workflow-card-desc {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.88);
      line-height: 1.55;
      margin-bottom: 1.25rem;
      flex: 1;
    }
    .workflow-pill-row {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-top: auto;
    }
    .workflow-pill {
      font-size: 0.7rem;
      font-weight: 600;
      color: #ffffff;
      background: rgba(45, 18, 8, 0.55);
      border: 1px solid rgba(176, 127, 2, 0.25);
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      display: inline-block;
    }

    /* Architecture Features Grid: #552612 60% Translucent Containers */
    .grid-cols-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.75rem;
    }
    .feature-card {
      padding: 2.25rem 2rem;
      background: rgba(85, 38, 18, 0.48);
      border: 1px solid rgba(176, 127, 2, 0.32);
      border-radius: 18px;
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .feature-card:hover {
      transform: translateY(-4px);
      border-color: rgba(176, 127, 2, 0.60);
      box-shadow: 0 18px 40px -8px rgba(0, 0, 0, 0.55), 0 0 20px rgba(176, 127, 2, 0.15);
    }
    .feature-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(176, 127, 2, 0.22);
      border: 1px solid rgba(176, 127, 2, 0.40);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      transition: all 0.2s ease;
      color: #ffd166;
    }
    .feature-card:hover .feature-icon-wrapper {
      background: #b07f02;
      color: #000000;
      transform: scale(1.06);
    }
    .feature-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 0.6rem;
    }
    .feature-text {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.88);
      line-height: 1.6;
    }

    /* Role Cards */
    .role-card {
      padding: 2.5rem 2rem;
      display: flex;
      flex-direction: column;
      position: relative;
      border-radius: 18px;
      overflow: hidden;
      backdrop-filter: blur(18px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.45);
      background: rgba(85, 38, 18, 0.48);
      border: 1px solid rgba(176, 127, 2, 0.35);
    }
    .role-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 22px 50px rgba(0, 0, 0, 0.60);
      border-color: rgba(176, 127, 2, 0.65);
    }
    .role-card-admin {
      border: 1px solid rgba(176, 127, 2, 0.45);
    }
    .role-card-owner {
      border: 1px solid rgba(176, 127, 2, 0.60);
      box-shadow: 0 14px 34px rgba(176, 127, 2, 0.20);
    }
    .role-card-viewer {
      border: 1px solid rgba(176, 127, 2, 0.40);
    }
    .featured-ribbon {
      position: absolute;
      top: -12px;
      right: 20px;
      background: linear-gradient(135deg, #552612 0%, #b07f02 100%);
      color: white;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      border: 1px solid rgba(176, 127, 2, 0.6);
    }
    .role-badge {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .badge-admin { color: #f87171; }
    .badge-owner { color: #a5b4fc; font-weight: 800; }
    .badge-viewer { color: #6ee7b7; }
    .role-icon-box {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      transition: all 0.2s ease;
    }
    .role-card:hover .role-icon-box {
      transform: scale(1.06);
    }
    .role-title {
      font-size: 1.45rem;
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 0.75rem;
    }
    .role-summary {
      font-size: 0.875rem;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .role-features-list {
      list-style: none;
      margin-bottom: 2rem;
      flex: 1;
      padding: 0;
    }
    .role-features-list li {
      font-size: 0.85rem;
      color: #cbd5e1;
      padding: 0.4rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .role-features-list li::before {
      content: '✓';
      color: #10b981;
      font-weight: 800;
    }
    .btn-block {
      width: 100%;
    }

    /* Transparency Section */
    .transparency-card {
      padding: 3.5rem;
      border-radius: 24px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(11, 15, 25, 0.98) 100%);
      border: 1px solid rgba(16, 185, 129, 0.35);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .transparency-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 35px 70px rgba(0, 0, 0, 0.7);
      border-color: rgba(16, 185, 129, 0.55);
    }
    .transparency-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 3rem;
      align-items: center;
    }
    .transparency-desc {
      font-size: 1.05rem;
      color: #94a3b8;
      line-height: 1.7;
      margin-bottom: 2rem;
    }
    .transparency-checks {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .check-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.9rem;
      color: #cbd5e1;
      font-weight: 600;
    }
    .transparency-image-box {
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(56, 189, 248, 0.35);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      background: #0b0f19;
      position: relative;
    }
    .transparency-image {
      width: 100%;
      height: 340px;
      object-fit: cover;
      display: block;
      transition: transform 0.4s ease;
    }
    .transparency-image-box:hover .transparency-image {
      transform: scale(1.02);
    }
    .transparency-image-caption {
      padding: 0.75rem 1rem;
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid rgba(16, 185, 129, 0.4);
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: #ffffff;
    }

    /* Inquiry Form Section */
    .inquiry-section {
      padding: 5.5rem 0 6.5rem;
      background: linear-gradient(180deg, rgba(85, 38, 18, 0.65) 0%, rgba(18, 14, 10, 0.90) 100%);
    }
    .inquiry-wrapper {
      max-width: 820px;
      margin: 0 auto;
    }
    .inquiry-intro {
      margin-bottom: 2.5rem;
    }
    .inquiry-subnote {
      font-size: 0.95rem;
      color: #ffd166;
      font-weight: 700;
      margin-top: 0.75rem;
    }
    .inquiry-card {
      padding: 2.75rem 3rem;
      border-radius: 20px;
      background: rgba(85, 38, 18, 0.60);
      border: 1px solid rgba(176, 127, 2, 0.38);
      box-shadow: 0 25px 65px rgba(0, 0, 0, 0.75), 0 0 35px rgba(176, 127, 2, 0.16);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .inquiry-card:hover {
      box-shadow: 0 35px 80px rgba(0, 0, 0, 0.85), 0 0 45px rgba(176, 127, 2, 0.30);
      border-color: rgba(176, 127, 2, 0.70);
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }
    .form-label {
      color: #ffffff;
      font-size: 0.825rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
      display: block;
    }
    .form-input, .form-select, .form-textarea {
      background: rgba(45, 18, 8, 0.75) !important;
      border: 1px solid rgba(176, 127, 2, 0.35) !important;
      color: #FFFFFF !important;
      border-radius: 9px;
      padding: 0.75rem 1rem;
      width: 100%;
      box-sizing: border-box;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: #ffd166 !important;
      box-shadow: 0 0 0 3px rgba(176, 127, 2, 0.40) !important;
      background: rgba(55, 22, 10, 0.90) !important;
    }
    .form-agreement {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin: 1.5rem 0 2rem;
      font-size: 0.825rem;
      color: #94a3b8;
      line-height: 1.5;
    }
    .form-agreement input {
      margin-top: 0.2rem;
      accent-color: #38bdf8;
    }

    /* Success View */
    .inquiry-success-view {
      text-align: center;
      padding: 1.5rem 0;
    }
    .success-icon-box {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .success-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 0.75rem;
    }
    .success-ref-pill {
      display: inline-block;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid #38bdf8;
      color: #38bdf8;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.3rem 0.9rem;
      border-radius: 9999px;
      margin-bottom: 1.25rem;
    }
    .success-message {
      font-size: 1.05rem;
      color: #cbd5e1;
      margin-bottom: 1.5rem;
    }
    .success-box-details {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 12px;
      padding: 1.25rem;
      font-size: 0.9rem;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 2rem;
      text-align: left;
    }
    .success-box-details strong {
      color: #FFFFFF;
    }
    .success-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    /* Full-Bleed Site Footer — Exact 60% Espresso Container */
    .landing-footer {
      background: rgba(85, 38, 18, 0.60);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      color: #ffffff;
      border-top: 1px solid rgba(176, 127, 2, 0.35);
      padding: 4.5rem 0 0;
      position: relative;
      z-index: 1;
    }
    .footer-container {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr;
      gap: 3rem;
      padding-bottom: 3.5rem;
    }
    .landing-footer .brand-link {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
    }
    .landing-footer .brand-text {
      color: #FFFFFF !important;
      font-weight: 700;
      font-size: 1.25rem;
      letter-spacing: -0.02em;
    }
    .footer-tagline {
      margin-top: 1rem;
      font-size: 0.9rem;
      color: #94a3b8;
      line-height: 1.6;
      max-width: 320px;
    }
    .footer-col-title {
      color: #FFFFFF;
      font-size: 0.95rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      letter-spacing: -0.01em;
    }
    .footer-address {
      font-size: 0.875rem;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 0.75rem;
    }
    .footer-email a {
      color: #ffd166;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      transition: color 0.2s ease;
    }
    .footer-email a:hover {
      color: #ffffff;
    }
    .footer-nav {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .footer-nav a {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.875rem;
      transition: color 0.2s ease;
    }
    .footer-nav a:hover {
      color: #FFFFFF;
    }
    .footer-bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1.5rem 0;
      font-size: 0.8rem;
      color: #64748b;
    }
    .footer-bottom-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    /* Responsive adjustments */
    @media (max-width: 1024px) {
      .hero-container {
        grid-template-columns: 1fr;
      }
      .hero-title {
        font-size: 2.75rem;
      }
      .tree-level {
        flex-direction: column;
        gap: 1rem;
      }
      .tree-svg-connector {
        display: none;
      }
      .grid-cols-3 {
        grid-template-columns: 1fr;
      }
      .transparency-grid {
        grid-template-columns: 1fr;
      }
      .detail-grid {
        grid-template-columns: 1fr;
      }
      .footer-container {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .nav-links {
        display: none;
      }
      .hero-title {
        font-size: 2.25rem;
      }
      .form-grid {
        grid-template-columns: 1fr;
      }
      .inquiry-card {
        padding: 1.5rem;
      }
      .tree-canvas-card {
        padding: 1.75rem 1rem;
      }
      .footer-container {
        grid-template-columns: 1fr;
        gap: 2rem;
      }
    }
  `]
})
export class LandingComponent implements OnInit {
  private router = inject(Router);
  private inquiryService = inject(InquiryService);
  private authService = inject(AuthService);

  mouseX = 0;
  mouseY = 0;
  parallaxX = 0;
  parallaxY = 0;

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    this.parallaxX = Math.round((event.clientX - centerX) * 0.006);
    this.parallaxY = Math.round((event.clientY - centerY) * 0.006);
  }

  ngOnInit(): void {
    // Public landing page displays directly without forcing redirect
  }

  formData = {
    fullName: '',
    email: '',
    organization: '',
    department: '',
    requestedRole: 'Owner',
    useCase: 'Board Governance & Executive Papers',
    teamSize: '10-50 Users',
    message: ''
  };

  agreeTerms = false;
  isSubmitting = signal(false);
  submittedInquiry = signal<ClientInquiry | null>(null);

  scrollToInquiry(): void {
    const el = document.getElementById('inquiry');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  onSubmitInquiry(): void {
    if (!this.formData.fullName || !this.formData.email || !this.formData.organization) {
      return;
    }

    this.isSubmitting.set(true);

    this.inquiryService.submitInquiry({
      fullName: this.formData.fullName,
      email: this.formData.email,
      organization: this.formData.organization,
      department: this.formData.department,
      requestedRole: this.formData.requestedRole,
      useCase: this.formData.useCase,
      teamSize: this.formData.teamSize,
      message: this.formData.message
    }).subscribe({
      next: (record) => {
        this.isSubmitting.set(false);
        this.submittedInquiry.set(record);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.message || 'Could not submit inquiry to server.');
      }
    });
  }

  resetInquiryForm(): void {
    this.formData = {
      fullName: '',
      email: '',
      organization: '',
      department: '',
      requestedRole: 'Owner',
      useCase: 'Board Governance & Executive Papers',
      teamSize: '10-50 Users',
      message: ''
    };
    this.agreeTerms = false;
    this.submittedInquiry.set(null);
  }
}
