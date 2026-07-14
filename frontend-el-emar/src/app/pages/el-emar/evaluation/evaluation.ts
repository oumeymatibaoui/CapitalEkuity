import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import {
  ElEmarCandidatureListItem,
  ElEmarEvaluationService,
  LotNoteItem
} from '../../../core/services/l-emar-evaluation.service';

import {
  TypeIntervenant,
  TypeIntervenantService
} from '../../../core/services/type-intervenant.service';

@Component({
  selector: 'app-evaluation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './evaluation.html',
  styleUrl: './evaluation.scss'
})
export class Evaluation implements OnInit {

  candidatures: ElEmarCandidatureListItem[] = [];
  types: TypeIntervenant[] = [];

  loading = false;
  loadingTypes = false;

  pageError = '';
  successMessage = '';

  searchTerm = '';
  selectedStatut = 'ALL';

  selectedTypeIntervenantId: number | null = null;

  constructor(
    private evaluationService: ElEmarEvaluationService,
    private typeIntervenantService: TypeIntervenantService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTypes();
    this.loadCandidatures();
  }
getLotsNotes(candidature: ElEmarCandidatureListItem): LotNoteItem[] {
  if (candidature.lotsNotes && candidature.lotsNotes.length > 0) {
    return candidature.lotsNotes;
  }

  return (candidature.lots || []).map((lotName: string) => ({
    applicationCandidatureId: 0,
    lotId: 0,
    nomLot: lotName,
    noteLot: 0,
    statutLot: null,
    decisionFinale: null
  }));
}

getLotNoteClass(note?: number | null): string {
  const value = Number(note || 0);

  if (value >= 80) return 'score-good';
  if (value >= 50) return 'score-medium';
  return 'score-low';
}
  loadTypes(): void {
    this.loadingTypes = true;

    this.typeIntervenantService.getAll(true).subscribe({
      next: (data: TypeIntervenant[]) => {
        this.types = data || [];
        this.loadingTypes = false;
      },
      error: (error: unknown) => {
        console.error('ERROR LOAD TYPES INTERVENANT', error);
        this.pageError = 'Erreur lors du chargement des types d’intervenants.';
        this.loadingTypes = false;
      }
    });
  }

  loadCandidatures(): void {
    this.loading = true;
    this.pageError = '';
    this.successMessage = '';

    this.evaluationService
      .getCandidatures(this.selectedTypeIntervenantId)
      .subscribe({
        next: (data: ElEmarCandidatureListItem[]) => {
          this.candidatures = data || [];
          this.loading = false;
        },
        error: (error: unknown) => {
          console.error('ERROR LOAD CANDIDATURES EVALUATION', error);
          this.pageError = 'Erreur lors du chargement des candidatures soumises.';
          this.loading = false;
        }
      });
  }

  onTypeIntervenantChange(): void {
    this.searchTerm = '';
    this.loadCandidatures();
  }

  refresh(): void {
    this.loadCandidatures();
  }

  get filteredCandidatures(): ElEmarCandidatureListItem[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.candidatures.filter((candidature: ElEmarCandidatureListItem) => {
      const matchSearch =
        !term ||
        (candidature.raisonSociale || '').toLowerCase().includes(term) ||
        (candidature.emailPrincipal || '').toLowerCase().includes(term) ||
        (candidature.telephone || '').toLowerCase().includes(term) ||
        (candidature.ville || '').toLowerCase().includes(term) ||
        (candidature.typeIntervenantLibelle || '').toLowerCase().includes(term) ||
        (candidature.lots || []).join(' ').toLowerCase().includes(term);

      const matchStatut =
        this.selectedStatut === 'ALL' ||
        (candidature.statut || '').toUpperCase() === this.selectedStatut;

      return matchSearch && matchStatut;
    });
  }

  openCandidature(candidature: ElEmarCandidatureListItem): void {
    if (!candidature?.candidatureId) return;

    this.router.navigate([
      '/el-emar/evaluations',
      candidature.candidatureId
    ]);
  }

  getSelectedTypeLabel(): string {
    if (!this.selectedTypeIntervenantId) {
      return 'Tous les types';
    }

    const type = this.types.find(
      item => item.id === Number(this.selectedTypeIntervenantId)
    );

    return type?.libelle || 'Type sélectionné';
  }

  getLotsText(candidature: ElEmarCandidatureListItem): string {
    return candidature.lots && candidature.lots.length > 0
      ? candidature.lots.join(', ')
      : '-';
  }

  getAverageNote(): number {
    if (!this.filteredCandidatures || this.filteredCandidatures.length === 0) {
      return 0;
    }

    const total = this.filteredCandidatures.reduce(
      (sum: number, candidature: ElEmarCandidatureListItem) =>
        sum + Number(candidature.noteGlobale || 0),
      0
    );

    return Number((total / this.filteredCandidatures.length).toFixed(2));
  }

  getNoteClass(note?: number | null): string {
    const value = Number(note || 0);

    if (value >= 80) return 'score-good';
    if (value >= 50) return 'score-medium';
    return 'score-low';
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}