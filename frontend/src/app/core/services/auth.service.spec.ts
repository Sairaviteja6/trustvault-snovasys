import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/api.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
  });

  it('should authenticate and redirect to corresponding dashboard based on server response role', () => {
    const mockAuthResponse: AuthResponse = {
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      expiration: new Date().toISOString(),
      user: {
        id: 'user-1',
        username: 'test_owner',
        email: 'owner@trustvault.com',
        role: 'Owner',
        department: 'Legal',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    };

    service.login('owner@trustvault.com', 'Owner@12345!').subscribe(res => {
      expect(res.user.role).toBe('Owner');
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockAuthResponse);

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.userRole()).toBe('Owner');
    expect(router.navigate).toHaveBeenCalledWith(['/owner']);
  });

  it('should clear tokens and navigate to login on logout', () => {
    sessionStorage.setItem('trustvault_access_token', 'test-token');
    service.logout();

    const req = httpTesting.expectOne(`${environment.apiUrl}/auth/logout`);
    req.flush({ message: 'Logged out successfully.' });

    expect(service.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
