import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, UserDto, UserRole } from '../models/api.models';

const TOKEN_KEY = 'trustvault_access_token';
const REFRESH_KEY = 'trustvault_refresh_token';
const USER_KEY = 'trustvault_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = `${environment.apiUrl}/auth`;

  // Reactive state signals
  readonly currentUser = signal<UserDto | null>(this.getStoredUser());
  readonly isAuthenticated = computed(() => this.currentUser() !== null && !!this.getToken());
  readonly userRole = computed<UserRole | null>(() => this.currentUser()?.role ?? null);

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap(res => {
        this.saveAuth(res);
        this.redirectByRole(res.user.role);
      })
    );
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      // Notify backend to invalidate refresh token and audit log logout
      this.http.post(`${this.baseUrl}/logout`, {}).pipe(
        catchError(() => of(null))
      ).subscribe();
    }

    this.clearAuth();
    this.router.navigate(['/login']);
  }

  fetchProfile(): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.baseUrl}/me`).pipe(
      tap(user => {
        this.currentUser.set(user);
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      })
    );
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_KEY);
  }

  redirectByRole(role: UserRole): void {
    switch (role) {
      case 'Admin':
        this.router.navigate(['/admin']);
        break;
      case 'Owner':
        this.router.navigate(['/owner']);
        break;
      case 'Viewer':
        this.router.navigate(['/viewer']);
        break;
      default:
        this.router.navigate(['/login']);
        break;
    }
  }

  private saveAuth(res: AuthResponse): void {
    sessionStorage.setItem(TOKEN_KEY, res.token);
    sessionStorage.setItem(REFRESH_KEY, res.refreshToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private clearAuth(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
  }

  private getStoredUser(): UserDto | null {
    const json = sessionStorage.getItem(USER_KEY);
    if (!json) return null;
    try {
      return JSON.parse(json) as UserDto;
    } catch {
      return null;
    }
  }
}
