import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

/* =====================================================
   LOT / DOMAINE
===================================================== */

export interface LotOption {
  id: number;
  codeLot?: string | null;
  nomLot: string;
  description?: string | null;
  actif?: boolean | string | number;
  ordreAffichage?: number | null;

  typeIntervenantId?: number | null;
  typeIntervenantCode?: string | null;
  typeIntervenantLibelle?: string | null;
}

/* =====================================================
   CATÉGORIE CONFIGURABLE EN BASE
===================================================== */

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
   DTO BACKEND ACTUEL
===================================================== */

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

export interface BackendCritereEvaluationRequest {
  grilleEvaluationLotId?: number | null;
  lotId: number | null;

  categorieEvaluationId?: number | null;
  section: string;

  codeCritere?: string | null;
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

/* =====================================================
   DTO COMPATIBLE AVEC TON ANCIENNE PAGE grille-evaluation.ts
===================================================== */

export interface CritereEvaluation {
  id: number;

  lotId: number;
  nomLot: string;
  appelLotId: number | null;

  categorieEvaluation: string;

  categorieEvaluationId?: number | null;
  categorieEvaluationCode?: string | null;
  categorieEvaluationLibelle?: string | null;

  nomCritere: string;
  descriptionCritere: string;

  pointsMax: number;
  conditionBareme: string;
  documentsRequis: string;

  ordreAffichage: number | null;
  actif: boolean;
}

export interface CritereEvaluationRequest {
  lotId: number | null;
  appelLotId?: number | null;

  categorieEvaluation?: string | null;

  categorieEvaluationId?: number | null;
  categorieEvaluationCode?: string | null;
  categorieEvaluationLibelle?: string | null;

  nomCritere?: string | null;
  descriptionCritere?: string | null;

  pointsMax: number | null;
  conditionBareme?: string | null;
  documentsRequis?: string | null;

  ordreAffichage?: number | null;
  actif?: boolean | null;

  // nouveaux champs optionnels
  grilleEvaluationLotId?: number | null;
  section?: string | null;
  codeCritere?: string | null;
  libelleCritere?: string | null;
  labelCandidat?: string | null;
  aideCandidat?: string | null;
  raisonDonnee?: string | null;
  noteCandidat?: string | null;
  noteEvaluateur?: string | null;
  baremeNotation?: string | null;
  typeNotation?: string | null;
  typeChamp?: string | null;
  optionsChamp?: string | null;
  obligatoire?: boolean | null;
  pieces?: CriterePieceRequest[];
}

@Injectable({
  providedIn: 'root'
})
export class CritereEvaluationService {

  private readonly apiUrl = 'http://localhost:8089/api/criteres-evaluation';
  private readonly lotsUrl = 'http://localhost:8089/api/lots';
  private readonly categoriesUrl = 'http://localhost:8089/api/categories-evaluation';

  constructor(private http: HttpClient) {}

  /* =====================================================
     LOTS
  ===================================================== */

  getLots(typeIntervenantId?: number | null): Observable<LotOption[]> {
    let params = new HttpParams();

    if (typeIntervenantId) {
      params = params.set('typeIntervenantId', String(typeIntervenantId));
    }

    return this.http.get<LotOption[]>(this.lotsUrl, { params });
  }

  /* =====================================================
     CATÉGORIES
  ===================================================== */

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

  /* =====================================================
     CRITÈRES
  ===================================================== */

  getAll(): Observable<CritereEvaluation[]> {
    return this.http
      .get<CritereEvaluationResponse[]>(this.apiUrl)
      .pipe(map(items => items.map(item => this.toFrontCritere(item))));
  }

  getById(id: number): Observable<CritereEvaluation> {
    return this.http
      .get<CritereEvaluationResponse>(`${this.apiUrl}/${id}`)
      .pipe(map(item => this.toFrontCritere(item)));
  }

  getByLot(lotId: number): Observable<CritereEvaluation[]> {
    return this.http
      .get<CritereEvaluationResponse[]>(`${this.apiUrl}/lot/${lotId}`)
      .pipe(map(items => items.map(item => this.toFrontCritere(item))));
  }

  getActiveByLot(lotId: number): Observable<CritereEvaluation[]> {
    return this.http
      .get<CritereEvaluationResponse[]>(`${this.apiUrl}/lot/${lotId}/actifs`)
      .pipe(map(items => items.map(item => this.toFrontCritere(item))));
  }

  getTotalByLot(lotId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/lot/${lotId}/total`);
  }

  getResteByLot(lotId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/lot/${lotId}/reste`);
  }

  getPieceNames(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/pieces/noms`);
  }

  create(request: CritereEvaluationRequest): Observable<CritereEvaluation> {
    const backendRequest = this.toBackendRequest(request);

    return this.http
      .post<CritereEvaluationResponse>(this.apiUrl, backendRequest)
      .pipe(map(item => this.toFrontCritere(item)));
  }

  update(
    id: number,
    request: CritereEvaluationRequest
  ): Observable<CritereEvaluation> {
    const backendRequest = this.toBackendRequest(request);

    return this.http
      .put<CritereEvaluationResponse>(`${this.apiUrl}/${id}`, backendRequest)
      .pipe(map(item => this.toFrontCritere(item)));
  }

  deactivate(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  toggleActif(id: number): Observable<CritereEvaluation> {
    return this.http
      .patch<CritereEvaluationResponse>(`${this.apiUrl}/${id}/toggle-actif`, {})
      .pipe(map(item => this.toFrontCritere(item)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /* =====================================================
     MAPPING BACKEND → ANCIEN FRONT
  ===================================================== */

  private toFrontCritere(item: CritereEvaluationResponse): CritereEvaluation {
    return {
      id: item.id,

      lotId: item.lotId,
      nomLot: item.lotNom || '',
      appelLotId: null,

      categorieEvaluation:
        item.categorieEvaluationLibelle ||
        item.section ||
        'Sans catégorie',

      categorieEvaluationId: item.categorieEvaluationId || null,
      categorieEvaluationCode: item.categorieEvaluationCode || null,
      categorieEvaluationLibelle: item.categorieEvaluationLibelle || null,

      nomCritere: item.libelleCritere || '',
      descriptionCritere: item.aideCandidat || '',

      pointsMax: Number(item.pointsMax || 0),
      conditionBareme: item.baremeNotation || '',
      documentsRequis: this.piecesToText(item.pieces || []),

      ordreAffichage: item.ordreAffichage ?? null,
      actif: this.isActive(item.actif)
    };
  }

  /* =====================================================
     MAPPING ANCIEN FRONT → BACKEND
  ===================================================== */

  private toBackendRequest(
    request: CritereEvaluationRequest
  ): BackendCritereEvaluationRequest {
    const nomCritere =
      request.libelleCritere ||
      request.nomCritere ||
      '';

    const categorieLibelle =
      request.categorieEvaluationLibelle ||
      request.categorieEvaluation ||
      request.section ||
      'Sans catégorie';

    return {
      grilleEvaluationLotId: request.grilleEvaluationLotId ?? null,

      lotId: request.lotId ? Number(request.lotId) : null,

      categorieEvaluationId: request.categorieEvaluationId ?? null,

      section: categorieLibelle,

      codeCritere: request.codeCritere || null,

      libelleCritere: nomCritere.trim(),

      labelCandidat:
        request.labelCandidat ||
        nomCritere.trim(),

      aideCandidat:
        request.aideCandidat ||
        request.descriptionCritere ||
        '',

      raisonDonnee: request.raisonDonnee || '',

      noteCandidat: request.noteCandidat || '',

      noteEvaluateur: request.noteEvaluateur || '',

      pointsMax:
        request.pointsMax !== null && request.pointsMax !== undefined
          ? Number(request.pointsMax)
          : 0,

      baremeNotation:
        request.baremeNotation ||
        request.conditionBareme ||
        '',

      typeNotation: request.typeNotation || 'MANUEL',

      typeChamp: request.typeChamp || 'TEXT',

      optionsChamp: request.optionsChamp || '',

      obligatoire: request.obligatoire ?? true,

      ordreAffichage: request.ordreAffichage ?? 0,

      actif: request.actif ?? true,

      pieces:
        request.pieces && request.pieces.length > 0
          ? request.pieces
          : this.documentsTextToPieces(request.documentsRequis || '')
    };
  }

  private piecesToText(pieces: CriterePieceResponse[]): string {
    return pieces
      .map(piece => piece.nomPiece || piece.codePiece || '')
      .filter(value => value.trim().length > 0)
      .join(', ');
  }

  private documentsTextToPieces(value: string): CriterePieceRequest[] {
    if (!value || value.trim() === '') {
      return [];
    }

    return value
      .split(',')
      .map((name, index) => name.trim())
      .filter(name => name.length > 0)
      .map((name, index) => ({
        codePiece: this.generatePieceCode(name),
        nomPiece: name,
        obligatoire: true,
        ordreAffichage: index + 1,
        actif: true,
        formatAccepte: 'PDF'
      }));
  }

  private generatePieceCode(value: string): string {
    return value
      .trim()
      .toUpperCase()
      .replaceAll('É', 'E')
      .replaceAll('È', 'E')
      .replaceAll('Ê', 'E')
      .replaceAll('À', 'A')
      .replaceAll('Â', 'A')
      .replaceAll('Ç', 'C')
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30) || 'PIECE';
  }

  private isActive(value: any): boolean {
    return value === true ||
      value === 'true' ||
      value === 1 ||
      value === '1';
  }
}