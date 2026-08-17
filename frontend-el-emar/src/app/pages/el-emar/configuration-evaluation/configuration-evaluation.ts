import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  CategorieEvaluationResponse,
  CritereEvaluationRequest,
  CritereEvaluationResponse,
  CriterePieceRequest,
  EvaluationConfigurationService,
} from '../../../core/services/evaluation-configuration.service';

import {
  TypeIntervenant,
  TypeIntervenantService,
} from '../../../core/services/type-intervenant.service';

import { Lot, LotService } from '../../../core/services/lot.service';

type LotView = Lot & {
  id: number;
  nomLot: string;
  codeLot?: string;
};

type DeleteTarget = 'CRITERE' | 'GROUPE';

interface CritereFormState {
  grilleEvaluationLotId: number | null;
  lotId: number | null;
  categorieEvaluationId: number | null;

  codeCritere: string;
  libelleCritere: string;

  /* Ces champs restent internes mais ne sont plus imposés à l'utilisateur. */
  labelCandidat: string;
  aideCandidat: string;
  raisonDonnee: string;
  noteCandidat: string;
  noteEvaluateur: string;

  pointsMax: number;
  baremeNotation: string;
  typeNotation: string;

  typeChamp: string;
  optionsChamp: string;
  obligatoire: boolean;

  ordreAffichage: number | null;
  actif: boolean;

  pieces: CriterePieceRequest[];
}

@Component({
  selector: 'app-configuration-evaluation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuration-evaluation.html',
  styleUrl: './configuration-evaluation.scss',
})
export class ConfigurationEvaluation implements OnInit {
  private lotsRequestId = 0;
  private categoriesRequestId = 0;
  private evaluationRequestId = 0;
  private totalsRequestId = 0;

  types: TypeIntervenant[] = [];
  lots: LotView[] = [];

  selectedTypeIntervenantId: number | null = null;
  selectedLotId: number | null = null;

  categoriesEvaluation: CategorieEvaluationResponse[] = [];
  selectedCategoryId: number | null = null;
  loadingCategories = false;

  pieceNames: string[] = [];
  criteres: CritereEvaluationResponse[] = [];

  totalPoints = 0;
  restePoints = 100;

  loadingTypes = false;
  loadingLots = false;
  loading = false;
  saving = false;

  errorMessage = '';
  successMessage = '';

  modalOpen = false;
  editMode = false;
  editingId: number | null = null;

  categoryModalOpen = false;
  savingCategory = false;
  categoryFormError = '';

  categoryForm = {
    libelle: '',
    code: '',
    description: '',
    globalForType: true,
  };

  deleteModalOpen = false;
  deleting = false;
  deleteTarget: DeleteTarget = 'CRITERE';
  critereToDelete: CritereEvaluationResponse | null = null;
  sectionToDelete = '';

  form: CritereFormState = this.getEmptyForm();

  constructor(
    private evaluationService: EvaluationConfigurationService,
    private typeService: TypeIntervenantService,
    private lotService: LotService,
  ) {}

  ngOnInit(): void {
    this.loadTypes();
    this.loadPieceNames();
  }

  /* =====================================================
     TYPES / DOMAINES
  ===================================================== */

  loadTypes(): void {
    this.loadingTypes = true;
    this.errorMessage = '';

    this.typeService.getAll(true).subscribe({
      next: (types: TypeIntervenant[]) => {
        this.types = types ?? [];
        this.loadingTypes = false;

        if (this.types.length > 0) {
          this.onTypeChange(Number(this.types[0].id));
        }
      },
      error: (error: unknown) => {
        console.error('LOAD TYPES ERROR', error);
        this.loadingTypes = false;
        this.errorMessage =
          "Erreur lors du chargement des types d'intervenants.";
      },
    });
  }

  onTypeChange(
    value: number | string | null = this.selectedTypeIntervenantId,
  ): void {
    const typeId = value == null ? null : Number(value);

    this.selectedTypeIntervenantId =
      typeId !== null && Number.isFinite(typeId) && typeId > 0
        ? typeId
        : null;

    this.lotsRequestId++;
    this.categoriesRequestId++;
    this.evaluationRequestId++;
    this.totalsRequestId++;

    this.selectedLotId = null;
    this.lots = [];
    this.categoriesEvaluation = [];
    this.selectedCategoryId = null;
    this.criteres = [];
    this.form = this.getEmptyForm();

    this.totalPoints = 0;
    this.restePoints = 100;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.selectedTypeIntervenantId !== null) {
      this.loadLotsByType(this.selectedTypeIntervenantId);
    }
  }

  loadLotsByType(typeId: number): void {
    const requestedTypeId = Number(typeId);

    if (!Number.isFinite(requestedTypeId) || requestedTypeId <= 0) {
      return;
    }

    const requestId = ++this.lotsRequestId;
    this.loadingLots = true;

    this.lotService.getAll(requestedTypeId).subscribe({
      next: (lots: Lot[]) => {
        if (
          requestId !== this.lotsRequestId ||
          Number(this.selectedTypeIntervenantId) !== requestedTypeId
        ) {
          return;
        }

        this.loadingLots = false;

        this.lots = (lots ?? [])
          .filter((lot) => this.isActive(lot.actif))
          .map((lot) => ({
            ...lot,
            id: Number(lot.id),
            nomLot: lot.nomLot || 'Domaine sans nom',
            codeLot: lot.codeLot || '',
          }));

        if (this.lots.length > 0) {
          this.selectLot(this.lots[0].id);
        }
      },
      error: (error: unknown) => {
        if (requestId !== this.lotsRequestId) {
          return;
        }

        console.error('LOAD LOTS ERROR', error);
        this.loadingLots = false;
        this.lots = [];
        this.errorMessage = 'Erreur lors du chargement des domaines.';
      },
    });
  }

  selectLot(lotId: number): void {
    const normalizedLotId = Number(lotId);

    if (!Number.isFinite(normalizedLotId) || normalizedLotId <= 0) {
      this.errorMessage = 'Identifiant du domaine invalide.';
      return;
    }

    const selectedLot = this.lots.find(
      (lot) => Number(lot.id) === normalizedLotId,
    );

    if (!selectedLot) {
      this.errorMessage =
        "Le domaine ne correspond pas au type d'intervenant sélectionné.";
      return;
    }

    this.selectedLotId = normalizedLotId;
    this.form.lotId = normalizedLotId;
    this.categoriesEvaluation = [];
    this.selectedCategoryId = null;
    this.errorMessage = '';
    this.successMessage = '';

    this.loadCategoriesForScope();
    this.loadEvaluation();
  }

  /* =====================================================
     CATÉGORIES
  ===================================================== */

  loadCategoriesForScope(preferredCategoryId: number | null = null): void {
    const typeIntervenantId = Number(this.selectedTypeIntervenantId);
    const lotId = this.selectedLotId == null ? null : Number(this.selectedLotId);

    if (!Number.isFinite(typeIntervenantId) || typeIntervenantId <= 0) {
      this.categoriesEvaluation = [];
      this.selectedCategoryId = null;
      return;
    }

    const requestId = ++this.categoriesRequestId;
    this.loadingCategories = true;

    this.evaluationService
      .getCategoriesByScope(typeIntervenantId, lotId, true)
      .subscribe({
        next: (categories: CategorieEvaluationResponse[]) => {
          if (requestId !== this.categoriesRequestId) {
            return;
          }

          this.loadingCategories = false;

          this.categoriesEvaluation = (categories ?? [])
            .filter((category) => this.isActive(category.actif))
            .sort((a, b) => {
              const ordreA = Number(a.ordreAffichage ?? 0);
              const ordreB = Number(b.ordreAffichage ?? 0);

              if (ordreA !== ordreB) {
                return ordreA - ordreB;
              }

              return String(a.libelle ?? '').localeCompare(
                String(b.libelle ?? ''),
                'fr',
                { sensitivity: 'base' },
              );
            });

          if (this.categoriesEvaluation.length === 0) {
            this.selectedCategoryId = null;
            this.form.categorieEvaluationId = null;
            return;
          }

          const preferred =
            preferredCategoryId == null
              ? null
              : this.categoriesEvaluation.find(
                  (category) =>
                    Number(category.id) === Number(preferredCategoryId),
                );

          this.applyCategoryToForm(
            preferred ?? this.categoriesEvaluation[0],
          );
        },
        error: (error: any) => {
          if (requestId !== this.categoriesRequestId) {
            return;
          }

          console.error('LOAD CATEGORIES ERROR', error);
          this.loadingCategories = false;
          this.categoriesEvaluation = [];
          this.selectedCategoryId = null;
          this.errorMessage =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors du chargement des catégories.';
        },
      });
  }

  onCategoryChange(value: number | string | null): void {
    const categoryId = value == null ? null : Number(value);

    this.selectedCategoryId =
      categoryId !== null && Number.isFinite(categoryId) && categoryId > 0
        ? categoryId
        : null;

    this.form.categorieEvaluationId = this.selectedCategoryId;
  }

  private applyCategoryToForm(category: CategorieEvaluationResponse): void {
    const categoryId = category?.id == null ? null : Number(category.id);

    this.selectedCategoryId =
      categoryId !== null && Number.isFinite(categoryId) && categoryId > 0
        ? categoryId
        : null;

    this.form.categorieEvaluationId = this.selectedCategoryId;
  }

  openCategoryModal(): void {
    if (!this.selectedTypeIntervenantId) {
      this.errorMessage = "Veuillez sélectionner un type d'intervenant.";
      return;
    }

    this.categoryForm = {
      libelle: '',
      code: '',
      description: '',
      globalForType: true,
    };

    this.categoryFormError = '';
    this.categoryModalOpen = true;
  }

  closeCategoryModal(): void {
    this.categoryModalOpen = false;
    this.savingCategory = false;
    this.categoryFormError = '';
  }

  saveCategoryFromMiniModal(): void {
    this.categoryFormError = '';

    const libelle = this.categoryForm.libelle.trim();
    const typeIntervenantId = Number(this.selectedTypeIntervenantId);
    const selectedLotId =
      this.selectedLotId == null ? null : Number(this.selectedLotId);

    if (!libelle) {
      this.categoryFormError = 'Le libellé de la catégorie est obligatoire.';
      return;
    }

    if (!Number.isFinite(typeIntervenantId) || typeIntervenantId <= 0) {
      this.categoryFormError = "Le type d'intervenant est obligatoire.";
      return;
    }

    if (
      !this.categoryForm.globalForType &&
      (selectedLotId == null || selectedLotId <= 0)
    ) {
      this.categoryFormError =
        'Le domaine est obligatoire pour une catégorie spécifique.';
      return;
    }

    const payload = {
      typeIntervenantId,
      lotId: this.categoryForm.globalForType ? null : selectedLotId,
      code: this.categoryForm.code.trim()
        ? this.categoryForm.code.trim()
        : this.generateCategoryCode(libelle),
      libelle,
      description: this.categoryForm.description?.trim() || '',
      actif: true,
      ordreAffichage:
        Math.max(
          0,
          ...this.categoriesEvaluation.map((category) =>
            Number(category.ordreAffichage ?? 0),
          ),
        ) + 1,
    };

    this.savingCategory = true;

    this.evaluationService.createCategory(payload).subscribe({
      next: (createdCategory: CategorieEvaluationResponse) => {
        this.savingCategory = false;
        this.categoryModalOpen = false;
        this.successMessage = 'Catégorie ajoutée avec succès.';
        this.loadCategoriesForScope(createdCategory.id ?? null);
      },
      error: (error: any) => {
        console.error('SAVE CATEGORY ERROR', error);
        this.savingCategory = false;
        this.categoryFormError =
          error?.error?.message ||
          error?.error?.detail ||
          "Erreur lors de l'ajout de la catégorie.";
      },
    });
  }

  /* =====================================================
     CRITÈRES / TOTAL
  ===================================================== */

  loadPieceNames(): void {
    this.evaluationService.getPieceNames().subscribe({
      next: (names: string[]) => {
        this.pieceNames = [...(names ?? [])].sort((a, b) =>
          a.localeCompare(b, 'fr'),
        );
      },
      error: () => {
        this.pieceNames = [];
      },
    });
  }

  loadEvaluation(): void {
    if (!this.selectedLotId) {
      this.criteres = [];
      this.loading = false;
      return;
    }

    const requestedLotId = Number(this.selectedLotId);
    const requestId = ++this.evaluationRequestId;

    this.loading = true;
    this.errorMessage = '';

    this.evaluationService.getActiveByLot(requestedLotId).subscribe({
      next: (criteres: CritereEvaluationResponse[]) => {
        if (
          requestId !== this.evaluationRequestId ||
          Number(this.selectedLotId) !== requestedLotId
        ) {
          return;
        }

        this.criteres = (criteres ?? [])
          .filter((critere) => Number(critere.critereEvaluationId) > 0)
          .sort(
            (a, b) =>
              Number(a.ordreAffichage ?? 0) -
              Number(b.ordreAffichage ?? 0),
          );

        this.loading = false;
        this.loadTotals();
      },
      error: (error: unknown) => {
        if (requestId !== this.evaluationRequestId) {
          return;
        }

        console.error('LOAD CRITERES ERROR', error);
        this.loading = false;
        this.errorMessage =
          "Erreur lors du chargement de la grille d'évaluation.";
      },
    });
  }

  loadTotals(): void {
    if (!this.selectedLotId) {
      this.totalPoints = 0;
      this.restePoints = 100;
      return;
    }

    const requestedLotId = Number(this.selectedLotId);
    const requestId = ++this.totalsRequestId;

    forkJoin({
      total: this.evaluationService.getTotalByLot(requestedLotId),
      reste: this.evaluationService.getResteByLot(requestedLotId),
    }).subscribe({
      next: ({ total, reste }) => {
        if (
          requestId !== this.totalsRequestId ||
          Number(this.selectedLotId) !== requestedLotId
        ) {
          return;
        }

        this.totalPoints = Number(total ?? 0);
        this.restePoints = Number(reste ?? 0);
      },
      error: () => {
        if (requestId !== this.totalsRequestId) {
          return;
        }

        this.totalPoints = this.criteres.reduce(
          (sum, critere) => sum + Number(critere.pointsMax ?? 0),
          0,
        );
        this.restePoints = Math.max(0, 100 - this.totalPoints);
      },
    });
  }

  /* =====================================================
     MODAL CRITÈRE — SIMPLIFIÉ
  ===================================================== */

  openCreateModal(): void {
    if (!this.selectedLotId) {
      this.errorMessage = 'Veuillez choisir un type puis un domaine.';
      return;
    }

    this.editMode = false;
    this.editingId = null;
    this.form = this.getEmptyForm();
    this.form.lotId = Number(this.selectedLotId);
    this.form.ordreAffichage = this.criteres.length + 1;
    this.form.codeCritere = this.generateCodeCritere();

    this.selectedCategoryId = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.modalOpen = true;

    this.loadCategoriesForScope();
  }

  openEditModal(critere: CritereEvaluationResponse): void {
    this.editMode = true;
    this.editingId = Number(critere.critereEvaluationId);

    this.form = {
      grilleEvaluationLotId: critere.grilleEvaluationLotId ?? null,
      lotId: Number(critere.lotId),
      categorieEvaluationId: critere.categorieEvaluationId ?? null,

      codeCritere: critere.codeCritere || '',
      libelleCritere: critere.libelleCritere || '',

      labelCandidat: critere.labelCandidat || '',
      aideCandidat: critere.aideCandidat || '',
      raisonDonnee: critere.raisonDonnee || '',
      noteCandidat: critere.noteCandidat || '',
      noteEvaluateur: critere.noteEvaluateur || '',

      pointsMax: Number(critere.pointsMax ?? 0),
      baremeNotation: critere.baremeNotation || '',
      typeNotation: critere.typeNotation || 'MANUEL',

      typeChamp: critere.typeChamp || 'TEXT',
      optionsChamp: critere.optionsChamp || '',
      obligatoire: critere.obligatoire ?? true,

      ordreAffichage: critere.ordreAffichage ?? 1,
      actif: this.isActive(critere.actif),

      pieces: (critere.pieces ?? []).map((piece) => ({
        codePiece: piece.codePiece,
        nomPiece: piece.nomPiece,
        formatAccepte: piece.formatAccepte ?? 'PDF',
        obligatoire: piece.obligatoire ?? true,
        ordreAffichage: piece.ordreAffichage ?? 1,
        actif: this.isActive(piece.actif),
      })),
    };

    this.selectedCategoryId = critere.categorieEvaluationId ?? null;
    this.errorMessage = '';
    this.successMessage = '';
    this.modalOpen = true;

    this.loadCategoriesForScope(critere.categorieEvaluationId ?? null);
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editMode = false;
    this.editingId = null;
    this.form = this.getEmptyForm();
  }

  onTypeChampChange(value: string): void {
    const typeChamp = String(value || 'TEXT').toUpperCase();
    this.form.typeChamp = typeChamp;

    switch (typeChamp) {
      case 'BOOLEAN':
        this.form.typeNotation = 'OUI_NON';
        this.form.optionsChamp = '';
        break;

      case 'NUMBER':
        this.form.typeNotation = 'SEUIL_NUMERIQUE';
        this.form.optionsChamp = '';
        break;

      case 'SELECT':
        this.form.typeNotation = 'AUTOMATIQUE';
        break;

      default:
        this.form.typeNotation = 'MANUEL';
        this.form.optionsChamp = '';
        break;
    }
  }

  save(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.selectedTypeIntervenantId) {
      this.errorMessage = "Veuillez sélectionner un type d'intervenant.";
      return;
    }

    if (!this.selectedLotId) {
      this.errorMessage = 'Veuillez sélectionner un domaine.';
      return;
    }

    if (!this.selectedCategoryId) {
      this.errorMessage = 'Veuillez choisir une catégorie.';
      return;
    }

    if (!this.form.libelleCritere?.trim()) {
      this.errorMessage = 'Veuillez saisir le libellé du critère.';
      return;
    }

    const points = Number(this.form.pointsMax ?? 0);

    if (!Number.isFinite(points) || points <= 0) {
      this.errorMessage = 'Les points maximum doivent être supérieurs à zéro.';
      return;
    }

    if (points > this.getAvailablePointsForForm()) {
      this.errorMessage =
        `Impossible d'attribuer ${points} points. ` +
        `Il reste ${this.getAvailablePointsForForm()} point(s) disponibles.`;
      return;
    }

    if (
      this.form.typeChamp === 'SELECT' &&
      !this.form.optionsChamp?.trim()
    ) {
      this.errorMessage = 'Veuillez saisir les options de la liste.';
      return;
    }

    const request = this.buildRequest();
    this.saving = true;

    const action =
      this.editMode && this.editingId
        ? this.evaluationService.update(this.editingId, request)
        : this.evaluationService.create(request);

    action.subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = this.editMode
          ? 'Critère modifié avec succès.'
          : 'Critère ajouté avec succès.';

        this.closeModal();
        this.loadPieceNames();
        this.loadEvaluation();
      },
      error: (error: any) => {
        console.error('SAVE CRITERE ERROR', error);
        this.saving = false;
        this.errorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          "Erreur lors de l'enregistrement du critère.";
      },
    });
  }

  buildRequest(): CritereEvaluationRequest {
    const nomCritere = this.form.libelleCritere?.trim() || '';

    return {
      grilleEvaluationLotId: this.form.grilleEvaluationLotId || null,
      lotId: Number(this.selectedLotId ?? this.form.lotId),
      categorieEvaluationId: Number(this.selectedCategoryId),

      /* section n'est plus envoyée : le backend la déduit de la catégorie */
      codeCritere:
        this.form.codeCritere?.trim() || this.generateCodeCritere(),
      libelleCritere: nomCritere,

      labelCandidat: this.form.labelCandidat?.trim() || nomCritere,
      aideCandidat: this.form.aideCandidat?.trim() || '',
      raisonDonnee: this.form.raisonDonnee?.trim() || '',
      noteCandidat: this.form.noteCandidat?.trim() || '',
      noteEvaluateur: this.form.noteEvaluateur?.trim() || '',

      pointsMax: Number(this.form.pointsMax || 0),
      baremeNotation: this.form.baremeNotation?.trim() || '',
      typeNotation: this.form.typeNotation || 'MANUEL',

      typeChamp: this.form.typeChamp || 'TEXT',
      optionsChamp: this.form.optionsChamp?.trim() || '',
      obligatoire: this.form.obligatoire ?? true,

      ordreAffichage: Number(
        this.form.ordreAffichage || this.criteres.length + 1,
      ),
      actif: this.form.actif ?? true,
      pieces: this.normalizePieces(),
    };
  }

  getAvailablePointsForForm(): number {
    if (!this.editMode || !this.editingId) {
      return Math.max(0, Number(this.restePoints ?? 0));
    }

    const current = this.criteres.find(
      (critere) =>
        Number(critere.critereEvaluationId) === Number(this.editingId),
    );

    return Math.max(
      0,
      Number(this.restePoints ?? 0) + Number(current?.pointsMax ?? 0),
    );
  }

  getNotationHelp(): string {
    switch ((this.form.typeNotation || '').toUpperCase()) {
      case 'OUI_NON':
        return 'Exemple : Oui = 10 pts, Non = 0 pt.';
      case 'SEUIL_NUMERIQUE':
        return 'Exemple : ≥ 5 = 10 pts ; 3 à 4 = 7 pts ; 1 à 2 = 3 pts.';
      case 'AUTOMATIQUE':
        return 'Décrivez la correspondance entre la réponse et les points.';
      default:
        return "L'évaluateur attribuera la note dans la limite des points maximum.";
    }
  }

  /* =====================================================
     PIÈCES
  ===================================================== */

  normalizePieces(): CriterePieceRequest[] {
    return (this.form.pieces ?? [])
      .map((piece, index) => {
        const nomPiece = String(piece.nomPiece || '').trim();

        return {
          codePiece: piece.codePiece || this.generatePieceCode(nomPiece),
          nomPiece,
          formatAccepte: piece.formatAccepte || 'PDF',
          obligatoire: piece.obligatoire ?? true,
          ordreAffichage: index + 1,
          actif: piece.actif ?? true,
        } as CriterePieceRequest;
      })
      .filter((piece) => !!piece.nomPiece);
  }

  addPieceToCritere(nomPiece: string = ''): void {
    this.form.pieces.push({
      codePiece: nomPiece ? this.generatePieceCode(nomPiece) : '',
      nomPiece,
      formatAccepte: 'PDF',
      obligatoire: true,
      ordreAffichage: this.form.pieces.length + 1,
      actif: true,
    });
  }

  removePieceFromCritere(index: number): void {
    this.form.pieces.splice(index, 1);
    this.form.pieces = this.form.pieces.map((piece, i) => ({
      ...piece,
      ordreAffichage: i + 1,
    }));
  }

  /* =====================================================
     AFFICHAGE
  ===================================================== */

  getSections(): string[] {
    return [
      ...new Set(
        this.criteres.map(
          (critere) =>
            critere.categorieEvaluationLibelle ||
            critere.section ||
            'Sans catégorie',
        ),
      ),
    ];
  }

  getCriteresBySection(section: string): CritereEvaluationResponse[] {
    return this.criteres
      .filter((critere) => {
        const currentSection =
          critere.categorieEvaluationLibelle ||
          critere.section ||
          'Sans catégorie';
        return currentSection === section;
      })
      .sort(
        (a, b) =>
          Number(a.ordreAffichage ?? 0) -
          Number(b.ordreAffichage ?? 0),
      );
  }

  getSectionTotal(section: string): number {
    return this.getCriteresBySection(section).reduce(
      (sum, critere) => sum + Number(critere.pointsMax ?? 0),
      0,
    );
  }

  getPiecesText(critere: CritereEvaluationResponse): string[] {
    return (critere.pieces ?? [])
      .map((piece) => piece.nomPiece || piece.codePiece || '')
      .filter((value) => value.trim().length > 0);
  }

  getSelectedTypeName(): string {
    return (
      this.types.find(
        (type) => Number(type.id) === Number(this.selectedTypeIntervenantId),
      )?.libelle || ''
    );
  }

  getSelectedLotName(): string {
    return (
      this.lots.find((lot) => Number(lot.id) === Number(this.selectedLotId))
        ?.nomLot || ''
    );
  }

  getTypeChampLabel(type?: string | null): string {
    switch ((type ?? '').toUpperCase()) {
      case 'TEXT':
        return 'Texte';
      case 'TEXTAREA':
        return 'Texte long';
      case 'NUMBER':
        return 'Nombre';
      case 'DATE':
        return 'Date';
      case 'SELECT':
        return 'Liste';
      case 'BOOLEAN':
        return 'Oui / Non';
      default:
        return type || '-';
    }
  }

  getTypeNotationLabel(type?: string | null): string {
    switch ((type ?? '').toUpperCase()) {
      case 'MANUEL':
        return 'Évaluation manuelle';
      case 'AUTOMATIQUE':
        return 'Selon la réponse';
      case 'OUI_NON':
        return 'Oui / Non';
      case 'SEUIL_NUMERIQUE':
        return 'Selon la valeur';
      default:
        return type || 'Manuel';
    }
  }

  getVisiblePieceNames(): string[] {
    return this.pieceNames.slice(0, 10);
  }

  /* =====================================================
     SUPPRESSION / DÉSACTIVATION
  ===================================================== */

  openDeleteCritereModal(critere: CritereEvaluationResponse): void {
    if (!critere?.critereEvaluationId) {
      this.errorMessage = 'Identifiant du critère introuvable.';
      return;
    }

    this.deleteTarget = 'CRITERE';
    this.critereToDelete = critere;
    this.sectionToDelete = '';
    this.deleteModalOpen = true;
  }

  openDeleteGroupModal(section: string): void {
    if (!this.selectedLotId) {
      this.errorMessage = 'Veuillez sélectionner un domaine.';
      return;
    }

    const criteresDuGroupe = this.getCriteresBySection(section).filter(
      (critere) => Number(critere.lotId) === Number(this.selectedLotId),
    );

    if (criteresDuGroupe.length === 0) {
      this.errorMessage = 'Aucun critère à désactiver dans ce groupe.';
      return;
    }

    this.deleteTarget = 'GROUPE';
    this.sectionToDelete = section;
    this.critereToDelete = null;
    this.deleteModalOpen = true;
  }

  closeDeleteModal(): void {
    if (this.deleting) {
      return;
    }

    this.deleteModalOpen = false;
    this.deleteTarget = 'CRITERE';
    this.critereToDelete = null;
    this.sectionToDelete = '';
  }

  confirmDeleteModal(): void {
    if (this.deleteTarget === 'GROUPE') {
      this.confirmDeleteGroup();
    } else {
      this.confirmDeleteCritere();
    }
  }

  private confirmDeleteCritere(): void {
    const id = Number(this.critereToDelete?.critereEvaluationId ?? 0);

    if (id <= 0) {
      this.errorMessage = 'Critère introuvable.';
      this.closeDeleteModal();
      return;
    }

    const nom = this.critereToDelete?.libelleCritere || 'Critère';
    this.deleting = true;

    this.evaluationService.deactivate(id).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteModalOpen = false;
        this.critereToDelete = null;
        this.successMessage = `Le critère "${nom}" a été retiré de la grille active.`;
        this.loadEvaluation();
      },
      error: (error: any) => {
        console.error('DEACTIVATE CRITERE ERROR', error);
        this.deleting = false;
        this.errorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors de la désactivation du critère.';
      },
    });
  }

  private confirmDeleteGroup(): void {
    if (!this.selectedLotId || !this.sectionToDelete) {
      this.errorMessage = 'Groupe ou domaine introuvable.';
      this.closeDeleteModal();
      return;
    }

    const criteres = this.getCriteresBySection(this.sectionToDelete).filter(
      (critere) => Number(critere.lotId) === Number(this.selectedLotId),
    );

    if (criteres.length === 0) {
      this.closeDeleteModal();
      return;
    }

    this.deleting = true;

    forkJoin(
      criteres.map((critere) =>
        this.evaluationService.deactivate(critere.critereEvaluationId),
      ),
    ).subscribe({
      next: () => {
        const groupe = this.sectionToDelete;
        this.deleting = false;
        this.deleteModalOpen = false;
        this.sectionToDelete = '';
        this.successMessage = `Le groupe "${groupe}" a été retiré de la grille active.`;
        this.loadEvaluation();
      },
      error: (error: any) => {
        console.error('DEACTIVATE GROUP ERROR', error);
        this.deleting = false;
        this.errorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors de la désactivation du groupe.';
      },
    });
  }

  getDeleteModalTitle(): string {
    return this.deleteTarget === 'GROUPE'
      ? 'Retirer le groupe de la grille'
      : 'Retirer le critère de la grille';
  }

  getDeleteModalName(): string {
    return this.deleteTarget === 'GROUPE'
      ? this.sectionToDelete
      : this.critereToDelete?.libelleCritere || 'Critère';
  }

  getDeleteModalMessage(): string {
    return this.deleteTarget === 'GROUPE'
      ? 'Tous les critères de ce groupe seront désactivés. Les données restent conservées en base.'
      : 'Le critère sera désactivé et retiré de la grille active. Les données restent conservées en base.';
  }

  getDeleteModalCount(): number {
    if (this.deleteTarget !== 'GROUPE' || !this.sectionToDelete) {
      return 1;
    }

    return this.getCriteresBySection(this.sectionToDelete).length;
  }

  /* =====================================================
     GÉNÉRATEURS / UTILITAIRES
  ===================================================== */

  generateCodeCritere(): string {
    const numbers = this.criteres
      .map((critere) => String(critere.codeCritere || '').trim().toUpperCase())
      .filter((code) => /^P\d+$/.test(code))
      .map((code) => Number(code.replace('P', '')))
      .filter((value) => Number.isFinite(value));

    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `P${String(next).padStart(2, '0')}`;
  }

  generateCategoryCode(value: string): string {
    const code = this.normalizeCode(value, '_');
    return code.substring(0, 60) || 'CATEGORIE';
  }

  generatePieceCode(value: string): string {
    const code = this.normalizeCode(value, '-');
    return code.substring(0, 30) || 'PIECE';
  }

  private normalizeCode(value: string, separator: string): string {
    return String(value || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, separator)
      .replace(new RegExp(`^\\${separator}|\\${separator}$`, 'g'), '');
  }

  getEmptyForm(): CritereFormState {
    return {
      grilleEvaluationLotId: null,
      lotId: this.selectedLotId,
      categorieEvaluationId: null,

      codeCritere: '',
      libelleCritere: '',

      labelCandidat: '',
      aideCandidat: '',
      raisonDonnee: '',
      noteCandidat: '',
      noteEvaluateur: '',

      pointsMax: 0,
      baremeNotation: '',
      typeNotation: 'MANUEL',

      typeChamp: 'TEXT',
      optionsChamp: '',
      obligatoire: true,

      ordreAffichage: this.criteres.length + 1,
      actif: true,
      pieces: [],
    };
  }

  isActive(value: any): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  trackByLotId(index: number, lot: LotView): number {
    return lot.id;
  }

  trackByCritereId(
    index: number,
    critere: CritereEvaluationResponse,
  ): number {
    return critere.critereEvaluationId;
  }

  trackByCategoryId(
    index: number,
    category: CategorieEvaluationResponse,
  ): number {
    return Number(category.id ?? index);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
