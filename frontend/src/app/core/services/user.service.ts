import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  CreateAdminRequest,
  CreateOwnerRequest, 
  CreateViewerRequest, 
  UserDto, 
  UserTagDto 
} from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private adminUrl = `${environment.apiUrl}/admin`;
  private ownerUrl = `${environment.apiUrl}/owner`;
  private tagsUrl = `${environment.apiUrl}/tags`;

  // Admin capabilities
  getAdminUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.adminUrl}/users`);
  }

  createOwner(req: CreateOwnerRequest): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.adminUrl}/users/owners`, req);
  }

  createSubAdmin(req: CreateAdminRequest): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.adminUrl}/users/admins`, req);
  }

  toggleUserStatus(userId: string): Observable<{ message: string; isActive: boolean }> {
    return this.http.patch<{ message: string; isActive: boolean }>(`${this.adminUrl}/users/${userId}/toggle-status`, null);
  }

  deleteAdminUser(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.adminUrl}/users/${userId}`);
  }

  // Owner capabilities
  getViewers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.ownerUrl}/users/viewers`);
  }

  createViewer(req: CreateViewerRequest): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.ownerUrl}/users/viewers`, req);
  }

  deleteViewer(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.ownerUrl}/users/viewers/${id}`);
  }

  getTags(): Observable<UserTagDto[]> {
    return this.http.get<UserTagDto[]>(this.tagsUrl);
  }

  assignTag(userId: string, tagName: string): Observable<UserTagDto> {
    return this.http.post<UserTagDto>(this.tagsUrl, { userId, tagName });
  }

  deleteTag(tagId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.tagsUrl}/${tagId}`);
  }
}
