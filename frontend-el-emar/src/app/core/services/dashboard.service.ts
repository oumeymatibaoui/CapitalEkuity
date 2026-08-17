import { Injectable } from "@angular/core";
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from "@angular/common/http";
import { Observable, catchError, map, throwError } from "rxjs";
import { environment } from '../../../environments/environment.development';

export type InternalUserType = "IT" | "DA" | "EL_EMAR" | "ADMIN" | string;
export type DashboardProfile =
  | "ADMIN"
  | "IT"
  | "ACHAT"
  | "TECHNIQUE"
  | "COMITE";
export type DashboardAlertLevel = "CRITICAL" | "WARNING" | "INFO";
export type DashboardDecisionFilter =
  | "ALL"
  | "ADMIS"
  | "EN_COURS"
  | "A_CORRIGER"
  | "REJETE";

export interface DashboardContextResponse {
  utilisateurId: number;
  nom: string;
  email?: string | null;
  typeUtilisateur: InternalUserType;
  roleId?: number | null;
  roleCode?: string | null;
  roleNom?: string | null;
  profile: DashboardProfile;
  admin: boolean;
}

export interface DashboardOverviewResponse {
  intervenantsActifs: number;
  dossiersActifs: number;
  evaluationsEnCours: number;
  decisionsEnAttente: number;
  classementsEnAttente: number;
  noteMoyenne: number;
}

export interface DashboardItStatsResponse {
  utilisateursActifs: number;
  rolesActifs: number;
  modulesActifs: number;
  utilisateursSansRole: number;
  rolesSansAcces: number;
}

export interface DashboardConfigurationStatsResponse {
  typesActifs: number;
  lotsActifs: number;
  categoriesActives: number;
  grillesActives: number;
  criteresActifs: number;
  lotsSansGrille: number;
  grillesSansCritere: number;
  grillesTotalInvalide: number;
  criteresSansCategorie: number;
}

export interface DashboardEvaluationStatsResponse {
  dossiersAffectes: number;
  evaluationsACommencer: number;
  evaluationsEnCours: number;
  evaluationsTerminees: number;
  evaluationsReouvertes: number;
  criteresAVerifier: number;
  criteresConformes: number;
  criteresNonConformes: number;
  noteMoyenne: number;
}

export interface DashboardCommitteeStatsResponse {
  dossiersEvalues: number;
  decisionsEnAttente: number;
  admis: number;
  rejetes: number;
  aCorriger: number;
  classementsEnAttente: number;
  dossiersClasses: number;
}

export interface DashboardAlertResponse {
  code: string;
  level: DashboardAlertLevel;
  title: string;
  message: string;
  count: number;
  actionLabel: string;
  route: string;
}

export interface DashboardActivityResponse {
  id: number;
  action: string;
  description: string;
  utilisateurNom?: string | null;
  dateAction?: string | null;
}

export interface DashboardQuickActionResponse {
  code: string;
  label: string;
  description?: string | null;
  icon?: string | null;
  route: string;
  moduleCode?: string | null;
}

export interface DashboardIntervenantResponse {
  candidatureId: number;
  applicationCandidatureId?: number | null;
  raisonSociale: string;
  email?: string | null;
  typeIntervenantId?: number | null;
  typeIntervenantLibelle?: string | null;
  lotId?: number | null;
  lotNom?: string | null;
  score: number;
  decision?: string | null;
  zoneId?: number | null;
  zoneNom?: string | null;
  classement?: string | null;
  statutEvaluation?: string | null;
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
  context: DashboardContextResponse;
  overview: DashboardOverviewResponse;
  it: DashboardItStatsResponse;
  configuration: DashboardConfigurationStatsResponse;
  evaluation: DashboardEvaluationStatsResponse;
  committee: DashboardCommitteeStatsResponse;
  alerts: DashboardAlertResponse[];
  activities: DashboardActivityResponse[];
  quickActions: DashboardQuickActionResponse[];
  intervenants: DashboardIntervenantResponse[];
  decisions: DashboardDecisionResponse[];
  zones: DashboardZoneResponse[];
  noteBands: DashboardNoteBandResponse[];
  typesIntervenant: DashboardOptionResponse[];
  lots: DashboardOptionResponse[];
}

export interface DashboardFilters {
  typeIntervenantId?: number | null;
  lotId?: number | null;
  decision?: DashboardDecisionFilter | string | null;
  search?: string | null;
}

@Injectable({
  providedIn: "root",
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/el-emar/dashboard`;

  constructor(private readonly http: HttpClient) {}

  getDashboard(
    filters: DashboardFilters = {},
  ): Observable<DashboardResponse> {
    const params = this.buildParams(filters);

    return this.http
      .get<DashboardResponse>(this.apiUrl, { params })
      .pipe(
        map((response: DashboardResponse) => this.normalizeResponse(response)),
        catchError((error: HttpErrorResponse) => this.handleError(error)),
      );
  }

  test(): Observable<string> {
    return this.http
      .get(`${this.apiUrl}/test`, { responseType: "text" })
      .pipe(
        catchError((error: HttpErrorResponse) => this.handleError(error)),
      );
  }

  private buildParams(filters: DashboardFilters): HttpParams {
    let params = new HttpParams();

    const typeIntervenantId = this.toPositiveId(filters.typeIntervenantId);
    const lotId = this.toPositiveId(filters.lotId);
    const decision = this.normalizeDecision(filters.decision);
    const search = String(filters.search ?? "").trim();

    if (typeIntervenantId !== null) {
      params = params.set("typeIntervenantId", String(typeIntervenantId));
    }

    if (lotId !== null) {
      params = params.set("lotId", String(lotId));
    }

    if (decision !== "ALL") {
      params = params.set("decision", decision);
    }

    if (search) {
      params = params.set("search", search);
    }

    return params;
  }

  private normalizeDecision(value?: string | null): string {
    const normalized = String(value ?? "ALL").trim().toUpperCase();

    if (!normalized) {
      return "ALL";
    }

    if (normalized === "REJETES") {
      return "REJETE";
    }

    return normalized;
  }

  private normalizeResponse(response: DashboardResponse): DashboardResponse {
    return {
      context: {
        utilisateurId: this.number(response?.context?.utilisateurId),
        nom: this.text(response?.context?.nom, "Utilisateur"),
        email: response?.context?.email ?? null,
        typeUtilisateur: this.text(response?.context?.typeUtilisateur),
        roleId: this.nullableNumber(response?.context?.roleId),
        roleCode: response?.context?.roleCode ?? null,
        roleNom: response?.context?.roleNom ?? null,
        profile: this.profile(response?.context?.profile),
        admin: Boolean(response?.context?.admin),
      },
      overview: this.normalizeOverview(response?.overview),
      it: this.normalizeIt(response?.it),
      configuration: this.normalizeConfiguration(response?.configuration),
      evaluation: this.normalizeEvaluation(response?.evaluation),
      committee: this.normalizeCommittee(response?.committee),
      alerts: Array.isArray(response?.alerts)
        ? response.alerts.map((item) => ({
            ...item,
            count: this.number(item.count),
          }))
        : [],
      activities: Array.isArray(response?.activities)
        ? response.activities
        : [],
      quickActions: Array.isArray(response?.quickActions)
        ? response.quickActions
        : [],
      intervenants: Array.isArray(response?.intervenants)
        ? response.intervenants.map((item) => ({
            ...item,
            candidatureId: this.number(item.candidatureId),
            applicationCandidatureId: this.nullableNumber(
              item.applicationCandidatureId,
            ),
            typeIntervenantId: this.nullableNumber(item.typeIntervenantId),
            lotId: this.nullableNumber(item.lotId),
            zoneId: this.nullableNumber(item.zoneId),
            score: this.number(item.score),
          }))
        : [],
      decisions: Array.isArray(response?.decisions)
        ? response.decisions.map((item) => ({
            ...item,
            count: this.number(item.count),
          }))
        : [],
      zones: Array.isArray(response?.zones)
        ? response.zones.map((item) => ({
            ...item,
            zoneId: this.number(item.zoneId),
            count: this.number(item.count),
          }))
        : [],
      noteBands: Array.isArray(response?.noteBands)
        ? response.noteBands.map((item) => ({
            ...item,
            count: this.number(item.count),
          }))
        : [],
      typesIntervenant: Array.isArray(response?.typesIntervenant)
        ? response.typesIntervenant.map((item) => ({
            id: this.number(item.id),
            label: this.text(item.label),
          }))
        : [],
      lots: Array.isArray(response?.lots)
        ? response.lots.map((item) => ({
            id: this.number(item.id),
            label: this.text(item.label),
          }))
        : [],
    };
  }

  private normalizeOverview(
    value?: DashboardOverviewResponse | null,
  ): DashboardOverviewResponse {
    return {
      intervenantsActifs: this.number(value?.intervenantsActifs),
      dossiersActifs: this.number(value?.dossiersActifs),
      evaluationsEnCours: this.number(value?.evaluationsEnCours),
      decisionsEnAttente: this.number(value?.decisionsEnAttente),
      classementsEnAttente: this.number(value?.classementsEnAttente),
      noteMoyenne: this.number(value?.noteMoyenne),
    };
  }

  private normalizeIt(
    value?: DashboardItStatsResponse | null,
  ): DashboardItStatsResponse {
    return {
      utilisateursActifs: this.number(value?.utilisateursActifs),
      rolesActifs: this.number(value?.rolesActifs),
      modulesActifs: this.number(value?.modulesActifs),
      utilisateursSansRole: this.number(value?.utilisateursSansRole),
      rolesSansAcces: this.number(value?.rolesSansAcces),
    };
  }

  private normalizeConfiguration(
    value?: DashboardConfigurationStatsResponse | null,
  ): DashboardConfigurationStatsResponse {
    return {
      typesActifs: this.number(value?.typesActifs),
      lotsActifs: this.number(value?.lotsActifs),
      categoriesActives: this.number(value?.categoriesActives),
      grillesActives: this.number(value?.grillesActives),
      criteresActifs: this.number(value?.criteresActifs),
      lotsSansGrille: this.number(value?.lotsSansGrille),
      grillesSansCritere: this.number(value?.grillesSansCritere),
      grillesTotalInvalide: this.number(value?.grillesTotalInvalide),
      criteresSansCategorie: this.number(value?.criteresSansCategorie),
    };
  }

  private normalizeEvaluation(
    value?: DashboardEvaluationStatsResponse | null,
  ): DashboardEvaluationStatsResponse {
    return {
      dossiersAffectes: this.number(value?.dossiersAffectes),
      evaluationsACommencer: this.number(value?.evaluationsACommencer),
      evaluationsEnCours: this.number(value?.evaluationsEnCours),
      evaluationsTerminees: this.number(value?.evaluationsTerminees),
      evaluationsReouvertes: this.number(value?.evaluationsReouvertes),
      criteresAVerifier: this.number(value?.criteresAVerifier),
      criteresConformes: this.number(value?.criteresConformes),
      criteresNonConformes: this.number(value?.criteresNonConformes),
      noteMoyenne: this.number(value?.noteMoyenne),
    };
  }

  private normalizeCommittee(
    value?: DashboardCommitteeStatsResponse | null,
  ): DashboardCommitteeStatsResponse {
    return {
      dossiersEvalues: this.number(value?.dossiersEvalues),
      decisionsEnAttente: this.number(value?.decisionsEnAttente),
      admis: this.number(value?.admis),
      rejetes: this.number(value?.rejetes),
      aCorriger: this.number(value?.aCorriger),
      classementsEnAttente: this.number(value?.classementsEnAttente),
      dossiersClasses: this.number(value?.dossiersClasses),
    };
  }

  private profile(value: unknown): DashboardProfile {
    const normalized = String(value ?? "TECHNIQUE")
      .trim()
      .toUpperCase();

    if (
      ["ADMIN", "IT", "ACHAT", "TECHNIQUE", "COMITE"].includes(normalized)
    ) {
      return normalized as DashboardProfile;
    }

    return "TECHNIQUE";
  }

  private toPositiveId(value?: number | null): number | null {
    const numericValue = Number(value);
    return Number.isInteger(numericValue) && numericValue > 0
      ? numericValue
      : null;
  }

  private nullableNumber(value: unknown): number | null {
    return value === null || value === undefined ? null : this.number(value);
  }

  private number(value: unknown): number {
    const numericValue = Number(value ?? 0);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  private text(value: unknown, fallback = ""): string {
    const result = String(value ?? "").trim();
    return result || fallback;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error("DASHBOARD API ERROR", {
      status: error.status,
      url: error.url,
      message: error.message,
      backend: error.error,
    });

    return throwError(() => error);
  }
}
