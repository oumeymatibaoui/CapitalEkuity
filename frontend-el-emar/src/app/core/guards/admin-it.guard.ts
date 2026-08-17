import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';

interface StoredIdentity {
  roleCode?: string | null;
  codeRole?: string | null;
  role?: string | {
    code?: string | null;
    codeRole?: string | null;
  } | null;
  typeUtilisateur?: string | null;
  departement?: string | null;
}

/**
 * ADMIN IT uniquement :
 *
 * roleCode = ADMIN
 * typeUtilisateur = IT
 *
 * Utilisé pour :
 * - dashboard d'administration technique ;
 * - gestion utilisateurs ;
 * - gestion rôles ;
 * - configuration structurelle du workflow.
 *
 * Ce guard est une protection UX.
 * La sécurité réelle reste côté backend.
 */
export const adminItGuard: CanActivateFn =
  () => {

    const router =
      inject(Router);

    const identity =
      readIdentity();

    if (
      identity.role === 'ADMIN'
      &&
      identity.department === 'IT'
    ) {
      return true;
    }

    return router.createUrlTree([
      '/el-emar/dashboard',
    ]);
  };


function readIdentity(): {
  role: string;
  department: string;
} {

  const keys = [
    'elEmarUser',
    'connectedUser',
    'currentUser',
    'user',
  ];

  for (const key of keys) {

    const raw =
      localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {

      const value =
        JSON.parse(raw) as StoredIdentity;

      const role =
        resolveRole(value);

      const department =
        normalizeDepartment(
          value?.typeUtilisateur
          ??
          value?.departement
        );

      if (role || department) {
        return {
          role,
          department,
        };
      }

    } catch {
      // Essayer la clé suivante.
    }
  }

  return {
    role:
      normalize(
        localStorage.getItem('roleCode')
        ||
        localStorage.getItem('userRoleCode')
        ||
        localStorage.getItem('userRole')
      ),

    department:
      normalizeDepartment(
        localStorage.getItem('typeUtilisateur')
        ||
        localStorage.getItem('userType')
      ),
  };
}


function resolveRole(
  value: StoredIdentity | null | undefined,
): string {

  if (!value) {
    return '';
  }

  if (
    value.role
    &&
    typeof value.role === 'object'
  ) {
    return normalize(
      value.role.code
      ??
      value.role.codeRole
    );
  }

  return normalize(
    value.roleCode
    ??
    value.codeRole
    ??
    value.role
  );
}


function normalize(
  value: unknown,
): string {

  return String(value ?? '')
    .trim()
    .toUpperCase();
}


function normalizeDepartment(
  value: unknown,
): string {

  const department =
    normalize(value);

  switch (department) {

    case 'DA':
    case 'ACHATS':
      return 'ACHAT';

    case 'EL_EMAR':
    case 'EVALUATEUR':
      return 'TECHNIQUE';

    case 'DECIDEUR':
      return 'COMITE';

    default:
      return department;
  }
}
