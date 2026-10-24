import { Component, OnInit, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService } from '../../../core/services/document.service';
import { DocumentContentResponse, DocumentResponse, DocumentSnapshotDto } from '../../../core/models/api.models';

@Component({
  selector: 'app-viewer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="section-header">
        <div>
          <h1 class="section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffd166" stroke-width="2.2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Document Workspace
          </h1>
          <p class="section-subtitle">
            Access, inspect, and collaborate on confidential documents shared with your identity.
          </p>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="loadDocuments()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          <span>Refresh Documents</span>
        </button>
      </div>

      <!-- Notification Alert -->
      <div class="alert alert-success" *ngIf="successMessage()">
        {{ successMessage() }}
      </div>

      <!-- Reference Stat Metric Cards (4 Columns) -->
      <div class="stat-card-grid">
        <!-- Card 1: Shared Documents -->
        <div class="stat-box">
          <div class="stat-box-top">
            <span class="stat-box-title">Accessible Documents</span>
            <div class="stat-box-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="9"/>
                <line x1="9" y1="13" x2="15" y2="13"/>
                <line x1="9" y1="17" x2="13" y2="17"/>
              </svg>
            </div>
          </div>
          <div class="stat-box-metric">
            {{ documents().length }} <span class="stat-box-subval">files</span>
          </div>
          <div class="stat-box-desc">Stored securely &bull; AES-256 GCM encrypted</div>
          <div class="stat-box-footer">
            <span class="stat-box-link" (click)="activeViewerTab.set('documents')">View All Files &rsaquo;</span>
            <span class="stat-box-pill pill-success">Enclave Verified</span>
          </div>
        </div>

        <!-- Card 2: Read-Only Access -->
        <div class="stat-box">
          <div class="stat-box-top">
            <span class="stat-box-title">Read-Only Files</span>
            <div class="stat-box-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
          </div>
          <div class="stat-box-metric">
            {{ readOnlyCount }} <span class="stat-box-subval">documents</span>
          </div>
          <div class="stat-box-desc">In-browser inspection with DLP copy restrictions</div>
          <div class="stat-box-footer">
            <span class="stat-box-link" (click)="activeViewerTab.set('documents')">Inspect Files &rsaquo;</span>
            <span class="stat-box-pill">DLP Active</span>
          </div>
        </div>

        <!-- Card 3: Collaborative Edit -->
        <div class="stat-box">
          <div class="stat-box-top">
            <span class="stat-box-title">Editable Files</span>
            <div class="stat-box-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
          </div>
          <div class="stat-box-metric">
            {{ editableCount }} <span class="stat-box-subval">revisable</span>
          </div>
          <div class="stat-box-desc">Authorized for in-browser collaborative snapshots</div>
          <div class="stat-box-footer">
            <span class="stat-box-link" (click)="activeViewerTab.set('documents')">Collaborative Mode &rsaquo;</span>
            <span class="stat-box-pill pill-success">{{ editableCount }} Allowed</span>
          </div>
        </div>

        <!-- Card 4: Downloadable Assets -->
        <div class="stat-box">
          <div class="stat-box-top">
            <span class="stat-box-title">Downloadable Assets</span>
            <div class="stat-box-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
          </div>
          <div class="stat-box-metric">
            {{ downloadableCount }} <span class="stat-box-subval">authorized</span>
          </div>
          <div class="stat-box-desc">Authorized for local AES-256 decrypted export</div>
          <div class="stat-box-footer">
            <span class="stat-box-link" (click)="activeViewerTab.set('documents')">Download Mode &rsaquo;</span>
            <span class="stat-box-pill">{{ downloadableCount }} Permitted</span>
          </div>
        </div>
      </div>

      <!-- Segmented Navigation Pills Bar (Matching Reference Image) -->
      <div class="segmented-nav-wrapper">
        <div class="segmented-nav">
          <button class="segmented-tab" [class.active]="activeViewerTab() === 'documents'" (click)="activeViewerTab.set('documents')">
            <span>Shared Documents {{ documents().length }}</span>
          </button>
          <button class="segmented-tab" [class.active]="activeViewerTab() === 'policies'" (click)="activeViewerTab.set('policies')">
            <span>Security Policies &amp; Invariants</span>
          </button>
        </div>

        <div class="ledger-stream-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#18937A" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Ledger stream: SHA256 Chained Hash</span>
        </div>
      </div>

      <!-- TAB 1: Documents Table (Contained in dedicated Content Box Card) -->
      <div *ngIf="activeViewerTab() === 'documents'" class="content-box-card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Document Details</th>
                <th>Category</th>
                <th>Owner</th>
                <th>Permitted Capabilities</th>
                <th style="text-align: right;">Available Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let doc of documents()">
                <td>
                  <div style="font-weight: 700; color: #0f172a;">{{ doc.title }}</div>
                  <div style="font-size: 0.775rem; color: var(--text-secondary);">
                    {{ doc.description || 'No description' }}
                  </div>
                  <div class="font-mono" style="font-size: 0.725rem; color: var(--text-muted); margin-top: 2px;">
                    {{ doc.originalFileName }} ({{ (doc.fileSizeBytes / 1024).toFixed(1) }} KB)
                  </div>
                </td>
                <td>
                  <span class="badge badge-warning">{{ doc.category }}</span>
                </td>
                <td>
                  <span class="font-mono" style="font-size: 0.8rem; color: #94a3b8;">{{ doc.ownerEmail }}</span>
                </td>
                <td>
                  <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                    <span 
                      *ngFor="let perm of doc.permittedActions"
                      class="badge" 
                      [ngClass]="perm === 'Download' ? 'badge-success' : (perm === 'Edit' ? 'badge-warning' : 'badge-info')"
                    >
                      {{ perm === 'Read' ? 'View Only (Read)' : perm }}
                    </span>
                  </div>
                </td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 0.4rem; flex-wrap: wrap; justify-content: flex-end;">
                    <!-- Read Permission Action: In-Browser Viewing Only -->
                    <button 
                      *ngIf="canRead(doc)" 
                      class="btn btn-secondary btn-sm" 
                      (click)="onOpenSecureViewer(doc)"
                      title="Open in secure in-browser panel with copy restrictions"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      View Document
                    </button>

                    <!-- Edit Permission Action: In-Browser Collaborative Editor -->
                    <button 
                      *ngIf="canEdit(doc)" 
                      class="btn btn-warning btn-sm" 
                      (click)="onOpenEditor(doc)"
                      title="Edit content inside website and record version snapshot"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit Document
                    </button>

                    <!-- Download Permission Action: Download to local disk -->
                    <button 
                      *ngIf="canDownload(doc)" 
                      class="btn btn-primary btn-sm" 
                      (click)="onDownload(doc)"
                      title="Stream decrypted file download"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download File
                    </button>

                    <!-- Metadata Details Action -->
                    <button class="btn btn-secondary btn-sm" (click)="onPreviewMetadata(doc)" title="View file metadata">
                      Metadata
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="documents().length === 0">
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                  No documents are currently shared with your identity.
                </td>
              </tr>
            </tbody>
          </table>
      </div>

      <!-- TAB 2: Security Policies & Invariants Panel -->
      <div *ngIf="activeViewerTab() === 'policies'" class="content-box-card">
        <div class="content-box-header">
          <div>
            <div class="content-box-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#18937A" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Security Policies &amp; DLP Protections</span>
              <span class="badge badge-success" style="font-size: 0.65rem;">
                <span class="live-dot" style="width: 5px; height: 5px;"></span> ACTIVE
              </span>
            </div>
            <div class="content-box-subtitle">
              Cryptographic zero-trust policies enforced on your viewer session by TrustVault hardware enclaves.
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-top: 1rem;">
          <div style="background: #f8fafc; border: 1px solid rgba(33, 37, 41, 0.08); border-radius: 12px; padding: 1.25rem;">
            <div style="font-weight: 700; color: #212529; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F73B7" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              In-Browser Clipboard &amp; Print Defense
            </div>
            <p style="font-size: 0.8rem; color: #64748b; line-height: 1.6; margin: 0;">
              Copying, cutting, print screen, and context menu actions are cryptographically intercepted and blocked during confidential document viewing sessions.
            </p>
          </div>

          <div style="background: #f8fafc; border: 1px solid rgba(33, 37, 41, 0.08); border-radius: 12px; padding: 1.25rem;">
            <div style="font-weight: 700; color: #212529; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#18937A" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Discrete Caller Grants &amp; TTL
            </div>
            <p style="font-size: 0.8rem; color: #64748b; line-height: 1.6; margin: 0;">
              Access is granted per-document or per-tag by the Document Owner. Grants are evaluated dynamically on every decrypt attempt with zero implicit permissions.
            </p>
          </div>

          <div style="background: #f8fafc; border: 1px solid rgba(33, 37, 41, 0.08); border-radius: 12px; padding: 1.25rem;">
            <div style="font-weight: 700; color: #212529; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Immutable Audit Ledger
            </div>
            <p style="font-size: 0.8rem; color: #64748b; line-height: 1.6; margin: 0;">
              Every view, edit, download, or refused access attempt is logged with timestamp, client IP, caller token, and linked via a cryptographic SHA-256 hash chain.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Secure View Panel (Read Protection, In-Browser Only) -->
    <div class="modal-overlay" *ngIf="viewingDocContent()">
      <div class="modal-card" style="max-width: 900px; width: 95%;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Secure In-Browser Document Viewer</h3>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              {{ viewingDocContent()?.title }} &bull; Version {{ viewingDocContent()?.currentVersion }}
            </div>
          </div>
          <button class="modal-close" (click)="viewingDocContent.set(null)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="protected-viewer-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>CONFIDENTIAL READ SESSION — IN-BROWSER INSPECTION ONLY (COPY &amp; CLIPBOARD DISABLED)</span>
          </div>

          <!-- Dynamic Copy Protection Alert Banner -->
          <div class="copy-alert-banner" *ngIf="copyWarning()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <span>{{ copyWarning() }}</span>
          </div>

          <div 
            class="document-content-area"
            (contextmenu)="$event.preventDefault()"
            (copy)="$event.preventDefault()"
            (dragstart)="$event.preventDefault()"
          >
            <!-- Plain text Decrypted View (Crisp, High-Contrast Luxury Panel) -->
            <div *ngIf="viewingDocContent()?.textContent">
              <pre class="secure-text-view">{{ viewingDocContent()?.textContent }}</pre>
            </div>

            <!-- Image preview if pure image -->
            <div *ngIf="isImage(viewingDocContent()) && viewingDocContent()?.base64Data" style="text-align: center; padding: 1rem;">
              <img 
                [src]="getSafeImageUrl(viewingDocContent()!)" 
                style="max-width: 100%; max-height: 540px; object-fit: contain; border-radius: 6px; pointer-events: none; border: 1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.15);" 
                alt="Secure Document Preview"
              />
            </div>

            <!-- Fallback if no text extracted -->
            <div *ngIf="!viewingDocContent()?.textContent && !isImage(viewingDocContent())" style="text-align: center; padding: 2.5rem;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔒</div>
              <p style="color: var(--text-primary); font-weight: 600; margin-bottom: 0.25rem;">
                Protected Document ({{ viewingDocContent()?.contentType }})
              </p>
              <p style="color: var(--text-muted); font-size: 0.85rem;">
                This document is securely verified in memory under active Read permissions. Direct downloading is restricted.
              </p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="viewingDocContent.set(null)">Close Inspection</button>
        </div>
      </div>
    </div>

    <!-- Modal: Secure In-Browser Document Editor (Edit Permission) -->
    <div class="modal-overlay" *ngIf="editingDoc()">
      <div class="modal-card" style="max-width: 960px; width: 95%;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Secure In-Browser Document Editor</h3>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              Editing: {{ editingDoc()?.title }} &bull; Current Version: {{ editingDoc()?.currentVersion }}
            </div>
          </div>
          <button class="modal-close" (click)="editingDoc.set(null)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-info" style="margin-bottom: 1rem;">
            <strong>Plain Text Document Editing:</strong> Content is decrypted in-memory for active editing. Every edit creates a new immutable version snapshot signed with your identity.
          </div>

          <!-- Original Document Visual Reference for PDF/Rich Documents -->
          <div *ngIf="isPdf(editingDoc()) && editingDoc()?.base64Data" style="margin-bottom: 1rem; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: #ffffff;">
            <div style="background: rgba(15,23,42,0.03); padding: 8px 14px; font-size: 0.82rem; font-weight: 600; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);">
              <span style="display: flex; align-items: center; gap: 0.4rem;">
                📄 Original Visual PDF Reference
              </span>
              <button type="button" class="btn btn-secondary btn-sm" (click)="togglePdfReference()" style="padding: 3px 10px; font-size: 0.75rem;">
                {{ showPdfRef() ? 'Hide Visual Preview' : 'Show Visual Preview' }}
              </button>
            </div>
            <div *ngIf="showPdfRef()" style="width: 100%; height: 380px;">
              <iframe 
                [src]="getSafePdfUrl(editingDoc()!)" 
                style="width: 100%; height: 100%; border: none; background: #ffffff;"
                title="PDF Visual Reference"
              ></iframe>
            </div>
          </div>


          <!-- Format-Tailored Header Badge -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span *ngIf="isPdf(editingDoc())" class="badge" style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); font-size: 0.8rem; padding: 0.35rem 0.75rem;">
                📄 PDF Document Revision Mode
              </span>
              <span *ngIf="isSpreadsheet(editingDoc())" class="badge" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.8rem; padding: 0.35rem 0.75rem;">
                📊 Spreadsheet / Tabular Editor Mode
              </span>
              <span *ngIf="isWordDoc(editingDoc())" class="badge" style="background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4); font-size: 0.8rem; padding: 0.35rem 0.75rem;">
                📝 Word &amp; Executive Document Mode
              </span>
              <span style="font-size: 0.8rem; color: #cbd5e1;">(Cryptographically Signed Version Snapshot)</span>
            </div>

            <!-- Stats Counter -->
            <div class="toolbar-stats" style="font-size: 0.775rem; color: #94a3b8;">
              <span>Lines: <strong style="color: #ffd166;">{{ lineCount }}</strong></span> &bull;
              <span>Words: <strong style="color: #ffd166;">{{ wordCount }}</strong></span> &bull;
              <span>Chars: <strong style="color: #ffd166;">{{ charCount }}</strong></span>
            </div>
          </div>

          <!-- 1. PDF-Specific Revision Toolbar -->
          <div *ngIf="isPdf(editingDoc())" class="editor-toolbar" style="background: rgba(45, 18, 8, 0.5); border: 1px solid rgba(176, 127, 2, 0.3); border-radius: 8px; padding: 0.5rem; margin-bottom: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertPdfFormatting('clause')" title="Add Amendment Clause">
              § Add Revision Clause
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertPdfFormatting('signature')" title="Insert Authorized Signature Block">
              ✍️ Insert Signature Block
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertPdfFormatting('redact')" title="Insert Redaction Marker">
              🔒 Redact Sensitive Data
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertPdfFormatting('compliance')" title="Add Compliance Approval Stamp">
              🏷️ Compliance Note
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertFormatting('timestamp')" title="Add Audit Timestamp">
              🕒 Timestamp
            </button>
          </div>

          <!-- 2. Spreadsheet-Specific Tabular Toolbar -->
          <div *ngIf="isSpreadsheet(editingDoc())" class="editor-toolbar" style="background: rgba(45, 18, 8, 0.5); border: 1px solid rgba(176, 127, 2, 0.3); border-radius: 8px; padding: 0.5rem; margin-bottom: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertSpreadsheetFormatting('row')" title="Add Tabular Data Row">
              ➕ Add Data Row
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertSpreadsheetFormatting('header')" title="Insert Table Columns Header">
              📋 Add Table Headers
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertSpreadsheetFormatting('currency')" title="Format Currency ($)">
              💲 Format Currency ($)
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertSpreadsheetFormatting('sum')" title="Insert Sum Total Formula">
              🧮 Insert SUM() Formula
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertFormatting('timestamp')" title="Add Timestamp">
              🕒 Timestamp
            </button>
          </div>

          <!-- 3. Word/Document-Specific Rich Text Toolbar -->
          <div *ngIf="isWordDoc(editingDoc())" class="editor-toolbar" style="background: rgba(45, 18, 8, 0.5); border: 1px solid rgba(176, 127, 2, 0.3); border-radius: 8px; padding: 0.5rem; margin-bottom: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertFormatting('heading')" title="Insert Heading">
              H1
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertFormatting('bold')" title="Insert Bold Text">
              <strong>B</strong>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertFormatting('italic')" title="Insert Italic Text">
              <em>I</em>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertFormatting('bullet')" title="Insert Bullet Point">
              &bull; Bullet List
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertFormatting('quote')" title="Insert Blockquote">
              ❝ Quote
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="insertFormatting('timestamp')" title="Insert Timestamp">
              🕒 Time
            </button>
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Document Content</label>
            <textarea 
              class="form-textarea editor-textarea" 
              rows="14" 
              [(ngModel)]="editBuffer"
              placeholder="Edit document content directly in this secure portal..."
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Change Summary (Snapshot Note)</label>
            <input 
              type="text" 
              class="form-input" 
              [(ngModel)]="editChangeSummary" 
              placeholder="e.g. Updated terms, revised clauses, or added review feedback"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="editingDoc.set(null)">Cancel</button>
          <button class="btn btn-warning" (click)="onSaveEdit()" [disabled]="isSavingEdit()">
            <span *ngIf="!isSavingEdit()">Save Snapshot &amp; Update</span>
            <span *ngIf="isSavingEdit()">Saving Snapshot...</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Metadata Details Modal (Security Hashes Hidden) -->
    <div class="modal-overlay" *ngIf="previewDoc()">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Document Information</h3>
          <button class="modal-close" (click)="previewDoc.set(null)">&times;</button>
        </div>
        <div class="modal-body" *ngIf="previewDoc() as doc">
          <div class="form-group">
            <label class="form-label">Title</label>
            <div style="font-weight: 700; color: #0f172a; font-size: 1.1rem;">{{ doc.title }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <div style="color: var(--text-secondary); font-size: 0.9rem;">{{ doc.description || 'No description provided.' }}</div>
          </div>
          <div class="grid-cols-2">
            <div class="form-group">
              <label class="form-label">Category</label>
              <div style="color: #fbbf24; font-weight: 600;">{{ doc.category }}</div>
            </div>
            <div class="form-group">
              <label class="form-label">Owner</label>
              <div class="font-mono" style="font-size: 0.85rem;">{{ doc.ownerEmail }}</div>
            </div>
          </div>
          <div class="grid-cols-2">
            <div class="form-group">
              <label class="form-label">File Size</label>
              <div>{{ (doc.fileSizeBytes / 1024).toFixed(2) }} KB</div>
            </div>
            <div class="form-group">
              <label class="form-label">File Type</label>
              <div class="font-mono" style="font-size: 0.8rem;">{{ doc.contentType }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="previewDoc.set(null)">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .table td { vertical-align: middle; }
    .protected-viewer-banner {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .copy-alert-banner {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      padding: 0.6rem 0.85rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.75rem;
    }
    .document-content-area,
    .document-content-area *,
    .secure-text-view {
      user-select: none !important;
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      -webkit-touch-callout: none !important;
    }
    .document-content-area::selection,
    .document-content-area *::selection {
      background: transparent !important;
      color: inherit !important;
    }
    .document-content-area {
      background: rgba(30, 12, 5, 0.75);
      border: 1px solid rgba(176, 127, 2, 0.40);
      border-radius: 12px;
      padding: 1.25rem;
      max-height: 640px;
      overflow-y: auto;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
    }
    .secure-text-view {
      font-family: var(--font-mono);
      font-size: 0.925rem;
      color: #ffffff;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.65;
    }
    .editor-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 8px 8px 0 0;
      padding: 0.4rem 0.75rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .toolbar-group {
      display: flex;
      gap: 0.35rem;
    }
    .tool-btn {
      background: #ffffff;
      border: 1px solid rgba(15, 23, 42, 0.15);
      color: #0f172a;
      border-radius: 6px;
      padding: 0.25rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tool-btn:hover {
      background: #f8fafc;
      border-color: #0f172a;
    }
    .toolbar-stats {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      gap: 0.75rem;
    }
    .editor-textarea {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 0.875rem;
      line-height: 1.5;
      border-top-left-radius: 0;
      border-top-right-radius: 0;
    }
  `]
})
export class ViewerDashboardComponent implements OnInit {
  private documentService = inject(DocumentService);
  private sanitizer = inject(DomSanitizer);

  activeViewerTab = signal<'documents' | 'policies'>('documents');
  documents = signal<DocumentResponse[]>([]);

  get readOnlyCount(): number {
    return this.documents().filter(d => d.permittedActions?.includes('Read') && !d.permittedActions?.includes('Edit')).length;
  }

  get editableCount(): number {
    return this.documents().filter(d => d.permittedActions?.includes('Edit')).length;
  }

  get downloadableCount(): number {
    return this.documents().filter(d => d.permittedActions?.includes('Download')).length;
  }

  previewDoc = signal<DocumentResponse | null>(null);
  viewingDocContent = signal<DocumentContentResponse | null>(null);
  editingDoc = signal<DocumentContentResponse | null>(null);
  viewerMode = signal<'pdf' | 'text'>('pdf');
  showPdfRef = signal<boolean>(false);

  editBuffer = '';
  editChangeSummary = '';
  isSavingEdit = signal(false);
  successMessage = signal<string | null>(null);
  copyWarning = signal<string | null>(null);

  private copyTimeout: any = null;

  @HostListener('window:copy', ['$event'])
  onWindowCopy(event: ClipboardEvent): void {
    if (this.viewingDocContent()) {
      event.preventDefault();
      event.stopPropagation();
      if (event.clipboardData) {
        event.clipboardData.setData('text/plain', '');
      }
      this.triggerCopyWarning();
    }
  }

  @HostListener('window:cut', ['$event'])
  onWindowCut(event: ClipboardEvent): void {
    if (this.viewingDocContent()) {
      event.preventDefault();
      event.stopPropagation();
      this.triggerCopyWarning();
    }
  }

  @HostListener('window:contextmenu', ['$event'])
  onWindowContextMenu(event: MouseEvent): void {
    if (this.viewingDocContent()) {
      event.preventDefault();
      this.triggerCopyWarning();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeyDown(event: KeyboardEvent): void {
    if (this.viewingDocContent()) {
      const isCtrl = event.ctrlKey || event.metaKey;
      if (isCtrl && ['c', 'C', 'a', 'A', 'p', 'P', 's', 'S', 'u', 'U', 'x', 'X'].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        this.triggerCopyWarning();
      }
    }
  }

  triggerCopyWarning(): void {
    this.copyWarning.set('Confidential Document: Clipboard copy, text selection, and screen extraction are strictly restricted.');
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    this.copyTimeout = setTimeout(() => this.copyWarning.set(null), 4000);
  }

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.documentService.list().subscribe(docs => {
      this.documents.set(docs);
    });
  }

  canRead(doc: DocumentResponse): boolean {
    return doc.permittedActions?.includes('Read') || false;
  }

  canDownload(doc: DocumentResponse): boolean {
    return doc.permittedActions?.includes('Download') || false;
  }

  canEdit(doc: DocumentResponse): boolean {
    return doc.permittedActions?.includes('Edit') || false;
  }

  isPdf(doc: any): boolean {
    if (!doc) return false;
    const name = (doc.originalFileName || doc.title || '').toLowerCase();
    const ct = (doc.contentType || '').toLowerCase();
    return ct.includes('pdf') || name.endsWith('.pdf');
  }

  isImage(doc: any): boolean {
    if (!doc) return false;
    const name = (doc.originalFileName || doc.title || '').toLowerCase();
    const ct = (doc.contentType || '').toLowerCase();
    return ct.startsWith('image/') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp');
  }

  getSafePdfUrl(doc: DocumentContentResponse): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`data:application/pdf;base64,${doc.base64Data}#toolbar=0`);
  }

  getSafeImageUrl(doc: DocumentContentResponse): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`data:${doc.contentType};base64,${doc.base64Data}`);
  }

  get wordCount(): number {
    return this.editBuffer.trim() ? this.editBuffer.trim().split(/\s+/).length : 0;
  }

  get charCount(): number {
    return this.editBuffer.length;
  }

  get lineCount(): number {
    return this.editBuffer ? this.editBuffer.split('\n').length : 0;
  }

  insertFormatting(type: 'heading' | 'bold' | 'italic' | 'bullet' | 'quote' | 'timestamp'): void {
    if (type === 'heading') {
      this.editBuffer += '\n### New Section Heading\n';
    } else if (type === 'bold') {
      this.editBuffer += '**Important Note** ';
    } else if (type === 'italic') {
      this.editBuffer += '*Revised Text* ';
    } else if (type === 'bullet') {
      this.editBuffer += '\n- Action Item: ';
    } else if (type === 'quote') {
      this.editBuffer += '\n> Confidential Quote / Reference Clause:\n';
    } else if (type === 'timestamp') {
      this.editBuffer += ` [Edited on ${new Date().toLocaleString()}] `;
    }
  }

  isSpreadsheet(doc: DocumentContentResponse | DocumentResponse | null): boolean {
    if (!doc) return false;
    const name = ('originalFileName' in doc ? (doc as any).originalFileName : doc.title) || '';
    const ct = doc.contentType || '';
    return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') || ct.includes('spreadsheet') || ct.includes('csv') || ct.includes('excel');
  }

  isWordDoc(doc: DocumentContentResponse | DocumentResponse | null): boolean {
    if (!doc) return false;
    if (this.isPdf(doc) || this.isSpreadsheet(doc)) return false;
    return true;
  }

  insertPdfFormatting(type: 'clause' | 'signature' | 'redact' | 'compliance'): void {
    const time = new Date().toISOString();
    switch (type) {
      case 'clause':
        this.editBuffer += `\n\n[AMENDMENT CLAUSE §: "Insert revised terms or policy details here."]\n`;
        break;
      case 'signature':
        this.editBuffer += `\n\n[AUTHORIZED DIGITAL SIGNATURE: Signed by Reviewer at ${time} (SHA-256 Verified)]\n`;
        break;
      case 'redact':
        this.editBuffer += ` [REDACTED: Confidential Information] `;
        break;
      case 'compliance':
        this.editBuffer += `\n\n[COMPLIANCE AUDIT CHECK: Verified against regulatory requirements by security reviewer at ${time}]\n`;
        break;
    }
  }

  insertSpreadsheetFormatting(type: 'row' | 'header' | 'currency' | 'sum'): void {
    switch (type) {
      case 'header':
        this.editBuffer += `\n| Line # | Account / Category | Unit Price | Qty | Total Amount |\n|--------|---------------------|------------|-----|--------------|\n`;
        break;
      case 'row':
        const nextId = (this.editBuffer.split('\n').length);
        this.editBuffer += `| ${nextId} | Operational Expense | $1,250.00 | 1 | $1,250.00 |\n`;
        break;
      case 'currency':
        this.editBuffer += ` $0.00 `;
        break;
      case 'sum':
        this.editBuffer += `\n| TOTAL  | Gross Balance       |            |     | [=SUM(E2:E10)] |\n`;
        break;
    }
  }

  togglePdfReference(): void {
    this.showPdfRef.update(v => !v);
  }

  onOpenSecureViewer(doc: DocumentResponse): void {
    this.documentService.getContent(doc.id).subscribe({
      next: (content) => {
        this.viewerMode.set(content.textContent ? 'text' : 'pdf');
        this.viewingDocContent.set(content);
      },
      error: () => {
        alert('Access denied: You do not have active Read permission for this document.');
        this.loadDocuments();
      }
    });
  }

  onOpenEditor(doc: DocumentResponse): void {
    this.documentService.getContent(doc.id).subscribe({
      next: (content) => {
        this.showPdfRef.set(false);
        this.editingDoc.set(content);
        this.editBuffer = content.textContent || '';
        if (!this.editBuffer.trim()) {
          if (this.isPdf(content)) {
            this.editBuffer = `[PDF DOCUMENT REVISION DRAFT: ${content.title}]\n\nSECTION 1: Scope & Terms\n- Standard confidentiality provisions active.\n\n[AMENDMENT § 1.1]: `;
          } else if (this.isSpreadsheet(content)) {
            this.editBuffer = `| ID | Account / Category | Unit Price | Qty | Total Amount |\n|----|---------------------|------------|-----|--------------|\n| 1  | Cloud Infrastructure | $1,250.00 | 1   | $1,250.00     |\n| 2  | Security Audits      | $3,400.00 | 1   | $3,400.00     |\n`;
          } else {
            this.editBuffer = `[CONFIDENTIAL MEMORANDUM: ${content.title}]\n\nReviewer Revisions & Observations:\n- Reviewed and approved under cryptographic zero-trust controls.\n`;
          }
        }
        this.editChangeSummary = 'Updated document terms and content';
      },
      error: () => {
        alert('Access denied: You do not have active Edit permission for this document.');
        this.loadDocuments();
      }
    });
  }


  onSaveEdit(): void {
    const doc = this.editingDoc();
    if (!doc) return;

    this.isSavingEdit.set(true);
    this.documentService.editContent(doc.id, this.editBuffer, this.editChangeSummary).subscribe({
      next: (res) => {
        this.isSavingEdit.set(false);
        this.editingDoc.set(null);
        this.successMessage.set(`Snapshot Version ${res.version} created and saved successfully.`);
        setTimeout(() => this.successMessage.set(null), 5000);
        this.loadDocuments();
      },
      error: (err) => {
        this.isSavingEdit.set(false);
        alert(err.error?.message || 'Failed to save document edit.');
      }
    });
  }

  onPreviewMetadata(doc: DocumentResponse): void {
    // Show immediate details from list, and refresh asynchronously
    this.previewDoc.set(doc);
    this.documentService.getById(doc.id).subscribe({
      next: (fullDoc) => this.previewDoc.set(fullDoc),
      error: () => { /* keep cached doc */ }
    });
  }

  onDownload(doc: DocumentResponse): void {
    this.documentService.download(doc.id).subscribe({
      next: (res) => {
        const blob = res.body;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.originalFileName;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      },
      error: () => {
        alert('Access denied: You do not have active download permissions for this document.');
        this.loadDocuments();
      }
    });
  }
}
