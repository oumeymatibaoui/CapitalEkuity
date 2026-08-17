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

type SortKey = 'rangGlobal' | 'raisonSociale' | 'nomLot' | 'nomZone' | 'noteLot' | 'dateSoumission';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-synthese',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './synthese.html',
  styleUrl: './synthese.scss',
})
export class Synthese implements OnInit {

  // --- data ---
  classement: CandidatLotClassement[] = [];

  loading = false;
  pageError = '';
  lastUpdated: Date | null = null;

  // --- filters ---
  minNote = 80;
  admisOnly = false;
  searchTerm = '';

  // --- sorting (client side, on top of the fetched page) ---
  sortKey: SortKey = 'noteLot';
  sortDir: SortDir = 'desc';

  // --- table density: show all rows only once requested, keeps first render light ---
  private readonly initialRowCount = 25;
  visibleRowCount = this.initialRowCount;

  private noteDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private elEmarEvaluationService: ElEmarEvaluationService
  ) {}

  ngOnInit(): void {
    this.loadClassement();
  }

  // ---------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------

  loadClassement(): void {
    this.loading = true;
    this.pageError = '';

    this.elEmarEvaluationService
      .getClassementCandidatsParLot(this.minNote, this.admisOnly)
      .subscribe({
        next: (data: CandidatLotClassement[]) => {
          this.classement = data || [];
          this.loading = false;
          this.lastUpdated = new Date();
          this.visibleRowCount = this.initialRowCount;
        },
        error: (error: any) => {
          console.error('ERROR LOAD CLASSEMENT', error);
          this.loading = false;

          this.pageError =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors du chargement du classement. Réessayez dans un instant.';
        }
      });
  }

  // ---------------------------------------------------------------------
  // Filters — inputs auto-apply so the user never has to hunt for a button
  // ---------------------------------------------------------------------

  onMinNoteChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);

    this.minNote = Number.isNaN(value) ? 80 : Math.max(0, Math.min(100, value));

    // debounce so we don't re-fetch on every keystroke
    if (this.noteDebounce) {
      clearTimeout(this.noteDebounce);
    }
    this.noteDebounce = setTimeout(() => this.loadClassement(), 450);
  }

  onAdmisOnlyChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.admisOnly = input.checked;
    this.loadClassement();
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.visibleRowCount = this.initialRowCount;
  }

  hasActiveFilters(): boolean {
    return this.minNote !== 80 || this.admisOnly || !!this.searchTerm;
  }

  resetFilters(): void {
    this.minNote = 80;
    this.admisOnly = false;
    this.searchTerm = '';
    this.loadClassement();
  }

  lowerThreshold(): void {
    this.minNote = Math.max(0, this.minNote - 10);
    this.loadClassement();
  }

  // ---------------------------------------------------------------------
  // Search + sort (client side — instant, no round trip)
  // ---------------------------------------------------------------------

  get filteredClassement(): CandidatLotClassement[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.classement;
    }

    return this.classement.filter(row =>
      row.raisonSociale?.toLowerCase().includes(term) ||
      row.nomLot?.toLowerCase().includes(term) ||
      row.nomZone?.toLowerCase().includes(term) ||
      row.emailPrincipal?.toLowerCase().includes(term)
    );
  }

  get sortedClassement(): CandidatLotClassement[] {
    const rows = [...this.filteredClassement];
    const dir = this.sortDir === 'asc' ? 1 : -1;

    return rows.sort((a, b) => {
      const va = a[this.sortKey];
      const vb = b[this.sortKey];

      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }

      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  get visibleClassement(): CandidatLotClassement[] {
    return this.sortedClassement.slice(0, this.visibleRowCount);
  }

  get hasMoreRows(): boolean {
    return this.visibleRowCount < this.sortedClassement.length;
  }

  showMoreRows(): void {
    this.visibleRowCount += 25;
  }

  sortBy(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = key === 'raisonSociale' || key === 'nomLot' || key === 'nomZone' ? 'asc' : 'desc';
    }
  }

  sortIcon(key: SortKey): 'up' | 'down' | 'none' {
    if (this.sortKey !== key) return 'none';
    return this.sortDir === 'asc' ? 'up' : 'down';
  }

  // ---------------------------------------------------------------------
  // Podium / stats
  // ---------------------------------------------------------------------

  get topThree(): CandidatLotClassement[] {
    return [...this.classement]
      .sort((a, b) => Number(b.noteLot || 0) - Number(a.noteLot || 0))
      .slice(0, 3);
  }

  getTopClassement(limit = 10): CandidatLotClassement[] {
    return [...this.classement]
      .sort((a, b) => Number(b.noteLot || 0) - Number(a.noteLot || 0))
      .slice(0, limit);
  }

  getBestNote(): number {
    if (!this.classement.length) return 0;
    return Math.max(...this.classement.map(row => Number(row.noteLot || 0)));
  }

  getAverageNote(): number {
    if (!this.classement.length) return 0;
    const total = this.classement.reduce((sum, row) => sum + Number(row.noteLot || 0), 0);
    return total / this.classement.length;
  }

  getAdmisCount(): number {
    return this.classement.filter(row => row.decisionFinale === 'ADMIS').length;
  }

  getBarWidth(note: number): number {
    const value = Number(note || 0);
    return Math.max(0, Math.min(100, value));
  }

  // ---------------------------------------------------------------------
  // Presentation helpers
  // ---------------------------------------------------------------------

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

  getScoreClass(note: number): string {
    const value = Number(note || 0);
    if (value >= 90) return 'high';
    if (value >= 80) return 'good';
    return '';
  }

  getInitials(name?: string | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p.charAt(0).toUpperCase()).join('');
  }

  trackByApplicationLot(index: number, row: CandidatLotClassement): string {
    return `${row.applicationCandidatureId}-${row.lotId}`;
  }

  // ---------------------------------------------------------------------
  // Export — one click, no extra dialogs
  // ---------------------------------------------------------------------

  exportCsv(): void {
    if (!this.sortedClassement.length) return;

    const headers = ['Rang', 'Candidat', 'Email', 'Téléphone', 'Type', 'Lot', 'Zone', 'Note', 'Décision', 'Statut', 'Date soumission'];

    const rows = this.sortedClassement.map(row => [
      row.rangGlobal ?? '',
      row.raisonSociale ?? '',
      row.emailPrincipal ?? '',
      row.telephone ?? '',
      row.typeCandidat ?? '',
      row.nomLot ?? '',
      row.nomZone ?? '',
      row.noteLot ?? '',
      this.getDecisionLabel(row.decisionFinale),
      row.statut ?? '',
      row.dateSoumission ?? ''
    ]);

    const escapeCell = (cell: unknown) => `"${String(cell).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows]
      .map(line => line.map(escapeCell).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `classement-el-emar-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}