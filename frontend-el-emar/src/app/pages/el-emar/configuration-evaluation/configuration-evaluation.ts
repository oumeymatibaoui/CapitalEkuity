import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { forkJoin } from 'rxjs';
import {
  CategorieEvaluation,
  CritereEvaluationRequest,
  CritereEvaluationResponse,
  CriterePieceRequest,
  EvaluationConfigurationService
} from '../../../core/services/evaluation-configuration.service';

import {
  TypeIntervenant,
  TypeIntervenantService
} from '../../../core/services/type-intervenant.service';

import {
  Lot,
  LotService
} from '../../../core/services/lot.service';

type LotView = Lot & {
  id: number;
  nomLot: string;
  codeLot?: string;
};

@Component({
  selector: 'app-configuration-evaluation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuration-evaluation.html',
  styleUrl: './configuration-evaluation.scss'
})
export class ConfigurationEvaluation implements OnInit {

  types: TypeIntervenant[] = [];
  lots: LotView[] = [];
categoryModalOpen = false;
savingCategory = false;
categoryFormError = '';

categoryForm = {
  libelle: '',
  code: '',
  description: '',
  globalForType: true
};
  selectedTypeIntervenantId: number | null = null;
  selectedLotId: number | null = null;

  categoriesEvaluation: CategorieEvaluation[] = [];
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

  form: CritereEvaluationRequest = this.getEmptyForm();

  constructor(
    private evaluationService: EvaluationConfigurationService,
    private typeService: TypeIntervenantService,
    private lotService: LotService
  ) {}

  ngOnInit(): void {
    this.loadTypes();
    this.loadPieceNames();
  }
openCategoryModal(): void {
  if (!this.selectedTypeIntervenantId) {
    this.errorMessage = 'Veuillez sélectionner un type d’intervenant.';
    return;
  }

  if (!this.selectedLotId) {
    this.errorMessage = 'Veuillez sélectionner un domaine.';
    return;
  }

  this.categoryForm = {
    libelle: '',
    code: '',
    description: '',
    globalForType: true
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

  if (!libelle) {
    this.categoryFormError = 'Le libellé de la catégorie est obligatoire.';
    return;
  }

  if (!this.selectedTypeIntervenantId) {
    this.categoryFormError = 'Le type d’intervenant est obligatoire.';
    return;
  }

  const payload = {
    typeIntervenantId: Number(this.selectedTypeIntervenantId),

    // true = catégorie générale pour ce type
    // false = catégorie spécifique au lot sélectionné
    lotId: this.categoryForm.globalForType ? null : this.selectedLotId,

    code: this.categoryForm.code?.trim()
      ? this.categoryForm.code.trim()
      : this.generateCategoryCode(libelle),

    libelle: libelle,
    description: this.categoryForm.description?.trim() || '',
    actif: true,
    ordreAffichage: this.categoriesEvaluation.length + 1
  };

  this.savingCategory = true;

  this.evaluationService.createCategory(payload).subscribe({
    next: (createdCategory) => {
      this.savingCategory = false;
      this.categoryModalOpen = false;

      this.categoriesEvaluation = [
        ...this.categoriesEvaluation,
        createdCategory
      ].sort((a, b) => {
        const ordreA = Number(a.ordreAffichage || 0);
        const ordreB = Number(b.ordreAffichage || 0);

        if (ordreA !== ordreB) {
          return ordreA - ordreB;
        }

        return a.libelle.localeCompare(b.libelle);
      });

      this.applyCategoryToForm(createdCategory);

      this.successMessage = 'Catégorie ajoutée avec succès.';
    },
    error: (error: any) => {
      console.error('SAVE CATEGORY ERROR', error);
      this.savingCategory = false;

      this.categoryFormError =
        error?.error?.message ||
        error?.error?.detail ||
        'Erreur lors de l’ajout de la catégorie.';
    }
  });
}

generateCategoryCode(value: string): string {
  let code = value
    .trim()
    .toUpperCase()
    .replaceAll('É', 'E')
    .replaceAll('È', 'E')
    .replaceAll('Ê', 'E')
    .replaceAll('À', 'A')
    .replaceAll('Â', 'A')
    .replaceAll('Ç', 'C')
    .replaceAll('Ù', 'U')
    .replaceAll('Û', 'U')
    .replaceAll('Î', 'I')
    .replaceAll('Ï', 'I')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  if (code.length > 60) {
    code = code.substring(0, 60);
  }

  return code || 'CATEGORIE';
}
  loadTypes(): void {
    this.loadingTypes = true;
    this.errorMessage = '';

    this.typeService.getAll(true).subscribe({
      next: (types: TypeIntervenant[]) => {
        this.types = types || [];
        this.loadingTypes = false;

        if (this.types.length > 0) {
          this.selectedTypeIntervenantId = this.types[0].id || null;
          this.loadLotsByType();
        }
      },
      error: (error: unknown) => {
        console.error('LOAD TYPES ERROR', error);
        this.loadingTypes = false;
        this.errorMessage = 'Erreur lors du chargement des types d’intervenants.';
      }
    });
  }

  onTypeChange(): void {
    this.selectedLotId = null;
    this.categoriesEvaluation = [];
    this.selectedCategoryId = null;
    this.criteres = [];
    this.totalPoints = 0;
    this.restePoints = 100;
    this.loadLotsByType();
  }

  loadLotsByType(): void {
    if (!this.selectedTypeIntervenantId) {
      this.lots = [];
      this.selectedLotId = null;
      this.criteres = [];
      this.categoriesEvaluation = [];
      return;
    }

    this.loadingLots = true;
    this.errorMessage = '';

    this.lotService.getAll(this.selectedTypeIntervenantId).subscribe({
      next: (lots: Lot[]) => {
        this.lots = (lots || [])
          .filter(lot => this.isActive(lot.actif))
          .map(lot => ({
            ...lot,
            id: Number(lot.id),
            nomLot: lot.nomLot || 'Domaine sans nom',
            codeLot: lot.codeLot || ''
          }));

        this.loadingLots = false;

        if (this.lots.length > 0) {
          this.selectLot(this.lots[0].id);
        } else {
          this.selectedLotId = null;
          this.criteres = [];
          this.categoriesEvaluation = [];
        }
      },
      error: (error: unknown) => {
        console.error('LOAD LOTS BY TYPE ERROR', error);
        this.loadingLots = false;
        this.errorMessage = 'Erreur lors du chargement des domaines de ce type.';
      }
    });
  }

  selectLot(lotId: number): void {
    this.selectedLotId = Number(lotId);
    this.form.lotId = this.selectedLotId;

    this.categoriesEvaluation = [];
    this.selectedCategoryId = null;

    this.loadCategoriesForScope();
    this.loadEvaluation();
  }

  loadCategoriesForScope(): void {
    if (!this.selectedTypeIntervenantId) {
      this.categoriesEvaluation = [];
      this.selectedCategoryId = null;
      return;
    }

    this.loadingCategories = true;

    this.evaluationService.getCategoriesByScope(
      Number(this.selectedTypeIntervenantId),
      this.selectedLotId,
      true
    ).subscribe({
      next: (categories: CategorieEvaluation[]) => {
        this.categoriesEvaluation = categories || [];
        this.loadingCategories = false;

        if (!this.editMode && this.categoriesEvaluation.length > 0) {
          this.applyCategoryToForm(this.categoriesEvaluation[0]);
        }
      },
      error: (error: unknown) => {
        console.error('LOAD CATEGORIES ERROR', error);
        this.loadingCategories = false;
        this.categoriesEvaluation = [];
        this.errorMessage = 'Erreur lors du chargement des catégories.';
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
      this.form.categorieEvaluationCode = null;
      this.form.categorieEvaluationLibelle = null;
      this.form.section = '';
      return;
    }

    this.applyCategoryToForm(category);
  }

 private applyCategoryToForm(category: CategorieEvaluation): void {
  this.selectedCategoryId = category.id ?? null;

  this.form.categorieEvaluationId = category.id ?? null;
  this.form.categorieEvaluationCode = category.code ?? null;
  this.form.categorieEvaluationLibelle = category.libelle ?? null;
  this.form.section = category.libelle ?? '';
}

  loadPieceNames(): void {
    this.evaluationService.getPieceNames().subscribe({
      next: (names: string[]) => {
        this.pieceNames = [...(names || [])].sort((a, b) => a.localeCompare(b));
      },
      error: () => {
        this.pieceNames = [];
      }
    });
  }

  loadEvaluation(): void {
    if (!this.selectedLotId) {
      this.criteres = [];
      this.loading = false;
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.evaluationService.getActiveByLot(this.selectedLotId).subscribe({
      next: (criteres: CritereEvaluationResponse[]) => {
        this.criteres = (criteres || []).sort(
          (a, b) => (a.ordreAffichage || 0) - (b.ordreAffichage || 0)
        );

        this.loading = false;
        this.loadTotals();
      },
      error: (error: unknown) => {
        console.error('LOAD CRITERES ERROR', error);
        this.loading = false;
        this.errorMessage = 'Erreur lors du chargement de la grille d’évaluation.';
      }
    });
  }

  loadTotals(): void {
    if (!this.selectedLotId) return;

    this.evaluationService.getTotalByLot(this.selectedLotId).subscribe({
      next: (total: number) => {
        this.totalPoints = Number(total || 0);
      },
      error: () => {
        this.totalPoints = 0;
      }
    });

    this.evaluationService.getResteByLot(this.selectedLotId).subscribe({
      next: (reste: number) => {
        this.restePoints = Number(reste || 0);
      },
      error: () => {
        this.restePoints = 100;
      }
    });
  }

  openCreateModal(): void {
  if (!this.selectedLotId) {
    this.errorMessage = 'Veuillez choisir un type puis un domaine.';
    return;
  }

  this.editMode = false;
  this.editingId = null;

  this.form = this.getEmptyForm();
  this.form.lotId = this.selectedLotId;
  this.form.ordreAffichage = this.criteres.length + 1;
  this.form.codeCritere = this.generateCodeCritere();

  if (this.categoriesEvaluation.length > 0) {
    this.applyCategoryToForm(this.categoriesEvaluation[0]);
  }

  this.modalOpen = true;
}

  openEditModal(critere: CritereEvaluationResponse): void {
    this.editMode = true;
    this.editingId = critere.id;

    this.form = {
      grilleEvaluationLotId: critere.grilleEvaluationLotId || null,
      lotId: critere.lotId,

      categorieEvaluationId: critere.categorieEvaluationId ?? null,
      categorieEvaluationCode: critere.categorieEvaluationCode ?? null,
      categorieEvaluationLibelle: critere.categorieEvaluationLibelle ?? null,

      codeCritere: critere.codeCritere || '',
      section: critere.categorieEvaluationLibelle || critere.section || '',
      libelleCritere: critere.libelleCritere || '',

      labelCandidat: critere.labelCandidat || '',
      aideCandidat: critere.aideCandidat || '',
      raisonDonnee: critere.raisonDonnee || '',
      noteCandidat: critere.noteCandidat || '',

      noteEvaluateur: critere.noteEvaluateur || '',

      pointsMax: Number(critere.pointsMax || 0),
      baremeNotation: critere.baremeNotation || '',
      typeNotation: critere.typeNotation || 'MANUEL',

      typeChamp: critere.typeChamp || 'TEXT',
      optionsChamp: critere.optionsChamp || '',
      obligatoire: critere.obligatoire ?? true,

      ordreAffichage: critere.ordreAffichage || 1,
      actif: this.isActive(critere.actif),

      pieces: (critere.pieces || []).map(piece => ({
        codePiece: piece.codePiece,
        nomPiece: piece.nomPiece,
        obligatoire: piece.obligatoire ?? true,
        ordreAffichage: piece.ordreAffichage || 1,
        actif: piece.actif ?? true
      } as any))
    };

    this.selectedCategoryId = critere.categorieEvaluationId ?? null;

    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editMode = false;
    this.editingId = null;
    this.form = this.getEmptyForm();
  }

  save(): void {
    if (!this.selectedTypeIntervenantId) {
      this.errorMessage = 'Veuillez sélectionner un type d’intervenant.';
      return;
    }

    if (!this.selectedLotId) {
      this.errorMessage = 'Veuillez sélectionner un domaine.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.categorieEvaluationId) {
      this.errorMessage = 'Veuillez choisir une catégorie.';
      return;
    }

    if (!this.form.libelleCritere?.trim()) {
      this.errorMessage = 'Veuillez saisir le libellé du critère.';
      return;
    }

    if (!this.form.pointsMax || Number(this.form.pointsMax) <= 0) {
      this.errorMessage = 'Veuillez saisir les points max.';
      return;
    }

    if (this.form.typeChamp === 'SELECT' && !this.form.optionsChamp?.trim()) {
      this.errorMessage = 'Veuillez saisir les options de la liste.';
      return;
    }

    const request = this.buildRequest();

    this.saving = true;

    const action = this.editMode && this.editingId
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
          'Erreur lors de l’enregistrement du critère.';
      }
    });
  }

  deleteCritere(id: number): void {
  const confirmed = confirm(
    'Voulez-vous vraiment supprimer ce critère de l’affichage ?\n\nIl sera désactivé, pas supprimé définitivement.'
  );

  if (!confirmed) return;

  this.evaluationService.deactivate(id).subscribe({
    next: () => {
      this.successMessage = 'Critère supprimé de l’affichage avec succès.';
      this.loadEvaluation();
      this.loadPieceNames();
      this.loadTotals();
    },
    error: (error: any) => {
      console.error('DEACTIVATE CRITERE ERROR', error);

      this.errorMessage =
        error?.error?.message ||
        error?.error?.detail ||
        'Erreur lors de la suppression du critère.';
    }
  });
}

  buildRequest(): CritereEvaluationRequest {
    const nomCritere = this.form.libelleCritere?.trim() || '';
    const categorieLabel =
      this.form.categorieEvaluationLibelle ||
      this.form.section ||
      'Sans catégorie';

    return {
      grilleEvaluationLotId: this.form.grilleEvaluationLotId || null,
      lotId: this.selectedLotId || this.form.lotId,

      categorieEvaluationId: this.form.categorieEvaluationId ?? null,
      categorieEvaluationCode: this.form.categorieEvaluationCode ?? null,
      categorieEvaluationLibelle: this.form.categorieEvaluationLibelle ?? null,

      codeCritere: this.form.codeCritere?.trim() || this.generateCodeCritere(),
      section: categorieLabel.trim(),

      libelleCritere: nomCritere,

      labelCandidat: this.form.labelCandidat?.trim() || nomCritere,
      aideCandidat: this.form.aideCandidat?.trim() || '',
      raisonDonnee: this.form.raisonDonnee?.trim() || '',
      noteCandidat: this.form.noteCandidat?.trim() || '',

      pointsMax: Number(this.form.pointsMax || 0),
      baremeNotation: this.form.baremeNotation?.trim() || '',
      typeNotation: this.form.typeNotation || 'MANUEL',
      noteEvaluateur: this.form.noteEvaluateur?.trim() || '',

      typeChamp: this.form.typeChamp || 'TEXT',
      optionsChamp: this.form.optionsChamp?.trim() || '',
      obligatoire: this.form.obligatoire ?? true,

      ordreAffichage: Number(this.form.ordreAffichage || this.criteres.length + 1),
      actif: this.form.actif ?? true,

      pieces: this.normalizePieces()
    };
  }

  normalizePieces(): CriterePieceRequest[] {
    const pieces = this.form.pieces || [];

    return pieces
      .map((piece: any, index: number) => {
        const nomPiece = String(piece.nomPiece || '').trim();

        return {
          codePiece: piece.codePiece || this.generatePieceCode(nomPiece),
          nomPiece,
          obligatoire: piece.obligatoire ?? true,
          ordreAffichage: index + 1,
          actif: piece.actif ?? true
        } as any;
      })
      .filter(piece => !!piece.nomPiece);
  }

  addPieceToCritere(nomPiece: string = ''): void {
    if (!this.form.pieces) {
      this.form.pieces = [];
    }

    this.form.pieces.push({
      codePiece: nomPiece ? this.generatePieceCode(nomPiece) : '',
      nomPiece,
      obligatoire: true,
      ordreAffichage: this.form.pieces.length + 1,
      actif: true
    } as any);
  }

  removePieceFromCritere(index: number): void {
    this.form.pieces?.splice(index, 1);

    this.form.pieces = (this.form.pieces || []).map((piece: any, i: number) => ({
      ...piece,
      ordreAffichage: i + 1
    }));
  }

  // generateCodeCritere(): string {
  //   const lot = this.lots.find(item => item.id === this.selectedLotId);
  //   const lotCode = lot?.codeLot || lot?.nomLot?.substring(0, 3) || 'LOT';
  //   const index = this.criteres.length + 1;

  //   return `${lotCode.toUpperCase()}-C${index.toString().padStart(2, '0')}`;
  // }

  generatePieceCode(nomPiece: string): string {
    if (!nomPiece) return '';

    let code = nomPiece
      .trim()
      .toUpperCase()
      .replaceAll('É', 'E')
      .replaceAll('È', 'E')
      .replaceAll('Ê', 'E')
      .replaceAll('À', 'A')
      .replaceAll('Â', 'A')
      .replaceAll('Ç', 'C')
      .replaceAll('Ù', 'U')
      .replaceAll('Û', 'U')
      .replaceAll('Î', 'I')
      .replaceAll('Ï', 'I')
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (code.length > 30) {
      code = code.substring(0, 30);
    }

    return code || 'PIECE';
  }

  getEmptyForm(): CritereEvaluationRequest {
    return {
      grilleEvaluationLotId: null,
      lotId: this.selectedLotId || 0,

      categorieEvaluationId: null,
      categorieEvaluationCode: null,
      categorieEvaluationLibelle: null,

      codeCritere: '',
      section: '',
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
      pieces: []
    };
  }

  getSections(): string[] {
    const sections = this.criteres.map(
      critere =>
        critere.categorieEvaluationLibelle ||
        critere.section ||
        'Sans catégorie'
    );

    return [...new Set(sections)];
  }

  getCriteresBySection(section: string): CritereEvaluationResponse[] {
    return this.criteres
      .filter(critere => {
        const currentSection =
          critere.categorieEvaluationLibelle ||
          critere.section ||
          'Sans catégorie';

        return currentSection === section;
      })
      .sort((a, b) => (a.ordreAffichage || 0) - (b.ordreAffichage || 0));
  }

  getSectionTotal(section: string): number {
    return this.getCriteresBySection(section)
      .reduce((sum, critere) => sum + Number(critere.pointsMax || 0), 0);
  }

getPiecesText(critere: CritereEvaluationResponse): string[] {
  return (critere.pieces || [])
    .map(piece => piece.nomPiece || piece.codePiece || '')
    .filter((value): value is string => value.trim().length > 0);
}

  getSelectedTypeName(): string {
    const type = this.types.find(t => t.id === Number(this.selectedTypeIntervenantId));
    return type?.libelle || '';
  }

  getSelectedLotName(): string {
    return this.lots.find(lot => lot.id === this.selectedLotId)?.nomLot || '';
  }

getTypeChampLabel(type?: string | null): string {
  const value = (type ?? '').toUpperCase();

  switch (value) {
    case 'TEXT': return 'Texte';
    case 'TEXTAREA': return 'Texte long';
    case 'NUMBER': return 'Nombre';
    case 'DATE': return 'Date';
    case 'SELECT': return 'Liste';
    case 'BOOLEAN': return 'Oui / Non';
    default: return value || '-';
  }
}

  getTypeNotationLabel(type?: string): string {
    const value = (type || '').toUpperCase();

    switch (value) {
      case 'MANUEL': return 'Manuel';
      case 'AUTOMATIQUE': return 'Automatique';
      case 'OUI_NON': return 'Oui / Non';
      case 'SEUIL_NUMERIQUE': return 'Seuil numérique';
      default: return value || 'Manuel';
    }
  }

  getVisiblePieceNames(): string[] {
    return this.pieceNames.slice(0, 10);
  }

  isActive(value: any): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  trackByLotId(index: number, lot: LotView): number {
    return lot.id;
  }

  trackByCritereId(index: number, critere: CritereEvaluationResponse): number {
    return critere.id;
  }

  trackByCategoryId(index: number, category: CategorieEvaluation): number {
    return Number(category.id || index);
  }

  trackByIndex(index: number): number {
    return index;
  }
deleteCategoryGroup(section: string): void {
  if (!this.selectedLotId) {
    this.errorMessage = 'Veuillez sélectionner un lot.';
    return;
  }

  const lotId = Number(this.selectedLotId);

  const criteresToDeactivate = this.getCriteresBySection(section)
    .filter(critere => Number(critere.lotId) === lotId);

  if (criteresToDeactivate.length === 0) {
    this.errorMessage = 'Aucun critère à supprimer dans ce lot.';
    return;
  }

  const lotName = this.getSelectedLotName();

  const confirmed = confirm(
    `Voulez-vous vraiment supprimer le groupe "${section}" uniquement pour le lot "${lotName}" ?\n\nLes critères seront désactivés, pas supprimés définitivement.`
  );

  if (!confirmed) {
    return;
  }

  this.loading = true;
  this.errorMessage = '';
  this.successMessage = '';

  const deactivateRequests = criteresToDeactivate.map(critere =>
    this.evaluationService.deactivate(critere.id)
  );

  forkJoin(deactivateRequests).subscribe({
    next: () => {
      this.loading = false;

      this.successMessage =
        `Le groupe "${section}" a été supprimé de l’affichage uniquement pour le lot "${lotName}".`;

      const ids = new Set(criteresToDeactivate.map(critere => critere.id));

      this.criteres = this.criteres.filter(
        critere => !ids.has(critere.id)
      );

      this.loadEvaluation();
      this.loadTotals();
    },
    error: (error: any) => {
      console.error('DEACTIVATE GROUP ERROR', error);

      this.loading = false;

      this.errorMessage =
        error?.error?.message ||
        error?.error?.detail ||
        'Erreur lors de la suppression du groupe pour ce lot.';
    }
  });
}
generateCodeCritere(): string {
  const existingCodes = this.criteres
    .map(critere => critere.codeCritere || '')
    .map(code => code.trim().toUpperCase())
    .filter(code => /^P\d+$/.test(code));

  const numbers = existingCodes
    .map(code => Number(code.replace('P', '')))
    .filter(value => !isNaN(value));

  const nextNumber = numbers.length > 0
    ? Math.max(...numbers) + 1
    : 1;

  return `P${nextNumber.toString().padStart(2, '0')}`;
}
}