import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Lot,
  LotService
} from '../../../core/services/lot.service';

import {
  TypeIntervenant,
  TypeIntervenantService
} from '../../../core/services/type-intervenant.service';

@Component({
  selector: 'app-lots',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lots.html',
  styleUrl: './lots.scss'
})
export class Lots implements OnInit {

  lots: Lot[] = [];
  types: TypeIntervenant[] = [];

  selectedTypeFilter: number | null = null;

  showModal = false;
  showDeleteModal = false;
  isEditMode = false;

  lotToEdit: Lot | null = null;
  lotToDelete: Lot | null = null;

  form: Lot = this.getEmptyForm();

  formError = '';
  fieldErrors: { [key: string]: string } = {};

  loading = false;

  constructor(
    private lotService: LotService,
    private typeService: TypeIntervenantService
  ) {}

  ngOnInit(): void {
    this.loadTypes();
    this.loadLots();
  }

  loadTypes(): void {
    this.typeService.getAll(true).subscribe({
      next: (data: TypeIntervenant[]) => {
        this.types = data || [];

        if (!this.form.typeIntervenantId && this.types.length > 0) {
          this.form.typeIntervenantId = this.types[0].id || null;
        }
      },
      error: (error: unknown) => {
        console.error('ERROR LOAD TYPES', error);
        this.formError = 'Erreur lors du chargement des types d’intervenants.';
      }
    });
  }

  loadLots(): void {
    this.loading = true;

    this.lotService.getAll(this.selectedTypeFilter).subscribe({
      next: (data: Lot[]) => {
        this.lots = data || [];
        this.loading = false;
      },
      error: (error: unknown) => {
        console.error('ERROR LOAD LOTS', error);
        this.formError = 'Erreur lors du chargement des domaines.';
        this.loading = false;
      }
    });
  }

  onTypeFilterChange(): void {
    this.loadLots();
  }

  get activeLotsCount(): number {
    return this.lots.filter(lot => this.isLotActive(lot)).length;
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.lotToEdit = null;
    this.form = this.getEmptyForm();

    if (this.selectedTypeFilter) {
      this.form.typeIntervenantId = this.selectedTypeFilter;
    } else if (this.types.length > 0) {
      this.form.typeIntervenantId = this.types[0].id || null;
    }

    this.resetErrors();
    this.showModal = true;
  }

  openEditModal(lot: Lot): void {
    this.isEditMode = true;
    this.lotToEdit = lot;

    this.form = {
      id: lot.id,
      codeLot: lot.codeLot,
      nomLot: lot.nomLot,
      description: lot.description || '',
      actif: this.isLotActive(lot),
      typeIntervenantId: lot.typeIntervenantId || null
    };

    this.resetErrors();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.lotToEdit = null;
    this.resetErrors();
  }

  saveLot(): void {
    if (!this.validateForm()) return;

    const payload: Lot = {
      codeLot: this.form.codeLot.trim().toUpperCase(),
      nomLot: this.form.nomLot.trim(),
      description: this.form.description?.trim() || null,
      actif: this.form.actif === true,
      typeIntervenantId: Number(this.form.typeIntervenantId)
    };

    if (this.isEditMode && this.lotToEdit?.id) {
      this.lotService.update(this.lotToEdit.id, payload).subscribe({
        next: () => {
          this.closeModal();
          this.loadLots();
        },
        error: (error: unknown) => {
          console.error('ERROR UPDATE LOT', error);
          this.formError = 'Erreur lors de la modification du domaine.';
        }
      });

      return;
    }

    this.lotService.create(payload).subscribe({
      next: () => {
        this.closeModal();
        this.loadLots();
      },
      error: (error: unknown) => {
        console.error('ERROR CREATE LOT', error);
        this.formError = 'Erreur lors de la création du domaine.';
      }
    });
  }

  openDeleteModal(lot: Lot): void {
    this.lotToDelete = lot;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.lotToDelete = null;
    this.showDeleteModal = false;
  }

  confirmDeleteLot(): void {
    if (!this.lotToDelete?.id) return;

    this.lotService.delete(this.lotToDelete.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadLots();
      },
      error: (error: unknown) => {
        console.error('ERROR DELETE LOT', error);
        this.formError = 'Erreur lors de la suppression du domaine.';
        this.closeDeleteModal();
      }
    });
  }

  toggleLotStatus(lot: Lot): void {
    if (!lot.id) return;

    const payload: Lot = {
      ...lot,
      actif: !this.isLotActive(lot),
      typeIntervenantId: lot.typeIntervenantId || null
    };

    this.lotService.update(lot.id, payload).subscribe({
      next: () => this.loadLots(),
      error: (error: unknown) => {
        console.error('ERROR TOGGLE LOT', error);
        this.formError = 'Erreur lors du changement de statut.';
      }
    });
  }

  isLotActive(lot: Lot): boolean {
    return lot.actif === true ||
      lot.actif === 'true' ||
      lot.actif === 1 ||
      lot.actif === '1';
  }

  getLotTheme(codeLot?: string | null): string {
    const code = (codeLot || '').toUpperCase();

    if (code.includes('ELEC')) return 'theme-electricite';
    if (code.includes('FLUID')) return 'theme-fluides';
    if (code.includes('STRUCT')) return 'theme-structure';
    if (code.includes('OPC')) return 'theme-opc';
    if (code.includes('ARCH')) return 'theme-architecture';

    return 'theme-default';
  }

  getTypeLabel(typeId?: number | null): string {
    if (!typeId) return '-';

    const type = this.types.find(t => t.id === Number(typeId));

    return type?.libelle || '-';
  }

  private validateForm(): boolean {
    this.resetErrors();

    if (!this.form.typeIntervenantId) {
      this.fieldErrors['typeIntervenantId'] = 'Le type d’intervenant est obligatoire.';
    }

    if (!this.form.codeLot || !this.form.codeLot.trim()) {
      this.fieldErrors['codeLot'] = 'Le code du domaine est obligatoire.';
    }

    if (!this.form.nomLot || !this.form.nomLot.trim()) {
      this.fieldErrors['nomLot'] = 'Le nom du domaine est obligatoire.';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  private resetErrors(): void {
    this.formError = '';
    this.fieldErrors = {};
  }

  private getEmptyForm(): Lot {
    return {
      codeLot: '',
      nomLot: '',
      description: '',
      actif: true,
      typeIntervenantId: null
    };
  }
}