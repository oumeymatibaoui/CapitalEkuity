import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

/* =====================================================
   CATÉGORIES
===================================================== */

export interface CategorieEvaluationRequest {
  typeIntervenantId: number;
  lotId?: number | null;
  code: string;
  libelle: string;
  description?: string | null;
  actif?: boolean | null;
  ordreAffichage?: number | null;
}

export interface CategorieEvaluationResponse {
  id?: number;

  typeIntervenantId?: number | null;
  typeIntervenantCode?: string | null;
  typeIntervenantLibelle?: string | null;

  lotId?: number | null;
  lotCode?: string | null;
  lotNom?: string | null;

  code?: string | null;
  libelle: string;
  description?: string | null;

  actif?: boolean | string | number | null;
  ordreAffichage?: number | null;
}

/* =====================================================
   PIÈCES
===================================================== */

export interface CriterePieceRequest {
  codePiece?: string | null;
  nomPiece: string;

  raisonPiece?: string | null;
  noteCandidat?: string | null;
  noteEvaluateur?: string | null;

  formatAccepte?: string | null;
  obligatoire?: boolean | null;
  conditionReponse?: string | null;

  ordreAffichage?: number | null;
  actif?: boolean | null;
}

export interface CriterePieceResponse {
  id: number;
  critereEvaluationId?: number | null;

  codePiece?: string | null;
  nomPiece: string;

  raisonPiece?: string | null;
  noteCandidat?: string | null;
  noteEvaluateur?: string | null;

  formatAccepte?: string | null;
  obligatoire?: boolean | null;
  conditionReponse?: string | null;

  ordreAffichage?: number | null;
  actif?: boolean | string | number | null;
}

/* =====================================================
   CRITÈRES
===================================================== */

export interface CritereEvaluationRequest {
  grilleEvaluationLotId?: number | null;
  lotId: number;
  categorieEvaluationId: number;

  /*
   * section n'est volontairement pas demandé à l'utilisateur.
   * Le backend la déduit de la catégorie sélectionnée.
   * On la garde optionnelle pour compatibilité avec d'anciens appels.
   */
  section?: string | null;

  codeCritere?: string | null;
  libelleCritere: string;

  labelCandidat?: string | null;
  aideCandidat?: string | null;
  raisonDonnee?: string | null;
  noteCandidat?: string | null;
  noteEvaluateur?: string | null;

  pointsMax: number;
  baremeNotation?: string | null;
  typeNotation?: string | null;

  typeChamp?: string | null;
  optionsChamp?: string | null;
  obligatoire?: boolean | null;

  ordreAffichage?: number | null;
  actif?: boolean | null;

  pieces?: CriterePieceRequest[];
}

export interface CritereEvaluationResponse {
  /* DTO backend actuel */
  critereEvaluationId: number;

  /* Compatibilité si une ancienne version renvoie encore id */
  id?: number | null;

  grilleEvaluationLotId?: number | null;

  lotId: number;
  lotNom?: string | null;

  categorieEvaluationId?: number | null;
  categorieEvaluationCode?: string | null;
  categorieEvaluationLibelle?: string | null;

  codeCritere?: string | null;
  section?: string | null;
  libelleCritere: string;

  labelCandidat?: string | null;
  aideCandidat?: string | null;
  raisonDonnee?: string | null;
  noteCandidat?: string | null;
  noteEvaluateur?: string | null;

  pointsMax?: number | null;
  baremeNotation?: string | null;
  typeNotation?: string | null;

  typeChamp?: string | null;
  optionsChamp?: string | null;
  obligatoire?: boolean | null;

  ordreAffichage?: number | null;
  actif?: boolean | string | number | null;

  pieces?: CriterePieceResponse[];
}

@Injectable({
  providedIn: 'root',
})
export class EvaluationConfigurationService {
  private readonly criteresUrl =
    `${environment.apiBaseUrl}/api/criteres-evaluation`;

  private readonly categoriesUrl =
    `${environment.apiBaseUrl}/api/categories-evaluation`;

  constructor(private http: HttpClient) {}

  /* =====================================================
     CATÉGORIES
  ===================================================== */

  getCategoriesByScope(
    typeIntervenantId: number,
    lotId?: number | null,
    activeOnly = true,
  ): Observable<CategorieEvaluationResponse[]> {
    let params = new HttpParams()
      .set('typeIntervenantId', String(typeIntervenantId))
      .set('activeOnly', String(activeOnly));

    if (lotId !== null && lotId !== undefined) {
      params = params.set('lotId', String(lotId));
    }

    return this.http.get<CategorieEvaluationResponse[]>(
      this.categoriesUrl,
      { params },
    );
  }

  createCategory(
    request: CategorieEvaluationRequest,
  ): Observable<CategorieEvaluationResponse> {
    return this.http.post<CategorieEvaluationResponse>(
      this.categoriesUrl,
      request,
    );
  }

  /* =====================================================
     CRITÈRES
  ===================================================== */

  getPieceNames(): Observable<string[]> {
    return this.http.get<string[]>(`${this.criteresUrl}/pieces/noms`);
  }

  getAll(): Observable<CritereEvaluationResponse[]> {
    return this.http
      .get<CritereEvaluationResponse[]>(this.criteresUrl)
      .pipe(map(items => (items ?? []).map(item => this.normalizeCritere(item))));
  }

  getByLot(lotId: number): Observable<CritereEvaluationResponse[]> {
    return this.http
      .get<CritereEvaluationResponse[]>(`${this.criteresUrl}/lot/${lotId}`)
      .pipe(map(items => (items ?? []).map(item => this.normalizeCritere(item))));
  }

  getActiveByLot(lotId: number): Observable<CritereEvaluationResponse[]> {
    return this.http
      .get<CritereEvaluationResponse[]>(
        `${this.criteresUrl}/lot/${lotId}/actifs`,
      )
      .pipe(map(items => (items ?? []).map(item => this.normalizeCritere(item))));
  }

  getTotalByLot(lotId: number): Observable<number> {
    return this.http.get<number>(`${this.criteresUrl}/lot/${lotId}/total`);
  }

  getResteByLot(lotId: number): Observable<number> {
    return this.http.get<number>(`${this.criteresUrl}/lot/${lotId}/reste`);
  }

  create(
    request: CritereEvaluationRequest,
  ): Observable<CritereEvaluationResponse> {
    return this.http
      .post<CritereEvaluationResponse>(this.criteresUrl, request)
      .pipe(map(item => this.normalizeCritere(item)));
  }

  update(
    id: number,
    request: CritereEvaluationRequest,
  ): Observable<CritereEvaluationResponse> {
    return this.http
      .put<CritereEvaluationResponse>(`${this.criteresUrl}/${id}`, request)
      .pipe(map(item => this.normalizeCritere(item)));
  }

  deactivate(id: number): Observable<void> {
    return this.http.patch<void>(
      `${this.criteresUrl}/${id}/deactivate`,
      {},
    );
  }

  toggleActif(id: number): Observable<CritereEvaluationResponse> {
    return this.http
      .patch<CritereEvaluationResponse>(
        `${this.criteresUrl}/${id}/toggle-actif`,
        {},
      )
      .pipe(map(item => this.normalizeCritere(item)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.criteresUrl}/${id}`);
  }

  private normalizeCritere(
    item: CritereEvaluationResponse,
  ): CritereEvaluationResponse {
    const id = Number(item?.critereEvaluationId ?? item?.id ?? 0);

    return {
      ...item,
      critereEvaluationId: id,
      lotId: Number(item?.lotId ?? 0),
      categorieEvaluationId:
        item?.categorieEvaluationId == null
          ? null
          : Number(item.categorieEvaluationId),
      grilleEvaluationLotId:
        item?.grilleEvaluationLotId == null
          ? null
          : Number(item.grilleEvaluationLotId),
      pointsMax: Number(item?.pointsMax ?? 0),
      ordreAffichage: Number(item?.ordreAffichage ?? 0),
      pieces: item?.pieces ?? [],
    };
  }
}
