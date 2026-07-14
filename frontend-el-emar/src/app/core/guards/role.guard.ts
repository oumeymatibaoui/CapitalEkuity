import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { UserRole } from '../services/nav.config';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data?.['roles'] as UserRole[] | undefined;
  const currentRole = authService.getUserRole() as UserRole;

  if (!authService.isLoggedIn()) {
    router.navigate(['/home']);
    return false;
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (!allowedRoles.includes(currentRole)) {
    router.navigate(['/home']);
    return false;
  }

  return true;
};