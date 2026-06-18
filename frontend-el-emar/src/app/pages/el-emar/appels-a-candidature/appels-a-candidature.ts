import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AppelCandidature,
  AppelCandidatureService,
  StatutRfp
} from '../../../core/services/appel-candidature.service';

import { Lot, LotService } from '../../../core/services/lot.service';
import { Zone, ZoneService } from '../../../core/services/zone.service';

@Component({
  selector: 'app-appels-a-candidature',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appels-a-candidature.html',
  styleUrl: './appels-a-candidature.scss',
})
export class AppelsACandidature implements OnInit {

  appels: AppelCandidature[] = [];
  filteredAppels: AppelCandidature[] = [];

  lots: Lot[] = [];
  zones: Zone[] = [];

  searchTerm = '';
  statutFilter: 'TOUS' | StatutRfp = 'TOUS';

  showModal = false;
  isEditMode = false;
  selectedAppelId: number | null = null;

  showDeleteModal = false;
  appelToDelete: AppelCandidature | null = null;

  formError = '';
  fieldErrors: { [key: string]: string } = {};

  form: AppelCandidature = this.getEmptyForm();

  constructor(
    private appelService: AppelCandidatureService,
    private lotService: LotService,
    private zoneService: ZoneService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAppels();
    this.loadLots();
    this.loadZones();
  }

  getEmptyForm(): AppelCandidature {
    return {
      titre: '',
      description: '',
      dateDebut: '',
      dateLimite: '',
      statut: 'BROUILLON',
      seuilAdmission: 80,
      objectif: '',
      emailDepot: '',
      utilisateurId: 1,
      lotIds: [],
      zoneIds: []
    };
  }

  loadAppels(): void {
    this.appelService.getAll().subscribe({
      next: data => {
        this.appels = [...data];
        this.applyFilters();
      },
      error: err => console.error(err)
    });
  }

  loadLots(): void {
    this.lotService.getAll().subscribe({
      next: data => {
        this.lots = data.filter(lot => this.isLotActive(lot));
      },
      error: err => console.error(err)
    });
  }

  loadZones(): void {
    this.zoneService.getAll().subscribe({
      next: data => {
        this.zones = data;
      },
      error: err => console.error(err)
    });
  }

  isLotActive(lot: Lot): boolean {
    const value = lot.actif as any;

    return value === true ||
           value === 'true' ||
           value === 't' ||
           value === 1 ||
           value === '1';
  }

  resetErrors(): void {
    this.formError = '';
    this.fieldErrors = {};
  }

  handleApiError(err: any): void {
    console.log('API ERROR APPEL = ', err);

    const message =
      err?.error?.message ||
      err?.error?.detail ||
      err?.error?.error ||
      'Une erreur est survenue';

    const newFieldErrors: { [key: string]: string } = {
      ...(err?.error?.errors || {})
    };

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('titre')) {
      newFieldErrors['titre'] = message;
    }

    if (lowerMessage.includes('description')) {
      newFieldErrors['description'] = message;
    }

    if (lowerMessage.includes('date de début') || lowerMessage.includes('date debut')) {
      newFieldErrors['dateDebut'] = message;
    }

    if (lowerMessage.includes('date limite') || lowerMessage.includes('date')) {
      newFieldErrors['dateLimite'] = message;
    }

    if (lowerMessage.includes('lot')) {
      newFieldErrors['lotIds'] = message;
    }

    if (lowerMessage.includes('zone')) {
      newFieldErrors['zoneIds'] = message;
    }

    if (lowerMessage.includes('objectif')) {
      newFieldErrors['objectif'] = message;
    }

    if (lowerMessage.includes('email')) {
      newFieldErrors['emailDepot'] = message;
    }

    if (lowerMessage.includes('seuil')) {
      newFieldErrors['seuilAdmission'] = message;
    }

    if (lowerMessage.includes('statut')) {
      newFieldErrors['statut'] = message;
    }

    this.formError = message;
    this.fieldErrors = { ...newFieldErrors };
    this.showModal = true;

    console.log('FORM ERROR APPEL = ', this.formError);
    console.log('FIELD ERRORS APPEL = ', this.fieldErrors);

    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  validateAppelForm(): boolean {
    this.resetErrors();

    if (!this.form.titre || !this.form.titre.trim()) {
      this.fieldErrors['titre'] = 'Le titre de l’appel est obligatoire';
    }

    if (!this.form.description || !this.form.description.trim()) {
      this.fieldErrors['description'] = 'La description est obligatoire';
    }

    if (!this.form.dateDebut) {
      this.fieldErrors['dateDebut'] = 'La date de début est obligatoire';
    }

    if (!this.form.dateLimite) {
      this.fieldErrors['dateLimite'] = 'La date limite est obligatoire';
    }

    if (this.form.dateDebut && this.form.dateLimite) {
      const debut = new Date(this.form.dateDebut);
      const limite = new Date(this.form.dateLimite);

      if (debut > limite) {
        this.fieldErrors['dateLimite'] = 'La date limite doit être après la date de début';
      }
    }

    if (this.form.seuilAdmission === null || this.form.seuilAdmission === undefined) {
      this.fieldErrors['seuilAdmission'] = 'Le seuil d’admission est obligatoire';
    }

    if (this.form.seuilAdmission < 0 || this.form.seuilAdmission > 100) {
      this.fieldErrors['seuilAdmission'] = 'Le seuil doit être entre 0 et 100';
    }

    if (!this.form.zoneIds || this.form.zoneIds.length === 0) {
      this.fieldErrors['zoneIds'] = 'Veuillez sélectionner au moins une zone';
    }

    if (!this.form.lotIds || this.form.lotIds.length === 0) {
      this.fieldErrors['lotIds'] = 'Veuillez sélectionner au moins un lot';
    }

    if (!this.form.objectif || !this.form.objectif.trim()) {
      this.fieldErrors['objectif'] = 'L’objectif est obligatoire';
    }

    if (!this.form.emailDepot || !this.form.emailDepot.trim()) {
      this.fieldErrors['emailDepot'] = 'L’email de dépôt est obligatoire';
    } else if (!this.isValidEmail(this.form.emailDepot.trim())) {
      this.fieldErrors['emailDepot'] = 'L’email de dépôt est invalide';
    }

    if (!this.form.statut) {
      this.fieldErrors['statut'] = 'Le statut est obligatoire';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredAppels = this.appels.filter(appel => {
      const matchSearch =
        appel.titre?.toLowerCase().includes(term) ||
        appel.reference?.toLowerCase().includes(term) ||
        appel.description?.toLowerCase().includes(term);

      const matchStatut =
        this.statutFilter === 'TOUS' ||
        appel.statut === this.statutFilter;

      return matchSearch && matchStatut;
    });
  }

  setStatutFilter(statut: 'TOUS' | StatutRfp): void {
    this.statutFilter = statut;
    this.applyFilters();
  }

  openCreateModal(): void {
    this.showModal = true;
    this.isEditMode = false;
    this.selectedAppelId = null;

    this.resetErrors();

    this.form = this.getEmptyForm();
  }

  openEditModal(appel: AppelCandidature): void {
    if (!appel.id) {
      console.error('Impossible de modifier : ID appel manquant', appel);
      return;
    }

    this.showModal = true;
    this.isEditMode = true;
    this.selectedAppelId = appel.id;

    this.resetErrors();

    this.form = {
      id: appel.id,
      reference: appel.reference,

      titre: appel.titre,
      description: appel.description ?? '',

      dateDebut: appel.dateDebut ?? '',
      dateLimite: appel.dateLimite ?? '',

      statut: appel.statut ?? 'BROUILLON',

      seuilAdmission: appel.seuilAdmission ?? 80,

      objectif: appel.objectif ?? '',
      emailDepot: appel.emailDepot ?? '',

      utilisateurId: appel.utilisateurId ?? 1,

      lotIds: [...(appel.lotIds ?? [])],
      zoneIds: [...(appel.zoneIds ?? [])]
    };
  }

  closeModal(): void {
    this.showModal = false;
    this.resetErrors();
  }

  toggleLot(lotId?: number): void {
    if (!lotId) return;

    if (this.form.lotIds.includes(lotId)) {
      this.form.lotIds = this.form.lotIds.filter(id => id !== lotId);
    } else {
      this.form.lotIds = [...this.form.lotIds, lotId];
    }

    this.fieldErrors['lotIds'] = '';
  }

  toggleZone(zoneId?: number): void {
    if (!zoneId) return;

    if (this.form.zoneIds.includes(zoneId)) {
      this.form.zoneIds = this.form.zoneIds.filter(id => id !== zoneId);
    } else {
      this.form.zoneIds = [...this.form.zoneIds, zoneId];
    }

    this.fieldErrors['zoneIds'] = '';
  }

  isLotSelected(lotId?: number): boolean {
    if (!lotId) return false;
    return this.form.lotIds.includes(lotId);
  }

  isZoneSelected(zoneId?: number): boolean {
    if (!zoneId) return false;
    return this.form.zoneIds.includes(zoneId);
  }

  saveAppel(): void {
    if (!this.validateAppelForm()) {
      return;
    }

    const request: AppelCandidature = {
      ...this.form,
      titre: this.form.titre.trim(),
      description: this.form.description?.trim() ?? '',
      objectif: this.form.objectif?.trim() ?? '',
      emailDepot: this.form.emailDepot?.trim() ?? '',
      seuilAdmission: Number(this.form.seuilAdmission),
      statut: this.form.statut
    };

    if (this.isEditMode) {
      if (!this.selectedAppelId) {
        this.formError = 'Erreur : ID de l’appel introuvable pour la modification';
        return;
      }

      this.appelService.update(this.selectedAppelId, request).subscribe({
        next: () => {
          this.closeModal();
          this.loadAppels();
        },
        error: err => {
          console.error(err);
          this.handleApiError(err);
        }
      });

    } else {
      this.appelService.create(request).subscribe({
        next: () => {
          this.closeModal();
          this.loadAppels();
        },
        error: err => {
          console.error(err);
          this.handleApiError(err);
        }
      });
    }
  }

  openDeleteModal(appel: AppelCandidature): void {
    this.appelToDelete = appel;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.appelToDelete = null;
  }

  confirmDeleteAppel(): void {
    if (!this.appelToDelete?.id) return;

    this.appelService.delete(this.appelToDelete.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadAppels();
      },
      error: err => console.error(err)
    });
  }

  getStatutLabel(statut?: string): string {
    switch (statut) {
      case 'BROUILLON':
        return 'Brouillon';
      case 'PUBLIE':
        return 'Publié';
      case 'CLOTURE':
        return 'Clôturé';
      default:
        return statut || '-';
    }
  }

  getStatutClass(statut?: string): string {
    switch (statut) {
      case 'BROUILLON':
        return 'brouillon';
      case 'PUBLIE':
        return 'publie';
      case 'CLOTURE':
        return 'cloture';
      default:
        return '';
    }
  }
}