import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  DashboardDecisionResponse,
  DashboardFilters,
  DashboardNoteBandResponse,
  DashboardOptionResponse,
  DashboardResponse,
  DashboardScoreIntervenantResponse,
  DashboardService,
  DashboardStatsResponse,
  DashboardZoneResponse
} from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-tableau-de-bord',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tableau-de-bord.html',
  styleUrl: './tableau-de-bord.scss',
})
export class TableauDeBord implements OnInit {

  loading = false;
  pageError = '';

  stats: DashboardStatsResponse = this.getInitialStats();

  scoreIntervenants: DashboardScoreIntervenantResponse[] = [];
  decisions: DashboardDecisionResponse[] = this.getInitialDecisions();
  zones: DashboardZoneResponse[] = [];
  noteBands: DashboardNoteBandResponse[] = this.getInitialNoteBands();

  typesIntervenant: DashboardOptionResponse[] = [];
  lots: DashboardOptionResponse[] = [];

  filters: DashboardFilters = {
    typeIntervenantId: null,
    lotId: null,
    decision: 'ALL',
    search: ''
  };

  constructor(
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.initDashboardRapide();
    this.loadDashboard();
  }

  private initDashboardRapide(): void {
    this.loading = true;
    this.pageError = '';

    this.stats = this.getInitialStats();
    this.decisions = this.getInitialDecisions();
    this.noteBands = this.getInitialNoteBands();
    this.scoreIntervenants = [];
    this.zones = [];
    this.typesIntervenant = [];
    this.lots = [];
  }

  loadDashboard(): void {
    this.loading = true;
    this.pageError = '';

    const currentFilters: DashboardFilters = {
      typeIntervenantId: this.filters.typeIntervenantId || null,
      lotId: this.filters.lotId || null,
      decision: this.filters.decision || 'ALL',
      search: this.filters.search || ''
    };

    this.dashboardService.getDashboard(currentFilters).subscribe({
      next: (data: DashboardResponse) => {
        this.stats = data.stats || this.getInitialStats();

        this.scoreIntervenants =
          data.scoreIntervenants ||
          (data as any).scoreCandidats ||
          [];

        this.decisions =
          data.decisions && data.decisions.length > 0
            ? data.decisions
            : this.getInitialDecisions();

        this.zones = data.zones || [];

        this.noteBands =
          data.noteBands && data.noteBands.length > 0
            ? data.noteBands
            : this.getInitialNoteBands();

        this.typesIntervenant = data.typesIntervenant || [];
        this.lots = data.lots || [];

        this.loading = false;
      },
      error: (error: any) => {
        console.error('ERROR LOAD DASHBOARD', error);

        this.loading = false;

        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors du chargement du tableau de bord.';
      }
    });
  }

  onTypeChange(value: number | null): void {
    this.filters.typeIntervenantId = value;
    this.filters.lotId = null;
    this.loadDashboard();
  }

  onLotChange(value: number | null): void {
    this.filters.lotId = value;
    this.loadDashboard();
  }

  onDecisionChange(value: string): void {
    this.filters.decision = value || 'ALL';
    this.loadDashboard();
  }

  onSearchChange(value: string): void {
    this.filters.search = value || '';
  }

  applyFilters(): void {
    this.loadDashboard();
  }

  resetFilters(): void {
    this.filters = {
      typeIntervenantId: null,
      lotId: null,
      decision: 'ALL',
      search: ''
    };

    this.loadDashboard();
  }

  getScoreValue(item: DashboardScoreIntervenantResponse): number {
    const value = Number(item.score || 0);

    if (value < 0) return 0;
    if (value > 100) return 100;

    return value;
  }

  getAverageScore(): number {
    return Number(this.stats?.moyenneScore || 0);
  }

  getTauxConformite(): number {
    return Number(this.stats?.tauxConformite || 0);
  }

  getConformityWidth(): number {
    const value = this.getTauxConformite();

    if (value < 0) return 0;
    if (value > 100) return 100;

    return value;
  }

  getScoreClass(score?: number | null): string {
    const value = Number(score || 0);

    if (value >= 80) return 'score-high';
    if (value >= 60) return 'score-medium';

    return 'score-low';
  }

  getScoreStatus(score?: number | null): string {
    const value = Number(score || 0);

    if (value >= 80) return 'Très favorable';
    if (value >= 60) return 'À analyser';

    return 'Faible';
  }

  getMaxScore(): number {
    if (!this.scoreIntervenants || this.scoreIntervenants.length === 0) {
      return 100;
    }

    const max = Math.max(
      ...this.scoreIntervenants.map(item => this.getScoreValue(item))
    );

    return max > 0 ? max : 100;
  }

  getBarHeight(item: DashboardScoreIntervenantResponse): number {
    const score = this.getScoreValue(item);
    const max = this.getMaxScore();

    if (max <= 0) return 0;

    return Math.max(8, (score / max) * 100);
  }

  getShortIntervenantName(name?: string | null): string {
    if (!name) return 'Intervenant';

    const clean = name.trim();

    if (clean.length <= 18) return clean;

    return clean.substring(0, 18) + '...';
  }

  getDecisionLabel(value?: string | null): string {
    const decision = String(value || '').toUpperCase();

    if (['ADMIS', 'ACCEPTE', 'ACCEPTEE'].includes(decision)) {
      return 'Admis';
    }

    if (['REJETE', 'REJETEE', 'REFUSE'].includes(decision)) {
      return 'Rejeté';
    }

    if (['A_CORRIGER', 'CORRECTION', 'DEMANDE_CORRECTION'].includes(decision)) {
      return 'À corriger';
    }

    return 'En cours';
  }

  getDecisionClass(value?: string | null): string {
    const decision = String(value || '').toUpperCase();

    if (['ADMIS', 'ACCEPTE', 'ACCEPTEE'].includes(decision)) {
      return 'decision-admis';
    }

    if (['REJETE', 'REJETEE', 'REFUSE'].includes(decision)) {
      return 'decision-rejete';
    }

    if (['A_CORRIGER', 'CORRECTION', 'DEMANDE_CORRECTION'].includes(decision)) {
      return 'decision-correction';
    }

    return 'decision-cours';
  }

  getDecisionCount(code: string): number {
    const item = this.decisions.find(d => d.code === code);
    return Number(item?.count || 0);
  }

  getDecisionTotal(): number {
    return this.decisions.reduce(
      (sum, item) => sum + Number(item.count || 0),
      0
    );
  }

  getDecisionPercent(code: string): number {
    const total = this.getDecisionTotal();

    if (total <= 0) return 0;

    return Number(((this.getDecisionCount(code) / total) * 100).toFixed(1));
  }

  getDecisionPieStyle(): string {
    const total = this.getDecisionTotal();

    if (total <= 0) {
      return 'conic-gradient(#edf2f7 0deg 360deg)';
    }

    const admisDeg = this.getDecisionPercent('ADMIS') * 3.6;
    const enCoursDeg = this.getDecisionPercent('EN_COURS') * 3.6;
    const aCorrigerDeg = this.getDecisionPercent('A_CORRIGER') * 3.6;
    const rejetesDeg = this.getDecisionPercent('REJETES') * 3.6;

    const p1 = admisDeg;
    const p2 = p1 + enCoursDeg;
    const p3 = p2 + aCorrigerDeg;
    const p4 = p3 + rejetesDeg;

    return `conic-gradient(
      #38cfa0 0deg ${p1}deg,
      #6078d8 ${p1}deg ${p2}deg,
      #f6bd60 ${p2}deg ${p3}deg,
      #f87171 ${p3}deg ${p4}deg,
      #edf2f7 ${p4}deg 360deg
    )`;
  }

  getNoteBandCount(code: string): number {
    const item = this.noteBands.find(b => b.code === code);
    return Number(item?.count || 0);
  }

  getNoteBandTotal(): number {
    return this.noteBands.reduce(
      (sum, item) => sum + Number(item.count || 0),
      0
    );
  }

  getNoteBandPercent(code: string): number {
    const total = this.getNoteBandTotal();

    if (total <= 0) return 0;

    return Number(((this.getNoteBandCount(code) / total) * 100).toFixed(1));
  }

  getZoneMax(): number {
    if (!this.zones || this.zones.length === 0) return 1;

    const max = Math.max(...this.zones.map(zone => Number(zone.count || 0)));

    return max > 0 ? max : 1;
  }

  getZoneWidth(zone: DashboardZoneResponse): number {
    const max = this.getZoneMax();
    const value = Number(zone.count || 0);

    return Math.max(6, (value / max) * 100);
  }

  getTopIntervenants(): DashboardScoreIntervenantResponse[] {
    return this.scoreIntervenants.slice(0, 8);
  }

  trackByApplicationId(index: number, item: DashboardScoreIntervenantResponse): number {
    return item.applicationCandidatureId;
  }

  trackByZone(index: number, item: DashboardZoneResponse): number {
    return item.zoneId || index;
  }

  private getInitialStats(): DashboardStatsResponse {
    return {
      totalCandidatures: 0,
      totalApplications: 0,

      admis: 0,
      rejetes: 0,
      aCorriger: 0,
      enCours: 0,

      scoreInferieur100: 0,

      totalControles: 0,
      piecesConformes: 0,
      piecesNonConformes: 0,

      tauxConformite: 0,
      moyenneScore: 0
    };
  }

  private getInitialDecisions(): DashboardDecisionResponse[] {
    return [
      {
        code: 'ADMIS',
        label: 'Admis',
        count: 0
      },
      {
        code: 'EN_COURS',
        label: 'En cours',
        count: 0
      },
      {
        code: 'A_CORRIGER',
        label: 'À corriger',
        count: 0
      },
      {
        code: 'REJETES',
        label: 'Rejetés',
        count: 0
      }
    ];
  }

  private getInitialNoteBands(): DashboardNoteBandResponse[] {
    return [
      {
        code: 'SUP_80',
        label: '≥ 80 / 100',
        count: 0
      },
      {
        code: 'BETWEEN_60_79',
        label: '60 - 79 / 100',
        count: 0
      },
      {
        code: 'INF_60',
        label: '< 60 / 100',
        count: 0
      }
    ];
  }
}