import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router,
} from '@angular/router';

import {
  catchError,
  map,
  of,
} from 'rxjs';

import {
  RoleAccessService,
} from '../services/role-access.service';


/**
 * =========================================================
 * MODULE ACCESS GUARD
 * =========================================================
 *
 * Protection dynamique des pages El Emar.
 *
 * SOURCE DE VERITE :
 *
 * GET /api/el-emar/access/me
 *
 * Le backend :
 * - identifie l'utilisateur connecté avec son JWT ;
 * - relit son utilisateur en base ;
 * - relit son role_id actuel ;
 * - retourne uniquement les modules réellement autorisés.
 *
 *
 * Exemple :
 *
 * route :
 *
 * data: {
 *   moduleCode: 'LOTS'
 * }
 *
 *
 * Si LOTS est retourné par /access/me :
 *
 *     accès autorisé
 *
 *
 * Si LOTS n'est pas retourné :
 *
 *     accès refusé
 *
 *
 * IMPORTANT :
 *
 * Aucun rôle n'est hardcodé.
 * Aucun département n'est hardcodé.
 *
 * Les droits peuvent changer dans la configuration système
 * sans modifier ce guard.
 */
export const moduleAccessGuard:
  CanActivateFn = (
    route,
  ) => {

    const roleAccessService =
      inject(
        RoleAccessService,
      );

    const router =
      inject(
        Router,
      );


    // =====================================================
    // MODULE DEMANDE PAR LA ROUTE
    // =====================================================

    const requiredModuleCode =
      normalizeModuleCode(
        route.data?.['moduleCode'],
      );


    /*
     * Si le guard a été ajouté à une route,
     * cette route doit obligatoirement avoir
     * un moduleCode.
     *
     * On bloque par sécurité si le développeur
     * oublie de le renseigner.
     */
    if (!requiredModuleCode) {

      console.error(
        'MODULE ACCESS GUARD : moduleCode manquant.',
        {
          route:
            route.routeConfig?.path,
        },
      );

      return router.createUrlTree([
        '/home',
      ]);
    }


    // =====================================================
    // AUTORISATIONS DYNAMIQUES
    // =====================================================

    return roleAccessService
      .getMyAccess()
      .pipe(

        map(response => {

          /*
           * Même logique que evaluation-candidatures.
           *
           * /access/me retourne déjà uniquement
           * les modules accordés.
           *
           * Donc :
           *
           * présence du code = autorisé.
           *
           * NE PAS refaire :
           *
           * module.autorise === true
           *
           * car le DTO peut sérialiser différemment
           * alors que le backend a déjà filtré.
           */
          const authorizedModuleCodes =
            new Set<string>();


          for (
            const module
            of response?.modules || []
          ) {

            const code =
              normalizeModuleCode(
                module?.codeModule,
              );


            if (code) {

              authorizedModuleCodes
                .add(code);
            }
          }


          // =================================================
          // MODULE AUTORISE
          // =================================================

          if (
            authorizedModuleCodes.has(
              requiredModuleCode,
            )
          ) {

            return true;
          }


          // =================================================
          // MODULE NON AUTORISE
          // =================================================

          console.warn(
            'MODULE ACCESS DENIED',
            {
              module:
                requiredModuleCode,

              route:
                route.routeConfig?.path,
            },
          );


          /*
           * Le DASHBOARD est lui aussi configurable.
           *
           * Donc :
           *
           * si l'utilisateur possède DASHBOARD
           * → retour dashboard
           *
           * sinon
           * → retour home
           *
           * Cela évite une boucle :
           *
           * page interdite
           * → dashboard interdit
           * → dashboard
           * → dashboard...
           */
          if (
            authorizedModuleCodes.has(
              'DASHBOARD',
            )
          ) {

            return router.createUrlTree([
              '/el-emar/dashboard',
            ]);
          }


          return router.createUrlTree([
            '/home',
          ]);
        }),


        // ===================================================
        // ERREUR API
        // ===================================================

        catchError(error => {

          console.error(
            'MODULE ACCESS CHECK ERROR',
            error,
          );


          /*
           * Fail closed.
           *
           * Si les autorisations ne peuvent pas
           * être vérifiées :
           *
           * → on n'ouvre jamais la page.
           */
          return of(
            router.createUrlTree([
              '/home',
            ]),
          );
        }),
      );
  };


/**
 * =========================================================
 * NORMALISATION
 * =========================================================
 *
 * " lots "
 * "Lots"
 * "LOTS"
 *
 * deviennent tous :
 *
 * "LOTS"
 */
function normalizeModuleCode(
  value: unknown,
): string {

  return String(
    value ?? '',
  )
    .trim()
    .toUpperCase();
}