import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  AdminMetricsResponse, 
  AuditLogDto, 
  AuditVerificationResult, 
  OwnerMetricsResponse 
} from '../models/api.models';

export interface AuditLogListResponse {
  totalCount: number;
  page: number;
  pageSize: number;
  items: AuditLogDto[];
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private http = inject(HttpClient);
  private adminUrl = `${environment.apiUrl}/admin`;
  private ownerUrl = `${environment.apiUrl}/owner`;

  getAdminMetrics(): Observable<AdminMetricsResponse> {
    return this.http.get<AdminMetricsResponse>(`${this.adminUrl}/metrics`);
  }

  getAdminAuditLogs(filters: { search?: string; status?: string; page?: number; pageSize?: number }): Observable<AuditLogListResponse> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize.toString());

    return this.http.get<AuditLogListResponse>(`${this.adminUrl}/audit-logs`, { params });
  }

  verifyAuditChain(): Observable<AuditVerificationResult> {
    return this.http.get<AuditVerificationResult>(`${this.adminUrl}/audit-verify`);
  }

  getOwnerMetrics(): Observable<OwnerMetricsResponse> {
    return this.http.get<OwnerMetricsResponse>(`${this.ownerUrl}/metrics`);
  }

  getOwnerAuditLogs(filters: { search?: string; documentId?: string; page?: number; pageSize?: number }): Observable<AuditLogListResponse> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.documentId) params = params.set('documentId', filters.documentId);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize.toString());

    return this.http.get<AuditLogListResponse>(`${this.ownerUrl}/audit-logs`, { params });
  }
}
