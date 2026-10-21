import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GrantPermissionRequest, GrantByTagRequest, PermissionResponse } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/documents`;

  list(documentId: string): Observable<PermissionResponse[]> {
    return this.http.get<PermissionResponse[]>(`${this.baseUrl}/${documentId}/permissions`);
  }

  grant(documentId: string, req: GrantPermissionRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${documentId}/permissions/grant`, req);
  }

  grantByTag(documentId: string, req: GrantByTagRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${documentId}/permissions/grant-by-tag`, req);
  }

  revoke(documentId: string, targetUserId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${documentId}/permissions/revoke/${targetUserId}`);
  }
}
