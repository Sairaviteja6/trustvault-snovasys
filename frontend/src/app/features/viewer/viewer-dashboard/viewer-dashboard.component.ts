import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../../../core/services/document.service';
import { DocumentResponse } from '../../../core/models/api.models';

@Component({
  selector: 'app-viewer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="section-header">
        <div>
          <h1 class="section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Authorized Document Portal
          </h1>
          <p class="section-subtitle">
            Secure workspace: view metadata and stream decrypted files explicitly granted to your identity.
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

      <!-- Zero-Trust Notice -->
      <div class="alert alert-info">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <div>
          <strong>Dynamic Server-Side Evaluation:</strong> Every download request is decrypted on-the-fly and checked against real-time database grants. If access is revoked by the Owner, requests are cut off immediately.
        </div>
      </div>

      <!-- Documents Table -->
      <div class="card" style="margin-top: 1rem;">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Document Details</th>
                <th>Classification</th>
                <th>Owner Identity</th>
                <th>Permitted Capabilities</th>
                <th style="text-align: right;">Access Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let doc of documents()">
                <td>
                  <div style="font-weight: 700; color: #f8fafc;">{{ doc.title }}</div>
                  <div class="font-mono" style="font-size: 0.75rem; color: var(--text-muted);">
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
                      [ngClass]="perm === 'Download' ? 'badge-success' : 'badge-info'"
                    >
                      {{ perm }}
                    </span>
                  </div>
                </td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 0.4rem;">
                    <button class="btn btn-secondary btn-sm" (click)="onPreview(doc)">
                      Metadata
                    </button>
                    <button 
                      class="btn btn-primary btn-sm" 
                      [disabled]="!canDownload(doc)"
                      [title]="canDownload(doc) ? 'Stream decrypted file' : 'Discrete DOWNLOAD permission not granted'"
                      (click)="onDownload(doc)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download
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

    <!-- Metadata Details Modal -->
    <div class="modal-overlay" *ngIf="previewDoc()">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Document Security Metadata</h3>
          <button class="modal-close" (click)="previewDoc.set(null)">&times;</button>
        </div>
        <div class="modal-body" *ngIf="previewDoc() as doc">
          <div class="form-group">
            <label class="form-label">Document Title</label>
            <div style="font-weight: 700; color: #f8fafc; font-size: 1.1rem;">{{ doc.title }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <div style="color: var(--text-secondary); font-size: 0.9rem;">{{ doc.description || 'No description provided.' }}</div>
          </div>
          <div class="grid-cols-2">
            <div class="form-group">
              <label class="form-label">Classification Category</label>
              <div style="color: #fbbf24; font-weight: 600;">{{ doc.category }}</div>
            </div>
            <div class="form-group">
              <label class="form-label">Owner</label>
              <div class="font-mono" style="font-size: 0.85rem;">{{ doc.ownerEmail }}</div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Cryptographic SHA-256 Digest</label>
            <div class="font-mono" style="font-size: 0.775rem; color: #38bdf8; word-break: break-all; background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 6px;">
              {{ doc.fileHashSha256 }}
            </div>
          </div>
          <div class="grid-cols-2">
            <div class="form-group">
              <label class="form-label">File Size</label>
              <div>{{ (doc.fileSizeBytes / 1024).toFixed(2) }} KB</div>
            </div>
            <div class="form-group">
              <label class="form-label">MIME Content Type</label>
              <div class="font-mono" style="font-size: 0.8rem;">{{ doc.contentType }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="previewDoc.set(null)">Close</button>
          <button 
            *ngIf="previewDoc() as doc"
            class="btn btn-primary" 
            [disabled]="!canDownload(doc)"
            (click)="onDownload(doc)"
          >
            Download Decrypted File
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .table td { vertical-align: middle; }
  `]
})
export class ViewerDashboardComponent implements OnInit {
  private documentService = inject(DocumentService);

  documents = signal<DocumentResponse[]>([]);
  previewDoc = signal<DocumentResponse | null>(null);

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.documentService.list().subscribe(docs => {
      this.documents.set(docs);
    });
  }

  canDownload(doc: DocumentResponse): boolean {
    return doc.permittedActions?.includes('Download') || false;
  }

  onPreview(doc: DocumentResponse): void {
    this.documentService.getById(doc.id).subscribe({
      next: (fullDoc) => this.previewDoc.set(fullDoc),
      error: () => this.loadDocuments()
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
