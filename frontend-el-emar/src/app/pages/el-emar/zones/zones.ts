import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

import {
  Zone,
  ZoneService
} from '../../../core/services/zone.service';

import {
  SafeMapService
} from '../../../core/services/safe-map.service';

interface ZoneGroup {
  key: string;
  nomZone: string;
  zones: Zone[];
}

@Component({
  selector: 'app-zones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './zones.html',
  styleUrl: './zones.scss'
})
export class Zones implements OnInit {

  @ViewChild('zoneMapContainer')
  zoneMapContainer?: ElementRef<HTMLDivElement>;

  zones: Zone[] = [];

  /**
   * Liste utilisée seulement pour l’affichage.
   *
   * Exemple :
   * Zone 1
   *   - Lac
   *   - Gammarth
   *
   * Zone 2
   *   - Ain Zaghouan
   */
  zoneGroups: ZoneGroup[] = [];

  predefinedZoneNames: Zone[] = [
    {
      nomZone: 'Zone 1',
      adresse: '',
      latitude: null,
      longitude: null,
      description:
        'Classification très haut standing, complexité très élevée. Seuil minimum 80/100.'
    },
    {
      nomZone: 'Zone 2',
      adresse: '',
      latitude: null,
      longitude: null,
      description:
        'Classification haut standing, complexité élevée. Seuil minimum 80/100.'
    },
    {
      nomZone: 'Zone 3',
      adresse: '',
      latitude: null,
      longitude: null,
      description:
        'Classification standard, complexité modérée. Seuil minimum 80/100.'
    }
  ];

  showCustomZoneNameInput = false;

  showModal = false;
  isEditMode = false;
  selectedZoneId: number | null = null;

  map?: L.Map;
  marker?: L.CircleMarker;

  showDeleteModal = false;
  zoneToDelete: Zone | null = null;

  formError = '';
  fieldErrors: Record<string, string> = {};

  form: Zone = this.createEmptyForm();

  constructor(
    private zoneService: ZoneService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private safeMap: SafeMapService
  ) {}

  ngOnInit(): void {
    this.loadZones();
  }

  private createEmptyForm(nomZone = ''): Zone {
    return {
      nomZone,
      adresse: '',
      latitude: null,
      longitude: null,
      description: ''
    };
  }

  /**
   * Charge les zones depuis le backend,
   * puis construit les groupes pour l’affichage.
   */
  loadZones(): void {
    this.zoneService.getAll().subscribe({
      next: data => {
        this.zones = Array.isArray(data)
          ? data
          : [];

        this.buildZoneGroups();
        this.cdr.detectChanges();
      },

      error: err => {
        console.error(
          'ERREUR CHARGEMENT ZONES = ',
          err
        );

        this.zones = [];
        this.zoneGroups = [];

        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Regroupe les lignes qui ont le même nomZone.
   *
   * Une ligne de la base reste un lieu.
   * Le regroupement concerne seulement l’affichage.
   */
  private buildZoneGroups(): void {
    const groups = new Map<string, ZoneGroup>();

    for (const zone of this.zones) {
      const nomZone =
        zone.nomZone?.trim() ||
        'Zone sans nom';

      const key =
        nomZone.toLocaleLowerCase('fr');

      const existingGroup = groups.get(key);

      if (existingGroup) {
        existingGroup.zones.push(zone);
      } else {
        groups.set(key, {
          key,
          nomZone,
          zones: [zone]
        });
      }
    }

    this.zoneGroups = Array
      .from(groups.values())

      // Trier les lieux de chaque groupe par adresse
      .map(group => ({
        ...group,

        zones: [...group.zones].sort(
          (firstZone, secondZone) =>
            String(firstZone.adresse || '')
              .localeCompare(
                String(secondZone.adresse || ''),
                'fr',
                {
                  sensitivity: 'base',
                  numeric: true
                }
              )
        )
      }))

      // Trier les groupes : Zone 1, Zone 2, Zone 3...
      .sort(
        (firstGroup, secondGroup) =>
          firstGroup.nomZone.localeCompare(
            secondGroup.nomZone,
            'fr',
            {
              sensitivity: 'base',
              numeric: true
            }
          )
      );
  }

  resetErrors(): void {
    this.formError = '';
    this.fieldErrors = {};
  }

  handleApiError(err: any): void {
    console.log(
      'API ERROR ZONE = ',
      err
    );

    const message =
      err?.error?.message ||
      err?.error?.detail ||
      err?.error?.error ||
      'Une erreur est survenue';

    this.formError = message;

    this.fieldErrors =
      err?.error?.errors || {};

    const lowerMessage =
      String(message).toLowerCase();

    if (
      lowerMessage.includes('localisation')
    ) {
      this.fieldErrors['localisation'] =
        message;
    }

    if (
      lowerMessage.includes('adresse')
    ) {
      this.fieldErrors['adresse'] =
        message;
    }

    if (
      lowerMessage.includes('zone') &&
      !this.fieldErrors['nomZone']
    ) {
      this.fieldErrors['nomZone'] =
        message;
    }

    this.cdr.detectChanges();
  }

  validateZoneForm(): boolean {
    this.resetErrors();

    if (
      !this.form.nomZone ||
      !this.form.nomZone.trim()
    ) {
      this.fieldErrors['nomZone'] =
        'Le nom de la zone est obligatoire';
    }

    if (
      !this.form.adresse ||
      !this.form.adresse.trim()
    ) {
      this.fieldErrors['adresse'] =
        'L’adresse du lieu est obligatoire';
    }

    const hasCoordinates =
      this.form.latitude !== null &&
      this.form.latitude !== undefined &&
      this.form.longitude !== null &&
      this.form.longitude !== undefined;

    if (!hasCoordinates) {
      this.fieldErrors['localisation'] =
        'Veuillez sélectionner une localisation sur la carte';
    }

    if (
      this.form.latitude !== null &&
      this.form.latitude !== undefined &&
      (
        this.form.latitude < -90 ||
        this.form.latitude > 90
      )
    ) {
      this.fieldErrors['localisation'] =
        'Latitude invalide';
    }

    if (
      this.form.longitude !== null &&
      this.form.longitude !== undefined &&
      (
        this.form.longitude < -180 ||
        this.form.longitude > 180
      )
    ) {
      this.fieldErrors['localisation'] =
        'Longitude invalide';
    }

    return (
      Object.keys(this.fieldErrors).length === 0
    );
  }

  /**
   * Le paramètre nomZone est utilisé par :
   *
   * Ajouter un lieu dans Zone 1
   *
   * Le groupe est ainsi automatiquement sélectionné.
   */
  openCreateModal(
    nomZone = ''
  ): void {
    this.showModal = true;
    this.isEditMode = false;
    this.selectedZoneId = null;

    this.resetErrors();

    const normalizedName =
      nomZone.trim();

    const nameAlreadyExists =
      this.getZoneNameOptions().some(
        option =>
          option.nomZone
            ?.trim()
            .toLowerCase() ===
          normalizedName.toLowerCase()
      );

    this.showCustomZoneNameInput =
      normalizedName.length > 0 &&
      !nameAlreadyExists;

    this.form =
      this.createEmptyForm(normalizedName);

    /*
     * Si on ajoute un lieu dans un groupe existant,
     * on affiche immédiatement la description commune du groupe.
     */
    if (normalizedName) {
      const existingGroupZone =
        this.zones.find(
          zone =>
            zone.nomZone
              ?.trim()
              .toLowerCase() ===
            normalizedName.toLowerCase()
        );

      this.form.description =
        existingGroupZone?.description ?? '';
    }

    this.openMapAfterRender();
  }

  openEditModal(
    zone: Zone
  ): void {
    this.showModal = true;
    this.isEditMode = true;

    this.selectedZoneId =
      zone.id ?? null;

    this.resetErrors();

    const nameExistsInOptions =
      this.getZoneNameOptions().some(
        option =>
          option.nomZone
            ?.trim()
            .toLowerCase() ===
          zone.nomZone
            ?.trim()
            .toLowerCase()
      );

    this.showCustomZoneNameInput =
      !nameExistsInOptions;

    this.form = {
      nomZone: zone.nomZone,
      adresse: zone.adresse ?? '',
      latitude: zone.latitude ?? null,
      longitude: zone.longitude ?? null,
      description: zone.description ?? ''
    };

    this.openMapAfterRender();
  }

  private openMapAfterRender(): void {
    this.cdr.detectChanges();

    setTimeout(() => {
      this.initMap();
    }, 200);
  }

  closeModal(): void {
    this.showModal = false;
    this.resetErrors();

    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.marker = undefined;
    }
  }

  initMap(): void {
    const container =
      this.zoneMapContainer?.nativeElement;

    if (!container) {
      console.warn(
        'Map container not ready'
      );

      return;
    }

    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.marker = undefined;
    }

    const hasCoordinates =
      this.form.latitude !== null &&
      this.form.latitude !== undefined &&
      this.form.longitude !== null &&
      this.form.longitude !== undefined;

    const defaultLat = 36.8065;
    const defaultLng = 10.1815;

    const lat = hasCoordinates
      ? Number(this.form.latitude)
      : defaultLat;

    const lng = hasCoordinates
      ? Number(this.form.longitude)
      : defaultLng;

    this.map = this.safeMap
      .createMap(container)
      .setView(
        [lat, lng],
        hasCoordinates ? 14 : 11
      );

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap'
      }
    ).addTo(this.map);

    if (hasCoordinates) {
      this.setMarker(lat, lng);
    }

    this.safeMap.onMapClick(
      this.map,

      event => {
        const clickedLat =
          event.latlng.lat;

        const clickedLng =
          event.latlng.lng;

        this.form.latitude =
          Number(clickedLat.toFixed(6));

        this.form.longitude =
          Number(clickedLng.toFixed(6));

        delete this.fieldErrors[
          'localisation'
        ];

        this.setMarker(
          clickedLat,
          clickedLng
        );

        this.reverseGeocode(
          clickedLat,
          clickedLng
        );
      },

      this.cdr
    );

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 300);
  }

  setMarker(
    lat: number,
    lng: number
  ): void {
    if (!this.map) {
      return;
    }

    if (this.marker) {
      this.marker.setLatLng([
        lat,
        lng
      ]);

      return;
    }

    this.marker = L.circleMarker(
      [lat, lng],
      {
        radius: 8,
        color: '#1B2B5E',
        fillColor: '#C9A84C',
        fillOpacity: 1,
        weight: 3
      }
    ).addTo(this.map);
  }

  searchAddress(): void {
    delete this.fieldErrors['adresse'];

    if (
      !this.form.adresse ||
      !this.form.adresse.trim()
    ) {
      this.fieldErrors['adresse'] =
        'Veuillez saisir une adresse à rechercher';

      return;
    }

    const query = encodeURIComponent(
      this.form.adresse.trim()
    );

    const url =
      'https://nominatim.openstreetmap.org/search' +
      `?format=json&q=${query}&limit=1`;

    this.http
      .get<any[]>(url)
      .subscribe({
        next: result => {
          this.safeMap.runAndDetect(
            () => {
              if (
                !result ||
                result.length === 0
              ) {
                this.fieldErrors['adresse'] =
                  'Adresse introuvable';

                return;
              }

              const place = result[0];

              const lat =
                Number(place.lat);

              const lng =
                Number(place.lon);

              this.form.latitude =
                Number(lat.toFixed(6));

              this.form.longitude =
                Number(lng.toFixed(6));

              this.form.adresse =
                place.display_name;

              delete this.fieldErrors[
                'localisation'
              ];

              this.map?.setView(
                [lat, lng],
                14
              );

              this.setMarker(
                lat,
                lng
              );
            },

            this.cdr
          );
        },

        error: err => {
          console.error(
            'ERREUR RECHERCHE ADRESSE = ',
            err
          );

          this.fieldErrors['adresse'] =
            'Impossible de rechercher cette adresse';

          this.cdr.detectChanges();
        }
      });
  }

  reverseGeocode(
    lat: number,
    lng: number
  ): void {
    const url =
      'https://nominatim.openstreetmap.org/reverse' +
      `?format=json&lat=${lat}&lon=${lng}`;

    this.http
      .get<any>(url)
      .subscribe({
        next: result => {
          this.safeMap.runAndDetect(
            () => {
              if (result?.display_name) {
                this.form.adresse =
                  result.display_name;

                delete this.fieldErrors[
                  'adresse'
                ];
              }
            },

            this.cdr
          );
        },

        error: err => {
          console.error(
            'ERREUR REVERSE GEOCODING = ',
            err
          );
        }
      });
  }

  saveZone(): void {
    if (!this.validateZoneForm()) {
      return;
    }

    const zoneToSave: Zone = {
      ...this.form,

      nomZone:
        this.form.nomZone.trim(),

      adresse:
        this.form.adresse?.trim() ?? '',

      description:
        this.form.description?.trim() ?? '',

      latitude:
        this.form.latitude,

      longitude:
        this.form.longitude
    };

    if (
      this.isEditMode &&
      this.selectedZoneId !== null
    ) {
      this.zoneService
        .update(
          this.selectedZoneId,
          zoneToSave
        )
        .subscribe({
          next: () => {
            this.closeModal();
            this.loadZones();
          },

          error: err => {
            console.error(err);
            this.handleApiError(err);
          }
        });

      return;
    }

    this.zoneService
      .create(zoneToSave)
      .subscribe({
        next: () => {
          this.closeModal();
          this.loadZones();
        },

        error: err => {
          console.error(err);
          this.handleApiError(err);
        }
      });
  }

  openDeleteModal(
    zone: Zone
  ): void {
    this.zoneToDelete = zone;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.zoneToDelete = null;
  }

  confirmDeleteZone(): void {
    if (
      this.zoneToDelete?.id === null ||
      this.zoneToDelete?.id === undefined
    ) {
      return;
    }

    this.zoneService
      .delete(this.zoneToDelete.id)
      .subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadZones();
        },

        error: err => {
          console.error(
            'ERREUR SUPPRESSION ZONE = ',
            err
          );

          this.closeDeleteModal();
        }
      });
  }

  /**
   * Retourne :
   *
   * Zone 1
   * Zone 2
   * Zone 3
   * + tous les nouveaux noms créés depuis la base.
   */
  getZoneNameOptions(): Zone[] {
    const options: Zone[] =
      this.predefinedZoneNames.map(
        zone => ({
          ...zone
        })
      );

    for (const zone of this.zones) {
      const zoneName =
        zone.nomZone?.trim();

      if (!zoneName) {
        continue;
      }

      const alreadyExists =
        options.some(
          option =>
            option.nomZone
              ?.trim()
              .toLowerCase() ===
            zoneName.toLowerCase()
        );

      if (!alreadyExists) {
        options.push({
          nomZone: zoneName,
          adresse: '',
          latitude: null,
          longitude: null,
          description: ''
        });
      }
    }

    return options.sort(
      (firstOption, secondOption) =>
        firstOption.nomZone.localeCompare(
          secondOption.nomZone,
          'fr',
          {
            sensitivity: 'base',
            numeric: true
          }
        )
    );
  }

  /**
   * Important :
   * sélectionner Zone 1 ne remplit plus automatiquement
   * l’adresse.
   *
   * Zone 1 est le groupe.
   * L’adresse est le lieu à créer.
   */
  onZoneNameSelected(
    nomZone: string
  ): void {
    delete this.fieldErrors['nomZone'];

    this.form.nomZone =
      nomZone?.trim() || '';

    /*
     * La description appartient au groupe de zone.
     * Lorsqu'un groupe existant est sélectionné,
     * on recharge sa description automatiquement.
     */
    const selectedGroupZone =
      this.zones.find(
        zone =>
          zone.nomZone
            ?.trim()
            .toLowerCase() ===
          this.form.nomZone.toLowerCase()
      );

    if (selectedGroupZone) {
      this.form.description =
        selectedGroupZone.description ?? '';
    }
  }

  enableCustomZoneName(): void {
    this.showCustomZoneNameInput = true;
    this.form.nomZone = '';

    delete this.fieldErrors['nomZone'];
  }

  disableCustomZoneName(): void {
    this.showCustomZoneNameInput = false;
    this.form.nomZone = '';

    delete this.fieldErrors['nomZone'];
  }

  trackByZoneGroup(
    index: number,
    group: ZoneGroup
  ): string {
    return group.key;
  }

  trackByZone(
    index: number,
    zone: Zone
  ): number | string {
    return (
      zone.id ??
      `${zone.nomZone}-${zone.adresse}-${index}`
    );
  }
}