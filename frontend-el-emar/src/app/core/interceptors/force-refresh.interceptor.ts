import { HttpInterceptorFn } from '@angular/common/http';
import { inject, NgZone } from '@angular/core';
import { finalize } from 'rxjs/operators';

/**
 * forceRefreshInterceptor
 * ------------------------
 * Ce fichier corrige le bug "il faut cliquer 2 fois pour voir les données"
 * sur TOUTE l'application, en une seule fois.
 *
 * Pourquoi c'est nécessaire :
 * Chaque requête HTTP (candidatures, zones, etc.) réussit bien (status 200,
 * données présentes), mais Angular ne "sait" pas toujours qu'il doit
 * rafraîchir l'écran immédiatement après. Ce fichier force explicitement
 * Angular à vérifier et afficher les nouvelles données dès que
 * N'IMPORTE QUELLE requête HTTP se termine (succès OU erreur).
 *
 * Comme il est branché une seule fois au niveau global (dans app.config.ts),
 * il s'applique automatiquement à toutes les pages, sans rien modifier
 * dans les composants existants.
 */
export const forceRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const ngZone = inject(NgZone);

  return next(req).pipe(
    finalize(() => {
      // On "réveille" Angular pour qu'il vérifie et affiche
      // les changements immédiatement, sans attendre un second clic.
      ngZone.run(() => {});
    })
  );
};