import { inject } from '@angular/core';

import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';

interface StoredUser {
  roleCode?: string | null;
  codeRole?: string | null;
  role?: string | {
    code?: string | null;
    codeRole?: string | null;
  } | null;
  typeUtilisateur?: string | null;
}

export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot
): boolean | UrlTree => {

  const router = inject(Router);

  const token = String(
    localStorage.getItem('token') || ''
  ).trim();

  if (!token) {
    clearInvalidSession();

    return router.createUrlTree([
      '/home'
    ]);
  }

  const roleCode =
    resolveCurrentRoleCode(token);

  if (!roleCode) {
    clearInvalidSession();

    return router.createUrlTree([
      '/home'
    ]);
  }

  const allowedRoles =
    resolveAllowedRoles(route);

  /*
   * Les routes internes El Emar n'ont plus de liste
   * statique de rôles : la session suffit ici et les
   * modules sont contrôlés ensuite par moduleAccessGuard.
   */
  if (allowedRoles.length === 0) {
    return true;
  }

  if (allowedRoles.includes(roleCode)) {
    return true;
  }

  console.warn(
    'ROLE GUARD ACCESS REFUSED',
    {
      roleCode,
      allowedRoles
    }
  );

  if (roleCode === 'CND') {
    return router.createUrlTree([
      '/cnd/nouvelle-candidature'
    ]);
  }

  return router.createUrlTree([
    '/home'
  ]);
};

function resolveAllowedRoles(
  route: ActivatedRouteSnapshot
): string[] {

  const currentRoles =
    normalizeRoleList(
      route.data?.['roles']
    );

  if (currentRoles.length > 0) {
    return currentRoles;
  }

  let parent = route.parent;

  while (parent) {
    const parentRoles =
      normalizeRoleList(
        parent.data?.['roles']
      );

    if (parentRoles.length > 0) {
      return parentRoles;
    }

    parent = parent.parent;
  }

  return [];
}

function normalizeRoleList(
  value: unknown
): string[] {

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(role =>
      String(role || '')
        .trim()
        .toUpperCase()
    )
    .filter(Boolean);
}

function resolveCurrentRoleCode(
  token: string
): string {

  /*
   * IMPORTANT :
   * priorité à l'utilisateur actuellement connecté.
   *
   * Avant, roleCode/userRole étaient lus avant connectedUser.
   * Une ancienne connexion ADMIN pouvait donc rester dans
   * localStorage et bloquer ensuite un vrai candidat CND.
   */
  const storageKeys = [
    'connectedUser',
    'currentUser',
    'candidatUser',
    'elEmarUser',
    'user'
  ];

  for (const key of storageKeys) {
    const rawValue =
      localStorage.getItem(key);

    if (!rawValue) {
      continue;
    }

    try {
      const user =
        JSON.parse(rawValue) as StoredUser;

      const roleValue =
        user?.roleCode ??
        user?.codeRole ??
        (
          typeof user?.role === 'string'
            ? user.role
            : user?.role?.codeRole ??
              user?.role?.code
        ) ??
        user?.typeUtilisateur ??
        '';

      const roleCode =
        String(roleValue || '')
          .trim()
          .toUpperCase();

      if (roleCode) {
        return roleCode;
      }
    } catch {
      // Continuer vers les autres sources.
    }
  }

  /*
   * Clé canonique enregistrée par AuthService.
   */
  const canonicalRole = String(
    localStorage.getItem('userRoleCode') ||
    ''
  )
    .trim()
    .toUpperCase();

  if (canonicalRole) {
    return canonicalRole;
  }

  /*
   * Compatibilité avec les anciennes clés.
   */
  const legacyRole = String(
    localStorage.getItem('roleCode') ||
    localStorage.getItem('userRole') ||
    ''
  )
    .trim()
    .toUpperCase();

  if (legacyRole) {
    return legacyRole;
  }

  /*
   * Dernier recours : rôle contenu dans le JWT.
   */
  const claims =
    decodeJwtPayload(token);

  return String(
    claims?.['role'] ||
    claims?.['roleCode'] ||
    ''
  )
    .trim()
    .toUpperCase();
}

function decodeJwtPayload(
  token: string
): Record<string, unknown> | null {

  try {
    const parts = token.split('.');

    if (parts.length < 2) {
      return null;
    }

    const base64Url = parts[1];

    const base64 = base64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(
        Math.ceil(base64Url.length / 4) * 4,
        '='
      );

    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(character =>
          `%${character
            .charCodeAt(0)
            .toString(16)
            .padStart(2, '0')}`
        )
        .join('')
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function clearInvalidSession(): void {
  [
    'token',
    'userId',

    'roleCode',
    'roleNom',
    'userRole',
    'typeUtilisateur',

    'userRoleId',
    'userRoleCode',
    'userRoleNom',

    'connectedUser',
    'currentUser',

    'elEmarUser',
    'elEmarConnectedUser',

    'candidatUser',
    'candidatUtilisateurId',
    'candidatCandidatureId',
    'candidatMustChangePassword',
    'candidatPremiereConnexion'
  ].forEach(key =>
    localStorage.removeItem(key)
  );
}