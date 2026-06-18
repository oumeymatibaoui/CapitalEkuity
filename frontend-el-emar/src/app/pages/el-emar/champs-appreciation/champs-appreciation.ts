import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ChampAppreciation,
  ChampAppreciationRequest,
  ChampAppreciationService
} from '../../../core/services/champ-appreciation.service';

import { Lot, LotService } from '../../../core/services/lot.service';

@Component({
  selector: 'app-champs-appreciation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './champs-appreciation.html',
  styleUrl: './champs-appreciation.scss',
})
export class ChampsAppreciation implements OnInit {

  champs: ChampAppreciation[] = [];
  lots: Lot[] = [];

  selectedLotId: number | null = null;
  selectedLotNom = '';

  showModal = false;
  isEditMode = false;
  selectedChampId: number | null = null;

  showDeleteModal = false;
  champToDelete: ChampAppreciation | null = null;

  formError = '';
  fieldErrors: { [key: string]: string } = {};

  modelesReponse = [
    { value: 'TEXTE_COURT', label: 'Réponse courte' },
    { value: 'TEXTE_LONG', label: 'Réponse détaillée' },
    { value: 'OUI_NON', label: 'Oui / Non' },
    { value: 'NOMBRE_PERSONNES', label: 'Nombre de personnes' },
    { value: 'EXPERIENCE_ANNEES', label: "Nombre d'années d'expérience" },
    { value: 'DATE', label: 'Date' },
    { value: 'LISTE_CHOIX', label: 'Choix dans une liste' },
    { value: 'PLUSIEURS_CHOIX', label: 'Plusieurs choix possibles' },
    { value: 'FICHIER', label: 'Fichier à joindre' }
  ];

  form: ChampAppreciationRequest = this.getEmptyForm();

  constructor(
    private champService: ChampAppreciationService,
    private lotService: LotService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLots();
  }

  getEmptyForm(): ChampAppreciationRequest {
    return {
      lotId: this.selectedLotId,
      section: '',
      nomChamp: '',
      labelChamp: '',
      descriptionChamp: '',
      modeleReponse: '',
      typeChamp: '',
      conditionProcedure: '',
      codePxx: '',
      options: '',
      obligatoire: true,
      ordreAffichage: 1,
      actif: true
    };
  }

  loadLots(): void {
    this.lotService.getAll().subscribe({
      next: data => {
        this.lots = data;

        if (this.lots.length > 0 && this.lots[0].id) {
          this.selectLot(this.lots[0]);
        }

        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Erreur chargement lots = ', err);
      }
    });
  }

  selectLot(lot: Lot): void {
    if (!lot.id) return;

    this.selectedLotId = lot.id;
    this.selectedLotNom = lot.nomLot;

    this.form.lotId = lot.id;

    this.loadChampsByLot(lot.id);
  }

  loadChampsByLot(lotId: number): void {
    this.champService.getByLot(lotId).subscribe({
      next: data => {
        this.champs = [...data].sort((a, b) => a.ordreAffichage - b.ordreAffichage);
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Erreur chargement champs = ', err);
      }
    });
  }

  getSections(): string[] {
    return [...new Set(this.champs.map(champ => champ.section))];
  }

  getChampsBySection(section: string): ChampAppreciation[] {
    return this.champs
      .filter(champ => champ.section === section)
      .sort((a, b) => a.ordreAffichage - b.ordreAffichage);
  }

  getSectionCount(section: string): number {
    return this.getChampsBySection(section).length;
  }

  resetErrors(): void {
    this.formError = '';
    this.fieldErrors = {};
  }

  handleApiError(err: any): void {
    console.log('API ERROR CHAMP = ', err);

    let message =
      err?.error?.message ||
      err?.error?.detail ||
      err?.error?.error ||
      'Une erreur est survenue';

    if (
      message.includes('Cannot deserialize') &&
      message.includes('ModeleReponse')
    ) {
      message = 'Le modèle de réponse sélectionné n’est pas valide.';
    }

    const newFieldErrors: { [key: string]: string } = {
      ...(err?.error?.errors || {})
    };

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('lot')) {
      newFieldErrors['lotId'] = message;
    }

    if (lowerMessage.includes('code')) {
      newFieldErrors['codePxx'] = message;
    }

    if (lowerMessage.includes('champ')) {
      newFieldErrors['labelChamp'] = message;
    }

    if (lowerMessage.includes('modèle')) {
      newFieldErrors['modeleReponse'] = message;
    }

    this.formError = message;
    this.fieldErrors = { ...newFieldErrors };

    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  validateForm(): boolean {
    this.resetErrors();

    if (!this.form.lotId) {
      this.fieldErrors['lotId'] = 'Le lot est obligatoire';
    }

    if (!this.form.codePxx || !this.form.codePxx.trim()) {
      this.fieldErrors['codePxx'] = 'Le code Pxx est obligatoire';
    }

    if (!this.form.section || !this.form.section.trim()) {
      this.fieldErrors['section'] = 'La section est obligatoire';
    }

    if (!this.form.labelChamp || !this.form.labelChamp.trim()) {
      this.fieldErrors['labelChamp'] = 'Le libellé du champ est obligatoire';
    }

    if (!this.form.descriptionChamp || !this.form.descriptionChamp.trim()) {
      this.fieldErrors['descriptionChamp'] = 'Le texte d’aide est obligatoire';
    }

    if (!this.form.modeleReponse || !this.form.modeleReponse.trim()) {
      this.fieldErrors['modeleReponse'] = 'Le modèle de réponse est obligatoire';
    }

    if (!this.form.conditionProcedure || !this.form.conditionProcedure.trim()) {
      this.fieldErrors['conditionProcedure'] = 'La condition d’application est obligatoire';
    }

    if (!this.form.ordreAffichage || this.form.ordreAffichage < 1) {
      this.fieldErrors['ordreAffichage'] = 'L’ordre d’affichage est obligatoire';
    }

    if (this.requiresOptions(this.form.modeleReponse)) {
      if (!this.form.options || !this.form.options.trim()) {
        this.fieldErrors['options'] = 'Les options sont obligatoires pour ce type de réponse';
      }
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  openCreateModal(): void {
    this.showModal = true;
    this.isEditMode = false;
    this.selectedChampId = null;

    this.resetErrors();

    this.form = this.getEmptyForm();
    this.form.lotId = this.selectedLotId;
    this.form.ordreAffichage = this.champs.length + 1;
    this.form.codePxx = `P${this.champs.length + 1}`;
    this.form.conditionProcedure = 'Applicable à tous les candidats.';
    this.form.obligatoire = true;
    this.form.actif = true;
  }

  openEditModal(champ: ChampAppreciation): void {
    this.showModal = true;
    this.isEditMode = true;
    this.selectedChampId = champ.id ?? null;

    this.resetErrors();

    this.form = {
      lotId: champ.lotId,
      section: champ.section,
      nomChamp: champ.nomChamp,
      labelChamp: champ.labelChamp,
      descriptionChamp: champ.descriptionChamp,
      modeleReponse: champ.modeleReponse,
      typeChamp: champ.typeChamp,
      conditionProcedure: champ.conditionProcedure,
      codePxx: champ.codePxx,
      options: champ.options ?? '',
      obligatoire: champ.obligatoire,
      ordreAffichage: champ.ordreAffichage,
      actif: champ.actif
    };
  }

  closeModal(): void {
    this.showModal = false;
    this.resetErrors();
  }

  saveChamp(): void {
    this.prepareGeneratedFields();

    if (!this.validateForm()) {
      return;
    }

    const payload: ChampAppreciationRequest = {
      lotId: Number(this.form.lotId),
      section: this.form.section.trim(),
      nomChamp: this.form.nomChamp.trim(),
      labelChamp: this.form.labelChamp.trim(),
      descriptionChamp: this.form.descriptionChamp.trim(),
      modeleReponse: this.form.modeleReponse,
      typeChamp: this.form.typeChamp,
      conditionProcedure: this.form.conditionProcedure.trim(),
      codePxx: this.form.codePxx.trim().toUpperCase(),
      options: this.form.options?.trim() ?? '',
      obligatoire: this.form.obligatoire,
      ordreAffichage: Number(this.form.ordreAffichage),
      actif: this.form.actif
    };

    console.log('PAYLOAD CHAMP = ', payload);

    if (this.isEditMode && this.selectedChampId) {
      this.champService.update(this.selectedChampId, payload).subscribe({
        next: () => {
          this.closeModal();

          if (this.selectedLotId) {
            this.loadChampsByLot(this.selectedLotId);
          }
        },
        error: err => {
          console.error(err);
          this.handleApiError(err);
        }
      });
    } else {
      this.champService.create(payload).subscribe({
        next: () => {
          this.closeModal();

          if (this.selectedLotId) {
            this.loadChampsByLot(this.selectedLotId);
          }
        },
        error: err => {
          console.error(err);
          this.handleApiError(err);
        }
      });
    }
  }

  prepareGeneratedFields(): void {
    this.form.nomChamp = this.generateTechnicalName(this.form.labelChamp);
    this.form.typeChamp = this.getTypeChampFromModele(this.form.modeleReponse);

    if (this.form.modeleReponse === 'OUI_NON') {
      this.form.options = 'Oui;Non';
    }
  }

  generateTechnicalName(label: string): string {
    if (!label) return '';

    return label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  getTypeChampFromModele(modele: string): string {
    switch (modele) {
      case 'TEXTE_COURT':
        return 'TEXT';

      case 'TEXTE_LONG':
        return 'TEXTAREA';

      case 'OUI_NON':
        return 'BOOLEAN';

      case 'NOMBRE_PERSONNES':
        return 'NUMBER';

      case 'EXPERIENCE_ANNEES':
        return 'NUMBER';

      case 'DATE':
        return 'DATE';

      case 'LISTE_CHOIX':
        return 'SELECT';

      case 'PLUSIEURS_CHOIX':
        return 'MULTI_SELECT';

      case 'FICHIER':
        return 'FILE';

      default:
        return 'TEXT';
    }
  }

  requiresOptions(modele: string): boolean {
    return modele === 'LISTE_CHOIX' || modele === 'PLUSIEURS_CHOIX';
  }

  onModeleChange(): void {
    this.form.typeChamp = this.getTypeChampFromModele(this.form.modeleReponse);

    if (this.form.modeleReponse === 'OUI_NON') {
      this.form.options = 'Oui;Non';
    }

    if (
      this.form.modeleReponse !== 'OUI_NON' &&
      !this.requiresOptions(this.form.modeleReponse)
    ) {
      this.form.options = '';
    }
  }

  getModeleLabel(modele: string): string {
    return this.modelesReponse.find(item => item.value === modele)?.label || modele;
  }

  openDeleteModal(champ: ChampAppreciation): void {
    this.champToDelete = champ;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.champToDelete = null;
  }

  confirmDeleteChamp(): void {
    if (!this.champToDelete?.id) return;

    this.champService.delete(this.champToDelete.id).subscribe({
      next: () => {
        this.closeDeleteModal();

        if (this.selectedLotId) {
          this.loadChampsByLot(this.selectedLotId);
        }
      },
      error: err => console.error(err)
    });
  }

  toggleChampStatus(champ: ChampAppreciation): void {
    if (!champ.id) return;

    const payload: ChampAppreciationRequest = {
      lotId: champ.lotId,
      section: champ.section,
      nomChamp: champ.nomChamp,
      labelChamp: champ.labelChamp,
      descriptionChamp: champ.descriptionChamp,
      modeleReponse: champ.modeleReponse,
      typeChamp: champ.typeChamp,
      conditionProcedure: champ.conditionProcedure,
      codePxx: champ.codePxx,
      options: champ.options ?? '',
      obligatoire: champ.obligatoire,
      ordreAffichage: champ.ordreAffichage,
      actif: !champ.actif
    };

    this.champService.update(champ.id, payload).subscribe({
      next: () => {
        if (this.selectedLotId) {
          this.loadChampsByLot(this.selectedLotId);
        }
      },
      error: err => console.error(err)
    });
  }
}