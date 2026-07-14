import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ElEmarEvaluationService } from '../../../core/services/l-emar-evaluation.service';

export interface CandidatLotClassement {
  applicationCandidatureId: number;
  candidatureId: number;

  raisonSociale: string;
  emailPrincipal?: string | null;
  telephone?: string | null;

  typeCandidat?: string | null;

  lotId: number;
  nomLot: string;

  zoneId?: number | null;
  nomZone?: string | null;

  noteLot: number;

  decisionFinale?: string | null;
  statut?: string | null;

  rangGlobal?: number | null;
  rangParLot?: number | null;
  rangParLotZone?: number | null;

  dateSoumission?: string | null;
}

@Component({
  selector: 'app-synthese',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './synthese.html',
  styleUrl: './synthese.scss',
})
export class Synthese implements OnInit {

  classement: CandidatLotClassement[] = [];

  loading = false;
  pageError = '';

  minNote = 80;
  admisOnly = false;

  constructor(
    private elEmarEvaluationService: ElEmarEvaluationService
  ) {}

  ngOnInit(): void {
    this.loadClassement();
  }

  loadClassement(): void {
    this.loading = true;
    this.pageError = '';

    this.elEmarEvaluationService
      .getClassementCandidatsParLot(this.minNote, this.admisOnly)
      .subscribe({
        next: (data: CandidatLotClassement[]) => {
          this.classement = data || [];
          this.loading = false;
        },
        error: (error: any) => {
          console.error('ERROR LOAD CLASSEMENT', error);
          this.loading = false;

          this.pageError =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors du chargement du classement.';
        }
      });
  }

  onMinNoteChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);

    if (Number.isNaN(value)) {
      this.minNote = 80;
      return;
    }

    this.minNote = Math.max(0, Math.min(100, value));
  }

  onAdmisOnlyChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.admisOnly = input.checked;
  }

  getTopClassement(limit = 10): CandidatLotClassement[] {
    return [...this.classement]
      .sort((a, b) => Number(b.noteLot || 0) - Number(a.noteLot || 0))
      .slice(0, limit);
  }

  getBestNote(): number {
    if (!this.classement.length) return 0;

    return Math.max(
      ...this.classement.map(row => Number(row.noteLot || 0))
    );
  }

  getAverageNote(): number {
    if (!this.classement.length) return 0;

    const total = this.classement.reduce(
      (sum, row) => sum + Number(row.noteLot || 0),
      0
    );

    return total / this.classement.length;
  }

  getBarWidth(note: number): number {
    const value = Number(note || 0);
    return Math.max(0, Math.min(100, value));
  }

  getDecisionLabel(decision?: string | null): string {
    if (!decision) return 'Éligible';

    switch (decision) {
      case 'ADMIS':
        return 'Admis';
      case 'REJETE':
        return 'Rejeté';
      case 'CORRECTION_DEMANDEE':
        return 'Correction demandée';
      default:
        return decision;
    }
  }

  trackByApplicationLot(index: number, row: CandidatLotClassement): string {
    return `${row.applicationCandidatureId}-${row.lotId}`;
  }
}