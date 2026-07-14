import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ClassementZoneResponse,
  ClassementZoneService
} from '../../../core/services/classement-zone.service';

@Component({
  selector: 'app-classification',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './classification.html',
  styleUrl: './classification.scss',
})
export class Classification implements OnInit {

  classements: ClassementZoneResponse[] = [];

  loading = false;
  pageError = '';
  successMessage = '';

  selectedCategorie = '';

  constructor(
    private classementZoneService: ClassementZoneService
  ) {}

  ngOnInit(): void {
    this.loadClassements();
  }

  loadClassements(): void {
    this.loading = true;
    this.pageError = '';
    this.successMessage = '';

    this.classementZoneService.getClassements().subscribe({
      next: (data: ClassementZoneResponse[]) => {
        this.classements = data || [];
        this.loading = false;
      },
      error: (error: any) => {
        console.error('ERROR LOAD CLASSEMENTS', error);
        this.loading = false;
        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors du chargement des classements.';
      }
    });
  }

  getFilteredClassements(): ClassementZoneResponse[] {
    return this.classements.filter(item => {
      if (!this.selectedCategorie) {
        return true;
      }

      return String(item.categorie || '').toUpperCase() === this.selectedCategorie;
    });
  }

  getZoneLabel(item: ClassementZoneResponse): string {
    return item.nomZone || 'Zone non disponible';
  }

  getNomCandidat(item: ClassementZoneResponse): string {
    return (
      item.nomEntreprise ||
      item.raisonSociale ||
      'Entreprise non disponible'
    );
  }

  getCategorieLabel(categorie?: string | null): string {
    const value = String(categorie || '').toUpperCase();

    if (value === 'A') return 'Catégorie A';
    if (value === 'B') return 'Catégorie B';
    if (value === 'C') return 'Catégorie C';
    if (value === 'NON_QUALIFIE') return 'Non qualifié';
    if (value === 'A_CLASSER') return 'À classer';

    return value || '-';
  }

  getCategorieClass(categorie?: string | null): string {
    const value = String(categorie || '').toUpperCase();

    if (value === 'A') return 'categorie-a';
    if (value === 'B') return 'categorie-b';
    if (value === 'C') return 'categorie-c';
    if (value === 'NON_QUALIFIE') return 'categorie-non-qualifie';

    return 'categorie-attente';
  }

  getValidationLabel(item: ClassementZoneResponse): string {
    return item.actif === true ? 'Validé' : 'Non validé';
  }

  getValidationClass(item: ClassementZoneResponse): string {
    return item.actif === true ? 'validation-ok' : 'validation-non';
  }

  trackByClassementId(index: number, item: ClassementZoneResponse): number {
    return item.id;
  }
}