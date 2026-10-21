import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { InquiryService, ClientInquiry } from '../../core/services/inquiry.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="landing-page">
      <!-- Top Sticky Navigation -->
      <header class="landing-header">
        <div class="nav-container">
          <div class="brand-link" routerLink="/">
            <img src="/images/trustvault-monogram.png" alt="TrustVault Logo" class="brand-logo" />
            <span class="brand-text">TrustVault</span>
          </div>

          <nav class="nav-links">
            <a href="#architecture" class="nav-item">Architecture</a>
            <a href="#access-control" class="nav-item">Access Control</a>
            <a href="#transparency" class="nav-item">Transparency</a>
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
              <span>Zero-Trust Cryptographic Document Platform</span>
            </div>

            <h1 class="hero-title">
              Your documents, organized and under your control.
            </h1>

            <p class="hero-subtitle">
              Share important files with the right people, manage access effortlessly, and keep a clear record of every action.
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#31957B" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>AES-256-GCM Bit-Level Security</span>
              </div>
              <div class="trust-divider"></div>
              <div class="trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2285AC" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Server-Enforced Access Invariants</span>
              </div>
              <div class="trust-divider"></div>
              <div class="trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Tamper-Evident SHA-256 Audit Trail</span>
              </div>
            </div>
          </div>

          <div class="hero-preview-card card">
            <div class="preview-header">
              <img src="/images/trustvault-monogram.png" alt="TrustVault Logo" class="card-logo" />
              <div class="preview-meta">
                <span class="preview-app-title">TrustVault Core</span>
                <span class="preview-status">Operational &bull; Cryptographic Invariants Enforced</span>
              </div>
            </div>

            <!-- Generated TrustVault Core Graphic matching logo color palette -->
            <div class="core-image-wrapper">
              <img 
                src="/images/trustvault-core.jpg" 
                alt="TrustVault Core Zero-Trust Architecture" 
                class="core-image" 
              />
              <div class="core-image-overlay-badge">
                <span class="dot-pulse"></span>
                <span>Cryptographic Core Active</span>
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
            <div class="card role-card">
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
            <div class="card role-card featured">
              <div class="featured-ribbon">Core Workspace</div>
              <div class="role-badge badge-owner">Data Authority</div>
              <div class="role-icon-box">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
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
            <div class="card role-card">
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
      color: var(--text-primary);
      position: relative;
    }

    /* Header */
    .landing-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.90);
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
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
      height: 38px;
      width: 38px;
      border-radius: 9px;
      object-fit: cover;
      border: 1px solid rgba(15, 23, 42, 0.12);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
      transition: transform 0.2s ease;
    }
    .brand-link:hover .brand-logo {
      transform: scale(1.05);
    }
    .brand-text {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
      font-family: var(--font-sans);
    }
    .nav-links {
      display: flex;
      gap: 2rem;
      align-items: center;
    }
    .nav-item {
      color: #475569;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .nav-item:hover {
      color: #0f172a;
      transform: translateY(-1px);
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Hero Section */
    .hero-section {
      padding: 5rem 0 4rem;
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
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.4rem 0.9rem;
      border-radius: 9999px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 1.5rem;
      transition: all 0.2s ease;
    }
    .hero-badge:hover {
      background: #e2e8f0;
      border-color: #94a3b8;
    }
    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #0f172a;
      box-shadow: 0 0 6px rgba(15, 23, 42, 0.35);
    }
    .hero-title {
      font-size: 3.25rem;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: #0f172a;
      margin-bottom: 1.25rem;
    }
    .hero-subtitle {
      font-size: 1.15rem;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 2rem;
      max-width: 620px;
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
      border-top: 1px solid rgba(15, 23, 42, 0.1);
    }
    .trust-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: #475569;
      font-weight: 600;
      transition: color 0.2s ease;
    }
    .trust-item:hover {
      color: #0f172a;
    }
    .trust-divider {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.25);
    }

    /* Hero Preview Card */
    .hero-preview-card {
      padding: 2rem;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(15, 23, 42, 0.12);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hero-preview-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 25px 50px rgba(15, 23, 42, 0.15);
      border-color: rgba(15, 23, 42, 0.25);
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
      border: 1px solid rgba(15, 23, 42, 0.12);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
    }
    .preview-app-title {
      display: block;
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
    }
    .preview-status {
      font-size: 0.75rem;
      color: #059669;
      font-weight: 700;
    }
    .preview-stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .preview-stat {
      background: #f8fafc;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 12px;
      padding: 1rem;
      transition: all 0.2s ease;
    }
    .preview-stat:hover {
      background: #f1f5f9;
      border-color: rgba(15, 23, 42, 0.18);
      transform: translateY(-2px);
    }
    .stat-number {
      display: block;
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
    }
    .stat-label {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.2rem;
    }
    .core-image-wrapper {
      position: relative;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(34, 133, 172, 0.25);
      box-shadow: 0 8px 24px rgba(34, 133, 172, 0.15);
      background: #292A2E;
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
      background: rgba(41, 42, 46, 0.85);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(49, 149, 123, 0.5);
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .dot-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #31957B;
      box-shadow: 0 0 8px #31957B;
      animation: pulseTeal 2s infinite;
    }
    @keyframes pulseTeal {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.3); }
    }


    /* Sections */
    .section-block {
      padding: 5rem 0;
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
      color: #0f172a;
      margin-bottom: 1rem;
    }
    .section-desc-large {
      font-size: 1.05rem;
      color: #475569;
      line-height: 1.7;
    }

    /* Features Grid */
    .grid-cols-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }
    .feature-card {
      padding: 2rem;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(15, 23, 42, 0.10);
      border-radius: 16px;
      transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .feature-card:hover {
      transform: translateY(-4px);
      border-color: rgba(15, 23, 42, 0.30);
      box-shadow: 0 20px 40px -8px rgba(15, 23, 42, 0.12);
    }
    .feature-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #f1f5f9;
      border: 1px solid rgba(15, 23, 42, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      transition: all 0.2s ease;
    }
    .feature-card:hover .feature-icon-wrapper {
      background: #0f172a;
      color: #ffffff;
      transform: scale(1.05);
    }
    .feature-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.6rem;
    }
    .feature-text {
      font-size: 0.9rem;
      color: #475569;
      line-height: 1.6;
    }

    /* Role Cards */
    .role-card {
      padding: 2.25rem 2rem;
      display: flex;
      flex-direction: column;
      position: relative;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(15, 23, 42, 0.10);
      border-radius: 16px;
      transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .role-card:hover {
      transform: translateY(-4px);
      border-color: rgba(15, 23, 42, 0.30);
      box-shadow: 0 20px 40px -8px rgba(15, 23, 42, 0.12);
    }
    .role-card.featured {
      border-color: #0f172a;
      box-shadow: 0 12px 30px -5px rgba(15, 23, 42, 0.15);
    }
    .featured-ribbon {
      position: absolute;
      top: -12px;
      right: 20px;
      background: #0f172a;
      color: white;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
    }
    .role-badge {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .badge-admin { color: #dc2626; }
    .badge-owner { color: #0f172a; font-weight: 800; }
    .badge-viewer { color: #059669; }
    .role-icon-box {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: #f1f5f9;
      border: 1px solid rgba(15, 23, 42, 0.10);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      transition: all 0.2s ease;
    }
    .role-card:hover .role-icon-box {
      background: #0f172a;
      color: #ffffff;
    }
    .role-title {
      font-size: 1.45rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.75rem;
    }
    .role-summary {
      font-size: 0.875rem;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .role-features-list {
      list-style: none;
      margin-bottom: 2rem;
      flex: 1;
    }
    .role-features-list li {
      font-size: 0.85rem;
      color: #334155;
      padding: 0.4rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .role-features-list li::before {
      content: '✓';
      color: #059669;
      font-weight: 800;
    }
    .btn-block {
      width: 100%;
    }

    /* Transparency Section */
    .transparency-card {
      padding: 3rem;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid rgba(15, 23, 42, 0.12);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .transparency-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 24px 45px -8px rgba(15, 23, 42, 0.14);
      border-color: rgba(15, 23, 42, 0.25);
    }
    .transparency-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 3rem;
      align-items: center;
    }
    .transparency-desc {
      font-size: 1.05rem;
      color: #475569;
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
      color: #0f172a;
      font-weight: 600;
    }
    .transparency-image-box {
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(34, 133, 172, 0.25);
      box-shadow: 0 10px 30px rgba(34, 133, 172, 0.16);
      background: #292A2E;
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
      background: rgba(41, 42, 46, 0.95);
      border-top: 1px solid rgba(49, 149, 123, 0.3);
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: #ffffff;
    }
    .hash-chain-box {
      background: #f8fafc;
      border: 1px solid rgba(34, 133, 172, 0.15);
      border-radius: 16px;
      padding: 1.75rem;
    }
    .chain-step {
      background: #ffffff;
      border: 1px solid rgba(34, 133, 172, 0.15);
      border-radius: 10px;
      padding: 0.85rem 1rem;
      transition: all 0.2s ease;
    }
    .chain-step:hover {
      border-color: var(--brand-blue);
      transform: translateY(-2px);
    }
    .chain-step.active {
      border-color: #31957B;
      background: rgba(49, 149, 123, 0.08);
    }
    .step-label {
      font-size: 0.725rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--brand-teal);
    }
    .step-hash {
      font-family: var(--font-mono);
      font-size: 0.775rem;
      color: var(--brand-blue);
      font-weight: 600;
      margin-top: 0.2rem;
    }
    .chain-connector {
      text-align: center;
      color: var(--brand-teal);
      font-size: 1.2rem;
      padding: 0.4rem 0;
    }


    /* Inquiry Form Section */
    .inquiry-section {
      padding: 5rem 0 6rem;
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
      color: #0f172a;
      font-weight: 700;
      margin-top: 0.75rem;
    }
    .inquiry-card {
      padding: 2.5rem 3rem;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(15, 23, 42, 0.14);
      box-shadow: 0 15px 35px -5px rgba(15, 23, 42, 0.08);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .inquiry-card:hover {
      box-shadow: 0 25px 50px -10px rgba(15, 23, 42, 0.15);
      border-color: rgba(15, 23, 42, 0.25);
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }
    .form-agreement {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin: 1.5rem 0 2rem;
      font-size: 0.825rem;
      color: #475569;
      line-height: 1.5;
    }
    .form-agreement input {
      margin-top: 0.2rem;
      accent-color: #0f172a;
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
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .success-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.75rem;
    }
    .success-ref-pill {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.3rem 0.9rem;
      border-radius: 9999px;
      margin-bottom: 1.25rem;
    }
    .success-message {
      font-size: 1.05rem;
      color: #475569;
      margin-bottom: 1.5rem;
    }
    .success-box-details {
      background: #f8fafc;
      border: 1px solid rgba(15, 23, 42, 0.10);
      border-radius: 12px;
      padding: 1.25rem;
      font-size: 0.9rem;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 2rem;
      text-align: left;
    }
    .success-box-details strong {
      color: #0f172a;
    }
    .success-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    /* Footer */
    .landing-footer {
      background: #ffffff;
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      padding: 4rem 0 0;
    }
    .footer-container {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr;
      gap: 3rem;
      padding-bottom: 3rem;
    }
    .footer-tagline {
      font-size: 0.9rem;
      color: #64748b;
      margin-top: 0.75rem;
      line-height: 1.6;
      max-width: 320px;
    }
    .footer-col-title {
      font-size: 0.85rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
      margin-bottom: 1.25rem;
    }
    .footer-address {
      font-size: 0.875rem;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 0.5rem;
    }
    .footer-email a {
      color: #0f172a;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 700;
      transition: color 0.2s;
    }
    .footer-email a:hover {
      text-decoration: underline;
    }
    .footer-nav {
      list-style: none;
    }
    .footer-nav li {
      margin-bottom: 0.6rem;
    }
    .footer-nav a {
      color: #475569;
      font-size: 0.875rem;
      text-decoration: none;
      transition: all 0.2s;
    }
    .footer-nav a:hover {
      color: #0f172a;
      padding-left: 2px;
    }
    .footer-bottom {
      border-top: 1px solid rgba(15, 23, 42, 0.06);
      padding: 1.5rem 0;
      font-size: 0.8rem;
      color: #64748b;
    }
    .footer-bottom-inner {
      display: flex;
      justify-content: space-between;
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
      .grid-cols-3 {
        grid-template-columns: 1fr;
      }
      .transparency-grid {
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
    }
  `]
})
export class LandingComponent {
  private router = inject(Router);
  private inquiryService = inject(InquiryService);

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
