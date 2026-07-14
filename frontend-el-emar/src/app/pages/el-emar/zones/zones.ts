import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

import { Zone, ZoneService } from '../../../core/services/zone.service';
import { SafeMapService } from '../../../core/services/safe-map.service'; // <-- AJOUTÉ

@Component({
  selector: 'app-zones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zones.html',
  styleUrl: './zones.scss',
})
export class Zones implements OnInit {

  @ViewChild('zoneMapContainer') zoneMapContainer?: ElementRef<HTMLDivElement>;

  showCustomZoneNameInput = false;
  zones: Zone[] = [];
  predefinedZoneNames: Zone[] = [
    {
      nomZone: 'Zone 1',
      adresse: 'Lac',
      latitude: null,
      longitude: null,
      description: 'Zone 1 : Lac. Classification très haut standing, complexité très élevée. Seuil minimum 80/100.'
    },
    {
      nomZone: 'Zone 2',
      adresse: 'Ain Zaghouan Nord ; Jardins de Carthage',
      latitude: null,
      longitude: null,
      description: 'Zone 2 : Ain Zaghouan Nord et Jardins de Carthage. Classification haut standing, complexité élevée. Seuil minimum 80/100.'
    },
    {
      nomZone: 'Zone 3',
      adresse: 'Ain Zaghouan ; Soukra',
      latitude: null,
      longitude: null,
      description: 'Zone 3 : Ain Zaghouan et Soukra. Classification standard, complexité modérée. Seuil minimum 80/100.'
    }
  ];

  showModal = false;
  isEditMode = false;
  selectedZoneId: number | null = null;

  map?: L.Map;
  marker?: L.CircleMarker;

  showDeleteModal = false;
  zoneToDelete: Zone | null = null;

  formError = '';
  fieldErrors: { [key: string]: string } = {};

  form: Zone = {
    nomZone: '',
    adresse: '',
    latitude: null,
    longitude: null,
    description: ''
  };

  constructor(
    private zoneService: ZoneService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private safeMap: SafeMapService // <-- AJOUTÉ
  ) {}

  ngOnInit(): void {
    this.loadZones();
  }

  loadZones(): void {
    this.zoneService.getAll().subscribe({
      next: data => this.zones = data,
      error: err => console.error(err)
    });
  }

  resetErrors(): void {
    this.formError = '';
    this.fieldErrors = {};
  }

  handleApiError(err: any): void {
    console.log('API ERROR ZONE = ', err);

    const message =
      err?.error?.message ||
      err?.error?.detail ||
      err?.error?.error ||
      'Une erreur est survenue';

    this.formError = message;
    this.fieldErrors = err?.error?.errors || {};

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('localisation')) {
      this.fieldErrors['localisation'] = message;
    }

    if (lowerMessage.includes('adresse')) {
      this.fieldErrors['adresse'] = message;
    }

    this.cdr.detectChanges();
  }

  validateZoneForm(): boolean {
    this.resetErrors();

    if (!this.form.nomZone || !this.form.nomZone.trim()) {
      this.fieldErrors['nomZone'] = 'Le nom de la zone est obligatoire';
    }

    if (!this.form.adresse || !this.form.adresse.trim()) {
      this.fieldErrors['adresse'] = 'L’adresse est obligatoire';
    }

    const hasCoordinates =
      this.form.latitude !== null &&
      this.form.latitude !== undefined &&
      this.form.longitude !== null &&
      this.form.longitude !== undefined;

    if (!hasCoordinates) {
      this.fieldErrors['localisation'] = 'Veuillez sélectionner une localisation sur la carte';
    }

    if (this.form.latitude !== null && this.form.latitude !== undefined) {
      if (this.form.latitude < -90 || this.form.latitude > 90) {
        this.fieldErrors['localisation'] = 'Latitude invalide';
      }
    }

    if (this.form.longitude !== null && this.form.longitude !== undefined) {
      if (this.form.longitude < -180 || this.form.longitude > 180) {
        this.fieldErrors['localisation'] = 'Longitude invalide';
      }
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  openCreateModal(): void {
    this.showModal = true;
    this.isEditMode = false;
    this.selectedZoneId = null;
    this.showCustomZoneNameInput = false;

    this.resetErrors();

    this.form = {
      nomZone: '',
      adresse: '',
      latitude: null,
      longitude: null,
      description: ''
    };

    this.openMapAfterRender();
  }

  openEditModal(zone: Zone): void {
    this.showModal = true;
    this.isEditMode = true;
    this.selectedZoneId = zone.id ?? null;

    this.resetErrors();

    const isPredefinedZone = this.predefinedZoneNames.some(
      option =>
        option.nomZone.trim().toLowerCase() ===
        zone.nomZone.trim().toLowerCase()
    );

    this.showCustomZoneNameInput = !isPredefinedZone;

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
    const container = this.zoneMapContainer?.nativeElement;

    if (!container) {
      console.warn('Map container not ready');
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

    const lat = hasCoordinates ? Number(this.form.latitude) : defaultLat;
    const lng = hasCoordinates ? Number(this.form.longitude) : defaultLng;

    // <-- MODIFIÉ : this.safeMap.createMap(...) au lieu de L.map(...)
    this.map = this.safeMap.createMap(container).setView(
      [lat, lng],
      hasCoordinates ? 14 : 11
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    if (hasCoordinates) {
      this.setMarker(lat, lng);
    }

    // <-- MODIFIÉ : this.safeMap.onMapClick(...) au lieu de this.map.on('click', ...)
    this.safeMap.onMapClick(this.map, (event) => {
      const clickedLat = event.latlng.lat;
      const clickedLng = event.latlng.lng;

      this.form.latitude = Number(clickedLat.toFixed(6));
      this.form.longitude = Number(clickedLng.toFixed(6));

      this.fieldErrors['localisation'] = '';

      this.setMarker(clickedLat, clickedLng);
      this.reverseGeocode(clickedLat, clickedLng);
    }, this.cdr);

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 300);
  }

  setMarker(lat: number, lng: number): void {
    if (!this.map) return;

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
      return;
    }

    this.marker = L.circleMarker([lat, lng], {
      radius: 8,
      color: '#1B2B5E',
      fillColor: '#C9A84C',
      fillOpacity: 1,
      weight: 3
    }).addTo(this.map);
  }

  searchAddress(): void {
    this.fieldErrors['adresse'] = '';

    if (!this.form.adresse || !this.form.adresse.trim()) {
      this.fieldErrors['adresse'] = 'Veuillez saisir une adresse à rechercher';
      return;
    }

    const query = encodeURIComponent(this.form.adresse);

    const url =
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;

    this.http.get<any[]>(url).subscribe({
      next: result => {
        // <-- MODIFIÉ : on force la détection après la réponse HTTP externe
        this.safeMap.runAndDetect(() => {
          if (!result || result.length === 0) {
            this.fieldErrors['adresse'] = 'Adresse introuvable';
            return;
          }

          const place = result[0];

          const lat = Number(place.lat);
          const lng = Number(place.lon);

          this.form.latitude = Number(lat.toFixed(6));
          this.form.longitude = Number(lng.toFixed(6));
          this.form.adresse = place.display_name;

          this.fieldErrors['localisation'] = '';

          this.map?.setView([lat, lng], 14);
          this.setMarker(lat, lng);
        }, this.cdr);
      },
      error: err => console.error(err)
    });
  }

  reverseGeocode(lat: number, lng: number): void {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

    this.http.get<any>(url).subscribe({
      next: result => {
        // <-- MODIFIÉ : on force la détection après la réponse HTTP externe
        this.safeMap.runAndDetect(() => {
          if (result && result.display_name) {
            this.form.adresse = result.display_name;
          }
        }, this.cdr);
      },
      error: err => console.error(err)
    });
  }

  saveZone(): void {
    if (!this.validateZoneForm()) {
      return;
    }

    const zoneToSave: Zone = {
      ...this.form,
      nomZone: this.form.nomZone.trim(),
      adresse: this.form.adresse?.trim() ?? '',
      description: this.form.description?.trim() ?? '',
      latitude: this.form.latitude,
      longitude: this.form.longitude
    };

    if (this.isEditMode && this.selectedZoneId) {
      this.zoneService.update(this.selectedZoneId, zoneToSave).subscribe({
        next: () => {
          this.loadZones();
          this.closeModal();
        },
        error: err => {
          console.error(err);
          this.handleApiError(err);
        }
      });
    } else {
      this.zoneService.create(zoneToSave).subscribe({
        next: () => {
          this.loadZones();
          this.closeModal();
        },
        error: err => {
          console.error(err);
          this.handleApiError(err);
        }
      });
    }
  }

  openDeleteModal(zone: Zone): void {
    this.zoneToDelete = zone;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.zoneToDelete = null;
  }

  confirmDeleteZone(): void {
    if (!this.zoneToDelete?.id) return;

    this.zoneService.delete(this.zoneToDelete.id).subscribe({
      next: () => {
        this.loadZones();
        this.closeDeleteModal();
      },
      error: err => console.error(err)
    });
  }

  getZoneNameOptions(): Zone[] {
    const options: Zone[] = [...this.predefinedZoneNames];

    for (const zone of this.zones || []) {
      const alreadyExists = options.some(
        option =>
          option.nomZone?.trim().toLowerCase() ===
          zone.nomZone?.trim().toLowerCase()
      );

      if (!alreadyExists && zone.nomZone) {
        options.push({
          nomZone: zone.nomZone,
          adresse: zone.adresse ?? '',
          latitude: zone.latitude ?? null,
          longitude: zone.longitude ?? null,
          description: zone.description ?? ''
        });
      }
    }

    return options;
  }

  onZoneNameSelected(nomZone: string): void {
    this.fieldErrors['nomZone'] = '';

    const selected = this.getZoneNameOptions().find(
      option => option.nomZone === nomZone
    );

    if (!selected) {
      return;
    }

    this.form.nomZone = selected.nomZone;
    this.form.adresse = selected.adresse ?? '';
    this.form.description = selected.description ?? '';

    if (selected.latitude !== null && selected.latitude !== undefined) {
      this.form.latitude = selected.latitude;
    }

    if (selected.longitude !== null && selected.longitude !== undefined) {
      this.form.longitude = selected.longitude;
    }

    if (
      this.form.latitude !== null &&
      this.form.latitude !== undefined &&
      this.form.longitude !== null &&
      this.form.longitude !== undefined
    ) {
      this.map?.setView(
        [Number(this.form.latitude), Number(this.form.longitude)],
        14
      );

      this.setMarker(
        Number(this.form.latitude),
        Number(this.form.longitude)
      );
    }
  }

  enableCustomZoneName(): void {
    this.showCustomZoneNameInput = true;

    this.form.nomZone = '';
    this.fieldErrors['nomZone'] = '';
  }

  disableCustomZoneName(): void {
    this.showCustomZoneNameInput = false;

    this.form.nomZone = '';
    this.fieldErrors['nomZone'] = '';
  }
}