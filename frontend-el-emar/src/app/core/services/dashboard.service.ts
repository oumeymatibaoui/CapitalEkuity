import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStatsResponse {
  totalCandidatures: number;
  totalApplications: number;

  admis: number;
  rejetes: number;
  aCorriger: number;
  enCours: number;

  scoreInferieur100: number;

  totalControles: number;
  piecesConformes: number;
  piecesNonConformes: number;

  tauxConformite: number;
  moyenneScore: number;
}

export interface DashboardScoreIntervenantResponse {
  candidatureId: number;
  applicationCandidatureId: number;

  raisonSociale?: string | null;
  email?: string | null;

  lotId?: number | null;
  lotNom?: string | null;

  typeIntervenantId?: number | null;
  typeIntervenantLibelle?: string | null;

  zoneId?: number | null;
  zoneNom?: string | null;

  score?: number | null;
  decision?: string | null;
}

export interface DashboardDecisionResponse {
  code: string;
  label: string;
  count: number;
}

export interface DashboardZoneResponse {
  zoneId: number;
  zoneNom: string;
  count: number;
}

export interface DashboardNoteBandResponse {
  code: string;
  label: string;
  count: number;
}

export interface DashboardOptionResponse {
  id: number;
  label: string;
}

export interface DashboardResponse {
  stats: DashboardStatsResponse;
  scoreIntervenants: DashboardScoreIntervenantResponse[];
  decisions: DashboardDecisionResponse[];
  zones: DashboardZoneResponse[];
  noteBands: DashboardNoteBandResponse[];
  typesIntervenant: DashboardOptionResponse[];
  lots: DashboardOptionResponse[];
}

export interface DashboardFilters {
  typeIntervenantId?: number | null;
  lotId?: number | null;
  decision?: string | null;
  search?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private readonly apiUrl = 'http://localhost:8089/api/el-emar/dashboard';

  constructor(private http: HttpClient) {}

  getDashboard(filters: DashboardFilters): Observable<DashboardResponse> {
    let params = new HttpParams();

    if (filters.typeIntervenantId) {
      params = params.set('typeIntervenantId', String(filters.typeIntervenantId));
    }

    if (filters.lotId) {
      params = params.set('lotId', String(filters.lotId));
    }

    if (filters.decision && filters.decision !== 'ALL') {
      params = params.set('decision', filters.decision);
    }

    if (filters.search && filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }

    return this.http.get<DashboardResponse>(this.apiUrl, { params });
  }
}