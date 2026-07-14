import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  CategorieEvaluation,
  CritereEvaluation,
  CritereEvaluationRequest,
  CritereEvaluationService,
  LotOption
} from '../../../core/services/critere-evaluation.service';

type DeleteAction = 'DEACTIVATE' | 'DELETE';

@Component({
  selector: 'app-grille-evaluation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './grille-evaluation.html',
  styleUrl: './grille-evaluation.scss'
})
export class GrilleEvaluation implements OnInit {

  lots: LotOption[] = [];

  criteres: CritereEvaluation[] = [];

  criteresParLot: { [lotId: number]: CritereEvaluation[] } = {};
  totauxParLot: { [lotId: number]: number } = {};
  loadingParLot: { [lotId: number]: boolean } = {};
  requestIdParLot: { [lotId: number]: number } = {};

  selectedLotId: number | null = null;

  categoriesEvaluation: CategorieEvaluation[] = [];
  loadingCategories = false;
  selectedCategoryId: number | null = null;

  loadingLots = false;

  pageError = '';
  formError = '';
  formSubmitted = false;

  totalLot = 0;
  resteLot = 100;

  showModal = false;
  editMode = false;
  selectedCritereId: number | null = null;

  showDeleteModal = false;
  critereToDelete: CritereEvaluation | null = null;
  deleteAction: DeleteAction = 'DEACTIVATE';

  form: CritereEvaluationRequest = this.getEmptyForm();

  constructor(private critereService: CritereEvaluationService) {}

  ngOnInit(): void {
    this.loadLots();
  }
allLots: LotOption[] = [];

typeIntervenantOptions = [
  { id: 12, code: 'ETUDES', libelle: 'Études' },
  { id: 13, code: 'TRAVAUX', libelle: 'Travaux' },
  { id: 14, code: 'FOURNITURES', libelle: 'Fournitures' }
];

selectedTypeIntervenantId: number = 12;
selectedTypeIntervenantLabel: string = 'Études';
onTypeIntervenantChange(typeId: number): void {
  this.selectedTypeIntervenantId = Number(typeId);

  const selectedType = this.typeIntervenantOptions.find(
    item => Number(item.id) === Number(typeId)
  );

  this.selectedTypeIntervenantLabel = selectedType?.libelle ?? '';

  // Important : nettoyer l’ancien état
  this.selectedLotId = null;
  this.criteres = [];
  this.categoriesEvaluation = [];
  this.selectedCategoryId = null;
  this.totalLot = 0;
  this.resteLot = 100;
  this.pageError = '';

  // Important : filtrer les lots par type
  this.lots = this.allLots.filter(
    lot => Number(lot.typeIntervenantId) === Number(typeId)
  );

  if (this.lots.length === 0) {
    this.pageError = 'Aucun lot trouvé pour ce type d’intervenant.';
    return;
  }

  this.selectLot(this.lots[0]);
}
 loadLots(): void {
  this.loadingLots = true;
  this.pageError = '';

  this.critereService.getLots().subscribe({
    next: (data) => {
      this.allLots = data || [];
      this.loadingLots = false;

      this.onTypeIntervenantChange(this.selectedTypeIntervenantId);
    },
    error: () => {
      this.pageError = 'Erreur lors du chargement des lots.';
      this.loadingLots = false;
    }
  });
}

  private getDefaultLot(): LotOption {
    const structureLot = this.lots.find(lot =>
      (lot.nomLot ?? '').toLowerCase().includes('structure')
    );

    return structureLot ?? this.lots[0];
  }

  selectLot(lot: LotOption): void {
  const lotId = Number(lot.id);

  this.selectedLotId = lotId;
  this.pageError = '';

  // Nettoyer avant de charger le nouveau lot
  this.criteres = [];
  this.categoriesEvaluation = [];
  this.selectedCategoryId = null;
  this.totalLot = 0;
  this.resteLot = 100;

  this.loadCategoriesForLot(lot);

  if (this.criteresParLot[lotId]) {
    this.displayLotFromCache(lotId);
    return;
  }

  this.loadCriteresForLot(lotId, true);
}

  loadCategoriesForLot(lot: LotOption): void {
  const typeIntervenantId = lot.typeIntervenantId;
  const currentLotId = Number(lot.id);

  this.categoriesEvaluation = [];
  this.selectedCategoryId = null;

  if (!typeIntervenantId) {
    this.pageError =
      'Ce lot n’a pas de type d’intervenant. Vérifiez type_intervenant_id dans la table lot.';
    return;
  }

  this.loadingCategories = true;

  this.critereService.getCategoriesByScope(
    Number(typeIntervenantId),
    currentLotId,
    true
  ).subscribe({
    next: (categories) => {
      // Important : ignorer la réponse si l’utilisateur a déjà changé de lot
      if (this.selectedLotId !== currentLotId) {
        return;
      }

      this.categoriesEvaluation = categories || [];
      this.loadingCategories = false;

      if (this.categoriesEvaluation.length > 0 && !this.editMode && this.showModal) {
        const first = this.categoriesEvaluation[0];
        this.applyCategoryToForm(first);
      }
    },
    error: (error) => {
      if (this.selectedLotId !== currentLotId) {
        return;
      }

      console.error('LOAD CATEGORIES ERROR', error);
      this.loadingCategories = false;
      this.pageError = 'Erreur lors du chargement des catégories.';
    }
  });
}
  onCategoryChange(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;

    const category = this.categoriesEvaluation.find(
      item => Number(item.id) === Number(categoryId)
    );

    if (!category) {
      this.form.categorieEvaluationId = null;
      this.form.categorieEvaluation = '';
      this.form.categorieEvaluationCode = null;
      this.form.categorieEvaluationLibelle = null;
      return;
    }

    this.applyCategoryToForm(category);
  }

  private applyCategoryToForm(category: CategorieEvaluation): void {
    this.selectedCategoryId = category.id ?? null;

    this.form.categorieEvaluationId = category.id ?? null;
    this.form.categorieEvaluation = category.libelle;
    this.form.categorieEvaluationCode = category.code;
    this.form.categorieEvaluationLibelle = category.libelle;
    this.form.section = category.libelle;
  }

  private displayLotFromCache(lotId: number): void {
    this.criteres = this.criteresParLot[lotId] ?? [];

    const total = this.totauxParLot[lotId] ?? this.calculateLocalTotalForLot(lotId);

    this.totalLot = total;
    this.resteLot = 100 - total;
  }

  loadCriteresForLot(lotId: number, forceReload: boolean = false): void {
    if (!forceReload && this.criteresParLot[lotId]) {
      this.displayLotFromCache(lotId);
      return;
    }

    const currentRequestId = (this.requestIdParLot[lotId] ?? 0) + 1;

    this.requestIdParLot[lotId] = currentRequestId;
    this.loadingParLot[lotId] = true;
    this.pageError = '';

    this.critereService.getByLot(lotId).subscribe({
      next: (data) => {
        if (this.requestIdParLot[lotId] !== currentRequestId) {
          return;
        }

        this.criteresParLot[lotId] = data || [];

        if (this.selectedLotId === lotId) {
          this.criteres = this.criteresParLot[lotId];
        }

        this.loadingParLot[lotId] = false;

        this.refreshTotalLot(lotId, currentRequestId);
      },
      error: () => {
        if (this.requestIdParLot[lotId] !== currentRequestId) {
          return;
        }

        this.pageError = 'Erreur lors du chargement de la grille d’évaluation.';
        this.loadingParLot[lotId] = false;

        if (!this.criteresParLot[lotId]) {
          this.criteresParLot[lotId] = [];
        }

        if (this.selectedLotId === lotId) {
          this.displayLotFromCache(lotId);
        }
      }
    });
  }

  refreshTotalLot(lotId: number, requestId?: number): void {
    this.critereService.getTotalByLot(lotId).subscribe({
      next: (total) => {
        if (requestId && this.requestIdParLot[lotId] !== requestId) {
          return;
        }

        const totalNumber = Number(total ?? 0);

        this.totauxParLot[lotId] = totalNumber;

        if (this.selectedLotId === lotId) {
          this.totalLot = totalNumber;
          this.resteLot = 100 - totalNumber;
        }
      },
      error: () => {
        const localTotal = this.calculateLocalTotalForLot(lotId);

        this.totauxParLot[lotId] = localTotal;

        if (this.selectedLotId === lotId) {
          this.totalLot = localTotal;
          this.resteLot = 100 - localTotal;
        }
      }
    });
  }

  isCurrentLoading(): boolean {
    if (this.loadingLots) {
      return true;
    }

    if (!this.selectedLotId) {
      return false;
    }

    return Boolean(this.loadingParLot[this.selectedLotId]);
  }

  openAddModal(): void {
    this.editMode = false;
    this.selectedCritereId = null;

    this.form = this.getEmptyForm();
    this.form.lotId = this.selectedLotId;

    const firstCategory = this.categoriesEvaluation[0];

    if (firstCategory) {
      this.applyCategoryToForm(firstCategory);
    }

    this.formError = '';
    this.pageError = '';
    this.formSubmitted = false;

    this.showModal = true;
  }

  openEditModal(critere: CritereEvaluation): void {
    this.editMode = true;
    this.selectedCritereId = critere.id;

    this.formError = '';
    this.pageError = '';
    this.formSubmitted = false;

    this.form = {
      lotId: critere.lotId,
      appelLotId: critere.appelLotId ?? null,

      categorieEvaluationId: critere.categorieEvaluationId ?? null,
      categorieEvaluationCode: critere.categorieEvaluationCode ?? null,
      categorieEvaluationLibelle: critere.categorieEvaluationLibelle ?? null,
      categorieEvaluation: critere.categorieEvaluation ?? '',
      section: critere.categorieEvaluation ?? '',

      nomCritere: critere.nomCritere ?? '',
      descriptionCritere: critere.descriptionCritere ?? '',
      pointsMax: Number(critere.pointsMax ?? 0),
      conditionBareme: critere.conditionBareme ?? '',
      documentsRequis: critere.documentsRequis ?? '',
      ordreAffichage: critere.ordreAffichage ?? null,
      actif: critere.actif ?? true
    };

    this.selectedCategoryId = critere.categorieEvaluationId ?? null;

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editMode = false;
    this.selectedCritereId = null;

    this.form = this.getEmptyForm();

    this.formError = '';
    this.formSubmitted = false;
  }

  saveCritere(): void {
    this.formSubmitted = true;
    this.formError = '';

    if (!this.validateForm()) {
      return;
    }

    const request = this.prepareRequest();

    if (this.editMode && this.selectedCritereId) {
      this.critereService.update(this.selectedCritereId, request).subscribe({
        next: () => {
          this.closeModal();

          const lotToReload = request.lotId ?? this.selectedLotId;

          if (lotToReload) {
            this.selectedLotId = lotToReload;
            this.loadCriteresForLot(lotToReload, true);
          }
        },
        error: (error) => {
          this.formError = this.extractErrorMessage(
            error,
            'Erreur lors de la modification du critère.'
          );
        }
      });

      return;
    }

    this.critereService.create(request).subscribe({
      next: () => {
        this.closeModal();

        const lotToReload = request.lotId ?? this.selectedLotId;

        if (lotToReload) {
          this.selectedLotId = lotToReload;
          this.loadCriteresForLot(lotToReload, true);
        }
      },
      error: (error) => {
        this.formError = this.extractErrorMessage(
          error,
          'Erreur lors de l’ajout du critère.'
        );
      }
    });
  }

  openDeactivateModal(critere: CritereEvaluation): void {
    this.critereToDelete = critere;
    this.deleteAction = 'DEACTIVATE';
    this.showDeleteModal = true;
  }

  openDeleteModal(critere: CritereEvaluation): void {
    this.critereToDelete = critere;
    this.deleteAction = 'DELETE';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.critereToDelete = null;
    this.showDeleteModal = false;
  }

  confirmDelete(): void {
    if (!this.critereToDelete) {
      return;
    }

    const lotId = this.critereToDelete.lotId ?? this.selectedLotId;

    if (this.deleteAction === 'DEACTIVATE') {
      this.critereService.deactivate(this.critereToDelete.id).subscribe({
        next: () => {
          this.closeDeleteModal();

          if (lotId) {
            this.loadCriteresForLot(lotId, true);
          }
        },
        error: () => {
          this.pageError = 'Erreur lors de la désactivation du critère.';
          this.closeDeleteModal();
        }
      });

      return;
    }

    this.critereService.delete(this.critereToDelete.id).subscribe({
      next: () => {
        this.closeDeleteModal();

        if (lotId) {
          this.loadCriteresForLot(lotId, true);
        }
      },
      error: () => {
        this.pageError = 'Erreur lors de la suppression définitive du critère.';
        this.closeDeleteModal();
      }
    });
  }

  activateCritere(critere: CritereEvaluation): void {
    if (critere.actif) {
      return;
    }

    const lotId = critere.lotId ?? this.selectedLotId;

    this.critereService.toggleActif(critere.id).subscribe({
      next: () => {
        if (lotId) {
          this.loadCriteresForLot(lotId, true);
        }
      },
      error: (error) => {
        this.pageError = this.extractErrorMessage(
          error,
          'Erreur lors de la réactivation du critère.'
        );
      }
    });
  }

  getSelectedLotName(): string {
    const lot = this.lots.find(item => Number(item.id) === this.selectedLotId);
    return lot?.nomLot ?? '';
  }

  getCategories(): string[] {
    const categories = this.criteres
      .map(item => item.categorieEvaluation?.trim() || 'Sans catégorie')
      .filter((value, index, array) => array.indexOf(value) === index);

    return categories;
  }

  getCriteresByCategory(category: string): CritereEvaluation[] {
    return this.criteres.filter(item => {
      const currentCategory = item.categorieEvaluation?.trim() || 'Sans catégorie';
      return currentCategory === category;
    });
  }

  getCategoryTotal(category: string): number {
    return this.getCriteresByCategory(category)
      .filter(item => item.actif)
      .reduce((sum, item) => sum + Number(item.pointsMax || 0), 0);
  }

  getDocumentsList(documents: string): string[] {
    if (!documents || documents.trim() === '') {
      return [];
    }

    return documents
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  getTotalClass(): string {
    if (this.totalLot === 100) {
      return 'valid';
    }

    if (this.totalLot > 100) {
      return 'danger';
    }

    return 'warning';
  }

  getDeleteTitle(): string {
    return this.deleteAction === 'DELETE'
      ? 'Supprimer définitivement le critère'
      : 'Désactiver le critère';
  }

  getDeleteMessage(): string {
    return this.deleteAction === 'DELETE'
      ? 'Cette action supprimera définitivement le critère de la base de données.'
      : 'Le critère sera conservé dans la base, mais marqué comme inactif.';
  }

  getConfirmButtonLabel(): string {
    return this.deleteAction === 'DELETE'
      ? 'Supprimer définitivement'
      : 'Désactiver';
  }

  private validateForm(): boolean {
    this.formError = '';

    if (!this.form.lotId) {
      this.formError = 'Le lot est obligatoire.';
      return false;
    }

    if (!this.form.categorieEvaluationId) {
      this.formError = 'La catégorie est obligatoire.';
      return false;
    }

    if (!this.form.nomCritere || this.form.nomCritere.trim() === '') {
      this.formError = 'Le nom du critère est obligatoire.';
      return false;
    }

    if (this.form.pointsMax === null || this.form.pointsMax === undefined) {
      this.formError = 'Les points max sont obligatoires.';
      return false;
    }

    if (Number(this.form.pointsMax) <= 0) {
      this.formError = 'Les points max doivent être supérieurs à 0.';
      return false;
    }

    if (Number(this.form.pointsMax) > 100) {
      this.formError = 'Les points max ne peuvent pas dépasser 100.';
      return false;
    }

    if (this.form.actif && this.form.lotId) {
      const lotId = Number(this.form.lotId);
      const listeDuLot = this.criteresParLot[lotId];

      if (listeDuLot) {
        const totalExcludingCurrent = this.calculateTotalExcludingCurrentForLot(lotId);
        const newTotal = totalExcludingCurrent + Number(this.form.pointsMax);

        if (newTotal > 100) {
          this.formError =
            'Le total du lot dépasse 100 points. Total actuel sans ce critère : '
            + totalExcludingCurrent
            + ', nouveau total : '
            + newTotal
            + '.';

          return false;
        }
      }
    }

    return true;
  }

  private prepareRequest(): CritereEvaluationRequest {
    const nomCritere = (this.form.nomCritere ?? '').trim();

    return {
      lotId: this.form.lotId ? Number(this.form.lotId) : null,
      appelLotId: null,

      categorieEvaluationId: this.form.categorieEvaluationId ?? null,
      categorieEvaluationCode: this.form.categorieEvaluationCode ?? null,
      categorieEvaluationLibelle: this.form.categorieEvaluationLibelle ?? null,
      categorieEvaluation: (this.form.categorieEvaluation ?? '').trim(),

      section: (this.form.categorieEvaluationLibelle ?? this.form.categorieEvaluation ?? '').trim(),

      nomCritere: nomCritere,
      descriptionCritere: (this.form.descriptionCritere ?? '').trim(),

      pointsMax: Number(this.form.pointsMax ?? 0),

      conditionBareme: (this.form.conditionBareme ?? '').trim(),
      documentsRequis: (this.form.documentsRequis ?? '').trim(),

      ordreAffichage: this.form.ordreAffichage ?? null,
      actif: Boolean(this.form.actif)
    };
  }

  private calculateLocalTotalForLot(lotId: number): number {
    return (this.criteresParLot[lotId] ?? [])
      .filter(item => item.actif)
      .reduce((sum, item) => sum + Number(item.pointsMax || 0), 0);
  }

  private calculateTotalExcludingCurrentForLot(lotId: number): number {
    return (this.criteresParLot[lotId] ?? [])
      .filter(item => item.actif)
      .filter(item => item.id !== this.selectedCritereId)
      .reduce((sum, item) => sum + Number(item.pointsMax || 0), 0);
  }

  private extractErrorMessage(error: any, fallbackMessage: string): string {
    if (error?.error?.message) {
      return error.error.message;
    }

    if (typeof error?.error === 'string' && error.error.trim() !== '') {
      return error.error;
    }

    return fallbackMessage;
  }

  private getEmptyForm(): CritereEvaluationRequest {
    return {
      lotId: null,
      appelLotId: null,

      categorieEvaluationId: null,
      categorieEvaluationCode: null,
      categorieEvaluationLibelle: null,
      categorieEvaluation: '',
      section: '',

      nomCritere: '',
      descriptionCritere: '',
      pointsMax: 10,
      conditionBareme: '',
      documentsRequis: '',
      ordreAffichage: null,
      actif: true
    };
  }
}