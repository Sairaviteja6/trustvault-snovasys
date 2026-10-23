import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/api.models';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const expectedRoles = route.data['expectedRoles'] as UserRole[] | undefined;
  const currentRole = authService.userRole();
  const tokenRole = authService.getTokenRole();

  // Strict double-check: both stored profile and verified JWT claim must match expected role
  const effectiveRole = tokenRole || currentRole;

  if (expectedRoles && expectedRoles.length > 0) {
    if (!effectiveRole || !expectedRoles.includes(effectiveRole)) {
      // Unauthorized role attempt detected. Redirect directly to the caller's permitted dashboard
      if (effectiveRole) {
        authService.redirectByRole(effectiveRole);
      } else {
        router.navigate(['/login']);
      }
      return false;
    }
  }

  return true;
};
