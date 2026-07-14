import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  TypeIntervenant,
  TypeIntervenantService
} from '../../../core/services/type-intervenant.service';

@Component({
  selector: 'app-types-intervenant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './types-intervenant.html',
  styleUrl: './types-intervenant.scss'
})
export class TypesIntervenant implements OnInit {

  types: TypeIntervenant[] = [];

  showModal = false;
  showDeleteModal = false;
  isEditMode = false;

  typeToEdit: TypeIntervenant | null = null;
  typeToDelete: TypeIntervenant | null = null;

  form: TypeIntervenant = this.getEmptyForm();

  formError = '';
  fieldErrors: { [key: string]: string } = {};

  loading = false;

  constructor(private typeService: TypeIntervenantService) {}

  ngOnInit(): void {
    this.loadTypes();
  }

  loadTypes(): void {
    this.loading = true;

    this.typeService.getAll(false).subscribe({
      next: (data: TypeIntervenant[]) => {
        this.types = data || [];
        this.loading = false;
      },
      error: (error: unknown) => {
        console.error('ERROR LOAD TYPES', error);
        this.formError = 'Erreur lors du chargement des types d’intervenants.';
        this.loading = false;
      }
    });
  }

  get activeTypesCount(): number {
    return this.types.filter(type => this.isTypeActive(type)).length;
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.typeToEdit = null;
    this.form = this.getEmptyForm();
    this.resetErrors();
    this.showModal = true;
  }

  openEditModal(type: TypeIntervenant): void {
    this.isEditMode = true;
    this.typeToEdit = type;

    this.form = {
      id: type.id,
      code: type.code,
      libelle: type.libelle,
      description: type.description || '',
      actif: this.isTypeActive(type),
      ordreAffichage: type.ordreAffichage || 0
    };

    this.resetErrors();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.typeToEdit = null;
    this.resetErrors();
  }

  saveType(): void {
    if (!this.validateForm()) return;

    const payload: TypeIntervenant = {
      code: this.form.code.trim().toUpperCase(),
      libelle: this.form.libelle.trim(),
      description: this.form.description?.trim() || null,
      actif: this.form.actif === true,
      ordreAffichage: Number(this.form.ordreAffichage || 0)
    };

    if (this.isEditMode && this.typeToEdit?.id) {
      this.typeService.update(this.typeToEdit.id, payload).subscribe({
        next: () => {
          this.closeModal();
          this.loadTypes();
        },
        error: (error: unknown) => {
          console.error('ERROR UPDATE TYPE', error);
          this.formError = 'Erreur lors de la modification du type.';
        }
      });

      return;
    }

    this.typeService.create(payload).subscribe({
      next: () => {
        this.closeModal();
        this.loadTypes();
      },
      error: (error: unknown) => {
        console.error('ERROR CREATE TYPE', error);
        this.formError = 'Erreur lors de la création du type.';
      }
    });
  }

  openDeleteModal(type: TypeIntervenant): void {
    this.typeToDelete = type;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.typeToDelete = null;
    this.showDeleteModal = false;
  }

  confirmDeleteType(): void {
    if (!this.typeToDelete?.id) return;

    this.typeService.delete(this.typeToDelete.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadTypes();
      },
      error: (error: unknown) => {
        console.error('ERROR DELETE TYPE', error);
        this.formError =
          'Impossible de supprimer ce type. Vérifiez qu’il ne contient aucun domaine / lot.';
        this.closeDeleteModal();
      }
    });
  }

  toggleTypeStatus(type: TypeIntervenant): void {
    if (!type.id) return;

    const payload: TypeIntervenant = {
      ...type,
      actif: !this.isTypeActive(type)
    };

    this.typeService.update(type.id, payload).subscribe({
      next: () => this.loadTypes(),
      error: (error: unknown) => {
        console.error('ERROR TOGGLE TYPE', error);
        this.formError = 'Erreur lors du changement de statut.';
      }
    });
  }

  isTypeActive(type: TypeIntervenant): boolean {
    return type.actif === true ||
      type.actif === 'true' ||
      type.actif === 1 ||
      type.actif === '1';
  }

  private validateForm(): boolean {
    this.resetErrors();

    if (!this.form.code || !this.form.code.trim()) {
      this.fieldErrors['code'] = 'Le code est obligatoire.';
    }

    if (!this.form.libelle || !this.form.libelle.trim()) {
      this.fieldErrors['libelle'] = 'Le libellé est obligatoire.';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  private resetErrors(): void {
    this.formError = '';
    this.fieldErrors = {};
  }

  private getEmptyForm(): TypeIntervenant {
    return {
      code: '',
      libelle: '',
      description: '',
      actif: true,
      ordreAffichage: 0
    };
  }
}