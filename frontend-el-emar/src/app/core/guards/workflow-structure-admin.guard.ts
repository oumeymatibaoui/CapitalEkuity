import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';

/**
 * UX uniquement.
 *
 * ADMIN + IT    : ouvre la page et peut modifier la structure.
 * ADMIN + ACHAT : ouvre la page en consultation uniquement.
 *
 * La vraie sécurité reste côté Spring Boot.
 */
export const workflowStructureAdminGuard:
  CanActivateFn = () => {
  const router = inject(Router);

  const raw =
    localStorage.getItem('connectedUser') ||
    localStorage.getItem('currentUser') ||
    localStorage.getItem('user') ||
    '';

  let role = String(
    localStorage.getItem('roleCode') ||
    localStorage.getItem('userRoleCode') ||
    localStorage.getItem('userRole') ||
    '',
  )
    .trim()
    .toUpperCase();

  let department = String(
    localStorage.getItem('typeUtilisateur') ||
    localStorage.getItem('userType') ||
    '',
  )
    .trim()
    .toUpperCase();

  if (raw) {
    try {
      const user = JSON.parse(raw);

      role = String(
        user?.roleCode ??
        user?.codeRole ??
        role,
      )
        .trim()
        .toUpperCase();

      department = String(
        user?.typeUtilisateur ??
        user?.type ??
        department,
      )
        .trim()
        .toUpperCase();
    } catch {
      // fallback localStorage
    }
  }

  if (department === 'DA' || department === 'ACHATS') {
    department = 'ACHAT';
  }

  const adminRole =
    role === 'ADMIN' ||
    role === 'ROLE_ADMIN';

  const allowed =
    adminRole &&
    (
      department === 'IT' ||
      department === 'ACHAT'
    );

  return allowed
    ? true
    : router.createUrlTree([
        '/el-emar/tableau-de-bord',
      ]);
};
