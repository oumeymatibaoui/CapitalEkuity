import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
/* =========================
   CATÉGORIE D'ÉVALUATION
========================= */

export interface CategorieEvaluation {
  id?: number;

  typeIntervenantId: number;
  typeIntervenantCode?: string | null;
  typeIntervenantLibelle?: string | null;

  lotId?: number | null;
  lotCode?: string | null;
  lotNom?: string | null;

  code: string;
  libelle: string;
  description?: string | null;

  actif?: boolean | string | number;
  ordreAffichage?: number | null;

  createdAt?: string;
  updatedAt?: string;
}

/* =========================
   PIÈCES CRITÈRE
========================= */

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

/* =========================
   CRITÈRE D'ÉVALUATION
========================= */

export interface CritereEvaluationRequest {
  grilleEvaluationLotId?: number | null;

  lotId: number | null;

  categorieEvaluationId?: number | null;
  categorieEvaluationCode?: string | null;
  categorieEvaluationLibelle?: string | null;

  codeCritere?: string | null;
  section: string;
  libelleCritere: string;

  labelCandidat?: string | null;
  aideCandidat?: string | null;
  raisonDonnee?: string | null;
  noteCandidat?: string | null;

  noteEvaluateur?: string | null;

  pointsMax: number | null;
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
  id: number;

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
  providedIn: 'root'
})
export class EvaluationConfigurationService {

  private readonly criteresUrl = 'http://localhost:8089/api/criteres-evaluation';
  private readonly categoriesUrl = 'http://localhost:8089/api/categories-evaluation';

  constructor(private http: HttpClient) {}

  /* =========================
     CATÉGORIES
  ========================= */

  getCategoriesByScope(
    typeIntervenantId: number,
    lotId?: number | null,
    activeOnly = true
  ): Observable<CategorieEvaluation[]> {
    let params = new HttpParams()
      .set('typeIntervenantId', String(typeIntervenantId))
      .set('activeOnly', String(activeOnly));

    if (lotId) {
      params = params.set('lotId', String(lotId));
    }

    return this.http.get<CategorieEvaluation[]>(this.categoriesUrl, { params });
  }

  createCategory(category: CategorieEvaluation): Observable<CategorieEvaluation> {
    return this.http.post<CategorieEvaluation>(this.categoriesUrl, category);
  }

  updateCategory(
    id: number,
    category: CategorieEvaluation
  ): Observable<CategorieEvaluation> {
    return this.http.put<CategorieEvaluation>(
      `${this.categoriesUrl}/${id}`,
      category
    );
  }

  toggleCategoryActif(id: number): Observable<CategorieEvaluation> {
    return this.http.patch<CategorieEvaluation>(
      `${this.categoriesUrl}/${id}/toggle-actif`,
      {}
    );
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.categoriesUrl}/${id}`);
  }

  /* =========================
     CRITÈRES
  ========================= */

  getByLot(lotId: number): Observable<CritereEvaluationResponse[]> {
    return this.http.get<CritereEvaluationResponse[]>(
      `${this.criteresUrl}/lot/${lotId}`
    );
  }

  getActiveByLot(lotId: number): Observable<CritereEvaluationResponse[]> {
    return this.http.get<CritereEvaluationResponse[]>(
      `${this.criteresUrl}/lot/${lotId}/actifs`
    );
  }

  getTotalByLot(lotId: number): Observable<number> {
    return this.http.get<number>(
      `${this.criteresUrl}/lot/${lotId}/total`
    );
  }

  getResteByLot(lotId: number): Observable<number> {
    return this.http.get<number>(
      `${this.criteresUrl}/lot/${lotId}/reste`
    );
  }

  getPieceNames(): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.criteresUrl}/pieces/noms`
    );
  }

  create(
    request: CritereEvaluationRequest
  ): Observable<CritereEvaluationResponse> {
    return this.http.post<CritereEvaluationResponse>(
      this.criteresUrl,
      request
    );
  }

  update(
    id: number,
    request: CritereEvaluationRequest
  ): Observable<CritereEvaluationResponse> {
    return this.http.put<CritereEvaluationResponse>(
      `${this.criteresUrl}/${id}`,
      request
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.criteresUrl}/${id}`
    );
  }

  toggleActif(id: number): Observable<CritereEvaluationResponse> {
    return this.http.patch<CritereEvaluationResponse>(
      `${this.criteresUrl}/${id}/toggle-actif`,
      {}
    );
  }
  deactivate(id: number): Observable<void> {
  return this.http.patch<void>(
    `${this.criteresUrl}/${id}/deactivate`,
    {}
  );
}
}