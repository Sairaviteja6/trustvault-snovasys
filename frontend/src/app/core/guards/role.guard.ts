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

  if (!expectedRoles || (currentRole && expectedRoles.includes(currentRole))) {
    return true;
  }

  // If wrong role, navigate to user's corresponding dashboard instead of error
  if (currentRole) {
    authService.redirectByRole(currentRole);
  } else {
    router.navigate(['/login']);
  }
  return false;
};
