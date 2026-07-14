import { Injectable, NgZone, ChangeDetectorRef } from '@angular/core';
import * as L from 'leaflet';

/**
 * SafeMapService
 * --------------
 * Ce service enveloppe Leaflet pour que chaque événement
 * (clic, déplacement, zoom, etc.) déclenche correctement
 * la détection de changement d'Angular.
 *
 * Sans ce service : Leaflet met à jour tes données, mais
 * Angular ne rafraîchit pas l'écran tout de suite (bug du
 * "il faut cliquer 2 fois").
 *
 * Avec ce service : l'écran se met à jour immédiatement,
 * dès le premier clic, sur toutes les pages qui l'utilisent.
 */
@Injectable({ providedIn: 'root' })
export class SafeMapService {

  constructor(private ngZone: NgZone) {}

  /**
   * Crée une carte Leaflet, exactement comme L.map(...).
   * À utiliser à la place de L.map(container) directement.
   */
  createMap(container: HTMLElement, options?: L.MapOptions): L.Map {
    return L.map(container, options);
  }

  /**
   * Écoute le clic sur la carte, en s'assurant qu'Angular
   * rafraîchit l'écran immédiatement après.
   *
   * @param map      L'instance de carte Leaflet (this.map)
   * @param callback Ton code habituel (calcul lat/lng, appel API, etc.)
   * @param cdr       Optionnel : ChangeDetectorRef du composant, pour forcer le rendu
   */
  onMapClick(
    map: L.Map,
    callback: (event: L.LeafletMouseEvent) => void,
    cdr?: ChangeDetectorRef
  ): void {
    map.on('click', (event: L.LeafletMouseEvent) => {
      this.ngZone.run(() => {
        callback(event);
        cdr?.detectChanges();
      });
    });
  }

  /**
   * Version générique pour n'importe quel événement Leaflet
   * (move, zoom, drag, dblclick, etc.)
   */
  onMapEvent(
    map: L.Map,
    eventName: string,
    callback: (event: any) => void,
    cdr?: ChangeDetectorRef
  ): void {
    map.on(eventName, (event: any) => {
      this.ngZone.run(() => {
        callback(event);
        cdr?.detectChanges();
      });
    });
  }

  /**
   * Utilitaire : exécute n'importe quel code (ex: résultat d'un
   * appel HTTP externe type Nominatim) en forçant Angular à
   * détecter les changements immédiatement.
   * Pratique pour reverseGeocode / searchAddress si besoin.
   */
  runAndDetect<T>(fn: () => T, cdr?: ChangeDetectorRef): T {
    return this.ngZone.run(() => {
      const result = fn();
      cdr?.detectChanges();
      return result;
    });
  }
}