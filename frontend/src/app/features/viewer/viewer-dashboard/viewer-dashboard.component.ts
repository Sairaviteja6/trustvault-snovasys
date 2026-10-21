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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Document Workspace
          </h1>
          <p class="section-subtitle">
            Access, inspect, and collaborate on confidential documents shared with your identity.
          </p>
        </div>
        <button class="btn btn-secondary" (click)="loadDocuments()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh Documents
        </button>
      </div>

      <!-- Notification Alert -->
      <div class="alert alert-success" *ngIf="successMessage()">
        {{ successMessage() }}
      </div>

      <!-- Documents Table -->
      <div class="card" style="margin-top: 1rem;">
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

          <!-- View mode switcher for documents with both Visual PDF and Extracted Text -->

          <div *ngIf="isPdf(viewingDocContent()) && viewingDocContent()?.textContent" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
            <button 
              type="button" 
              class="btn btn-sm" 
              [ngClass]="viewerMode() === 'pdf' ? 'btn-primary' : 'btn-secondary'"
              (click)="viewerMode.set('pdf')"
            >
              📄 Visual PDF Document
            </button>
            <button 
              type="button" 
              class="btn btn-sm" 
              [ngClass]="viewerMode() === 'text' ? 'btn-primary' : 'btn-secondary'"
              (click)="viewerMode.set('text')"
            >
              📝 Extracted Plain Text
            </button>
          </div>

          <div 
            class="document-content-area"
            (contextmenu)="$event.preventDefault()"
            (copy)="$event.preventDefault()"
            (dragstart)="$event.preventDefault()"
          >
            <!-- Case 1: PDF Document rendered directly in browser via iframe (Default for PDF) -->
            <div *ngIf="isPdf(viewingDocContent()) && viewerMode() === 'pdf' && viewingDocContent()?.base64Data" style="width: 100%; height: 600px;">
              <iframe 
                [src]="getSafePdfUrl(viewingDocContent()!)" 
                style="width: 100%; height: 100%; border: none; border-radius: 6px; background: #ffffff;"
                title="Secure PDF Viewer"
              ></iframe>
            </div>

            <!-- Case 2: Plain text / Code / Markdown / JSON / CSV / XML / PDF Extracted Text -->
            <div *ngIf="viewingDocContent()?.textContent && (!isPdf(viewingDocContent()) || viewerMode() === 'text')">
              <pre class="secure-text-view">{{ viewingDocContent()?.textContent }}</pre>
            </div>

            <!-- Case 3: Image rendered directly in browser -->
            <div *ngIf="isImage(viewingDocContent()) && viewingDocContent()?.base64Data" style="text-align: center; padding: 1rem;">
              <img 
                [src]="getSafeImageUrl(viewingDocContent()!)" 
                style="max-width: 100%; max-height: 540px; object-fit: contain; border-radius: 6px; pointer-events: none; border: 1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.15);" 
                alt="Secure Document Preview"
              />
            </div>

            <!-- Case 4: Other binary (fallback info only, strictly NO DOWNLOAD BUTTON) -->
            <div *ngIf="!viewingDocContent()?.textContent && !isPdf(viewingDocContent()) && !isImage(viewingDocContent())" style="text-align: center; padding: 2.5rem;">
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


          <!-- Rich Editing Toolbar -->
          <div class="editor-toolbar">
            <div class="toolbar-group">
              <button type="button" class="tool-btn" (click)="insertFormatting('heading')" title="Insert Heading">
                H1
              </button>
              <button type="button" class="tool-btn" (click)="insertFormatting('bold')" title="Insert Bold Text">
                <strong>B</strong>
              </button>
              <button type="button" class="tool-btn" (click)="insertFormatting('italic')" title="Insert Italic Text">
                <em>I</em>
              </button>
              <button type="button" class="tool-btn" (click)="insertFormatting('bullet')" title="Insert Bullet Point">
                &bull; List
              </button>
              <button type="button" class="tool-btn" (click)="insertFormatting('timestamp')" title="Insert Timestamp">
                🕒 Time
              </button>
            </div>
            <div class="toolbar-stats">
              <span>Lines: <strong>{{ lineCount }}</strong></span>
              <span>Words: <strong>{{ wordCount }}</strong></span>
              <span>Chars: <strong>{{ charCount }}</strong></span>
            </div>
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
      background: #f8fafc;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 10px;
      padding: 1rem;
      max-height: 640px;
      overflow-y: auto;
    }
    .secure-text-view {
      font-family: var(--font-sans);
      font-size: 0.9rem;
      color: #0f172a;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.6;
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

  documents = signal<DocumentResponse[]>([]);
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

  isPdf(doc: DocumentContentResponse | null): boolean {
    if (!doc) return false;
    return doc.contentType.toLowerCase().includes('pdf') || doc.title.toLowerCase().endsWith('.pdf');
  }

  isImage(doc: DocumentContentResponse | null): boolean {
    if (!doc) return false;
    return doc.contentType.toLowerCase().startsWith('image/');
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

  insertFormatting(type: 'heading' | 'bold' | 'italic' | 'bullet' | 'timestamp'): void {
    if (type === 'heading') {
      this.editBuffer += '\n### New Section Heading\n';
    } else if (type === 'bold') {
      this.editBuffer += '**Important Note** ';
    } else if (type === 'italic') {
      this.editBuffer += '*Revised Text* ';
    } else if (type === 'bullet') {
      this.editBuffer += '\n- Action Item: ';
    } else if (type === 'timestamp') {
      this.editBuffer += ` [Edited on ${new Date().toLocaleString()}] `;
    }
  }

  togglePdfReference(): void {
    this.showPdfRef.update(v => !v);
  }

  onOpenSecureViewer(doc: DocumentResponse): void {
    this.documentService.getContent(doc.id).subscribe({
      next: (content) => {
        this.viewerMode.set('pdf');
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
        this.editBuffer = content.textContent;
        this.editChangeSummary = '';
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
