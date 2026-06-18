import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Lot, LotService } from '../../../core/services/lot.service';

@Component({
  selector: 'app-lots',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lots.html',
  styleUrl: './lots.scss',
})
export class Lots implements OnInit {

  lots: Lot[] = [];

  showModal = false;
  isEditMode = false;
  selectedLotId: number | null = null;

  showDeleteModal = false;
  lotToDelete: Lot | null = null;

  formError = '';
  fieldErrors: { [key: string]: string } = {};

  form: Lot = {
    codeLot: '',
    nomLot: '',
    description: '',
    actif: true
  };

  constructor(
    private lotService: LotService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLots();
  }

  get activeLotsCount(): number {
    return this.lots.filter(lot => this.isLotActive(lot)).length;
  }

  loadLots(): void {
    this.lotService.getAll().subscribe({
      next: data => {
        this.lots = [...data];
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
  console.log('API ERROR LOT = ', err);

  const message =
    err?.error?.message ||
    err?.error?.detail ||
    err?.error?.error ||
    'Une erreur est survenue';

  const newFieldErrors: { [key: string]: string } = {
    ...(err?.error?.errors || {})
  };

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('code')) {
    newFieldErrors['codeLot'] = message;
  }

  if (lowerMessage.includes('nom')) {
    newFieldErrors['nomLot'] = message;
  }

  this.formError = message;
  this.fieldErrors = { ...newFieldErrors };
  this.showModal = true;

  console.log('FORM ERROR = ', this.formError);
  console.log('FIELD ERRORS = ', this.fieldErrors);

  setTimeout(() => {
    this.cdr.detectChanges();
  }, 0);
}

validateLotForm(): boolean {
  this.resetErrors();

  if (!this.form.codeLot || !this.form.codeLot.trim()) {
    this.fieldErrors['codeLot'] = 'Le code du lot est obligatoire';
  }

  if (!this.form.nomLot || !this.form.nomLot.trim()) {
    this.fieldErrors['nomLot'] = 'Le nom du lot est obligatoire';
  }

  if (!this.form.description || !this.form.description.trim()) {
    this.fieldErrors['description'] = 'La description est obligatoire';
  }

  if (this.form.codeLot && this.form.codeLot.trim().length > 50) {
    this.fieldErrors['codeLot'] = 'Le code ne doit pas dépasser 50 caractères';
  }

  if (this.form.nomLot && this.form.nomLot.trim().length > 150) {
    this.fieldErrors['nomLot'] = 'Le nom ne doit pas dépasser 150 caractères';
  }

  return Object.keys(this.fieldErrors).length === 0;
}

  openCreateModal(): void {
    this.showModal = true;
    this.isEditMode = false;
    this.selectedLotId = null;

    this.resetErrors();

    this.form = {
      codeLot: '',
      nomLot: '',
      description: '',
      actif: true
    };
  }

  openEditModal(lot: Lot): void {
    this.showModal = true;
    this.isEditMode = true;
    this.selectedLotId = lot.id ?? null;

    this.resetErrors();

    this.form = {
      codeLot: lot.codeLot,
      nomLot: lot.nomLot,
      description: lot.description ?? '',
      actif: this.isLotActive(lot)
    };
  }

  closeModal(): void {
    this.showModal = false;
    this.resetErrors();
  }

  saveLot(): void {
    if (!this.validateLotForm()) {
      return;
    }

    const lotToSave: Lot = {
      ...this.form,
      codeLot: this.form.codeLot.trim().toUpperCase(),
      nomLot: this.form.nomLot.trim(),
      description: this.form.description?.trim() ?? '',
      actif: this.form.actif ?? true
    };

    if (this.isEditMode && this.selectedLotId) {
      this.lotService.update(this.selectedLotId, lotToSave).subscribe({
        next: () => {
          this.closeModal();
          this.loadLots();
        },
        error: err => {
          console.error(err);
          this.handleApiError(err);
        }
      });
    } else {
      this.lotService.create(lotToSave).subscribe({
        next: () => {
          this.closeModal();
          this.loadLots();
        },
        error: err => {
          console.error(err);
          this.handleApiError(err);
        }
      });
    }
  }

  toggleLotStatus(lot: Lot): void {
    if (!lot.id) return;

    const updatedLot: Lot = {
      ...lot,
      actif: !this.isLotActive(lot)
    };

    this.lotService.update(lot.id, updatedLot).subscribe({
      next: () => {
        this.loadLots();
      },
      error: err => console.error(err)
    });
  }

  openDeleteModal(lot: Lot): void {
    this.lotToDelete = lot;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.lotToDelete = null;
  }

  confirmDeleteLot(): void {
    if (!this.lotToDelete?.id) return;

    this.lotService.delete(this.lotToDelete.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadLots();
      },
      error: err => console.error(err)
    });
  }

  getLotTheme(codeLot: string): string {
    const code = codeLot?.toUpperCase() ?? '';

    if (code.includes('ARC')) return 'archi';
    if (code.includes('STR')) return 'structure';
    if (code.includes('FLU')) return 'fluides';
    if (code.includes('ELEC')) return 'electricite';
    if (code.includes('OPC')) return 'opc';

    return 'default';
  }
}