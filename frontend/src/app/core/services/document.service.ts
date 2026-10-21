import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentContentResponse, DocumentResponse, DocumentSnapshotDto, EditDocumentContentRequest } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/documents`;

  list(): Observable<DocumentResponse[]> {
    return this.http.get<DocumentResponse[]>(this.baseUrl);
  }

  search(filters: { query?: string; category?: string; ownerEmail?: string }): Observable<DocumentResponse[]> {
    let params = new HttpParams();
    if (filters.query) params = params.set('query', filters.query);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.ownerEmail) params = params.set('ownerEmail', filters.ownerEmail);

    return this.http.get<DocumentResponse[]>(`${this.baseUrl}/search`, { params });
  }

  getById(id: string): Observable<DocumentResponse> {
    return this.http.get<DocumentResponse>(`${this.baseUrl}/${id}`);
  }

  getContent(id: string): Observable<DocumentContentResponse> {
    return this.http.get<DocumentContentResponse>(`${this.baseUrl}/${id}/content`);
  }

  editContent(id: string, content: string, changeSummary?: string): Observable<{ message: string; version: number }> {
    return this.http.put<{ message: string; version: number }>(`${this.baseUrl}/${id}/content`, {
      content,
      changeSummary
    });
  }

  getSnapshots(id: string): Observable<DocumentSnapshotDto[]> {
    return this.http.get<DocumentSnapshotDto[]>(`${this.baseUrl}/${id}/snapshots`);
  }

  revertSnapshot(id: string, versionNumber: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${id}/revert/${versionNumber}`, {});
  }

  download(id: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/${id}/download`, {
      responseType: 'blob',
      observe: 'response'
    });
  }

  upload(formData: FormData): Observable<DocumentResponse> {
    return this.http.post<DocumentResponse>(`${this.baseUrl}/upload`, formData);
  }

  update(id: string, payload: { title: string; description: string; category: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}

