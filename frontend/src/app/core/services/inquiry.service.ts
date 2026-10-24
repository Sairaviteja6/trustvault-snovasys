import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClientInquiry {
  id: string;
  fullName: string;
  email: string;
  organization: string;
  department?: string;
  requestedRole: string; // "Owner" or "Admin"
  useCase: string;
  teamSize: string;
  message?: string;
  createdAt: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Contacted';
  provisionedUserId?: string;
  provisionedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InquiryService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/inquiries`;

  inquiries = signal<ClientInquiry[]>([]);

  constructor() {
    this.refreshInquiries();
  }

  refreshInquiries(): void {
    this.http.get<ClientInquiry[]>(this.baseUrl).subscribe({
      next: (list) => {
        this.inquiries.set(list);
        try {
          localStorage.setItem('trustvault_cached_inquiries', JSON.stringify(list));
        } catch {}
      },
      error: () => {
        try {
          const cached = localStorage.getItem('trustvault_cached_inquiries');
          if (cached) {
            this.inquiries.set(JSON.parse(cached));
          }
        } catch {}
      }
    });
  }

  submitInquiry(data: {
    fullName: string;
    email: string;
    organization: string;
    department?: string;
    requestedRole: string;
    useCase: string;
    teamSize: string;
    message?: string;
  }): Observable<ClientInquiry> {
    return this.http.post<ClientInquiry>(this.baseUrl, data).pipe(
      tap(created => {
        const current = this.inquiries();
        const updated = [created, ...current.filter(i => i.id !== created.id)];
        this.inquiries.set(updated);
        try {
          localStorage.setItem('trustvault_cached_inquiries', JSON.stringify(updated));
        } catch {}
      })
    );
  }

  approveInquiry(id: string, assignedRole?: string, customPassword?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/approve`, { assignedRole, customPassword }).pipe(
      tap(() => {
        this.refreshInquiries();
      })
    );
  }

  rejectInquiry(id: string, reason?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/reject`, { reason }).pipe(
      tap(() => {
        this.refreshInquiries();
      })
    );
  }

  getOutboxEmails(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/email-outbox`);
  }
}
