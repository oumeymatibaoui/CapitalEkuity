import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

export type StatutEvaluation = 'A_VERIFIER' | 'CONFORME' | 'NON_CONFORME';
export type DecisionFinale = 'ADMIS' | 'REJETE';
export type SolvabiliteStatut = 'A_VERIFIER' | 'SOLVABLE' | 'NON_SOLVABLE';

/* =========================================================
   DÉCISION FINALE PAR LOT
   Backend attend :
   {
     decisionFinale: 'ADMIS' | 'REJETE',
     observationFinale: string | null,
     evaluateurId: number | null
   }
========================================================= */
export interface SaveDocumentsStatutRequest {
  rneStatut: StatutEvaluation;
  cnssStatut: StatutEvaluation;
  evaluateurId?: number | null;
}

export interface SaveDocumentsStatutResponse {
  candidatureId: number;
  rneStatut: StatutEvaluation;
  cnssStatut: StatutEvaluation;
  dossierRecevable: boolean;
  motifNonRecevable?: string | null;
}
export interface SaveDecisionFinaleRequest {
  decisionFinale: DecisionFinale;
  observationFinale?: string | null;
  evaluateurId?: number | null;
}
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
export interface LotNoteItem {
  applicationCandidatureId: number;
  lotId: number;
  nomLot: string;
  noteLot: number;
  statutLot?: string | null;
  decisionFinale?: string | null;
}
export interface SaveDecisionFinaleResponse {
  candidatureId: number;
  applicationCandidatureId: number;

  decisionFinale: DecisionFinale;
  observationFinale?: string | null;

  noteLot?: number | null;
  noteGlobale: number;

  statutLot?: string | null;
}

/*
  Cette interface est gardée parce que ton composant actuel envoie :
  {
    decision,
    observation,
    evaluateurId
  }

  Le service va convertir automatiquement vers le format backend :
  {
    decisionFinale,
    observationFinale,
    evaluateurId
  }
*/
export interface DecisionFinaleLotRequest {
  decision: DecisionFinale;
  observation: string | null;
  evaluateurId: number | null;
}

/* =========================================================
   SOLVABILITÉ PRIVÉE EL EMAR
========================================================= */

export interface SaveSolvabiliteRequest {
  statut: SolvabiliteStatut;
  commentaire?: string | null;
  evaluateurId?: number | null;
}

export interface SaveSolvabiliteResponse {
  candidatureId: number;
  statut: SolvabiliteStatut;
  commentaire?: string | null;
  evaluateurId?: number | null;
  dateValidation?: string | null;
}

/* =========================================================
   LISTE CANDIDATURES
========================================================= */

export interface ElEmarCandidatureListItem {
  candidatureId: number;
  raisonSociale: string;
  emailPrincipal?: string | null;
  telephone?: string | null;
  ville?: string | null;
  statut?: string | null;
  dateSoumission?: string | null;
  noteGlobale?: number | null;

  typeIntervenantId?: number | null;
  typeIntervenantCode?: string | null;
  typeIntervenantLibelle?: string | null;

  lots?: string[];
  lotsNotes?: LotNoteItem[];
}

/* =========================================================
   PIÈCES
========================================================= */

export interface ElEmarPieceEvaluation {
  pieceDeposeeId?: number | null;
  criterePieceId?: number | null;
  codePiece?: string | null;
  nomPiece: string;
  nomFichier?: string | null;
  typeContenu?: string | null;
  deposee: boolean;
  pdfUrl?: string | null;
}

/* =========================================================
   RÉFÉRENCES PROJETS
========================================================= */

export interface ElEmarReferenceProjet {
  id: number;

  nomProjet?: string | null;
  maitreOuvrage?: string | null;
  ville?: string | null;

  zone?: string | number | null;

  zoneElEmarId?: number | null;
  zoneElEmarNom?: string | null;
  zoneElEmarCommentaire?: string | null;
  zoneValidee?: boolean | null;

  adresseProjet?: string | null;
  typeProjet?: string | null;
  surfaceM2?: number | null;
  niveauxRPlus?: string | number | null;
  nombreSousSols?: number | null;
  anneeLivraison?: number | null;
  bimOuiNon?: boolean | null;
  seuilOk?: boolean | null;
  missionRealisee?: string | null;
  montant?: number | null;

  fichierP11Nom?: string | null;
  fichierP11Url?: string | null;
  fichierP12Nom?: string | null;
  fichierP12Url?: string | null;
}

/* =========================================================
   CRITÈRES
========================================================= */

export interface ElEmarCritereEvaluation {
  reponseCritereId: number;
  critereEvaluationId: number;

  codeCritere?: string | null;
  section?: string | null;
  libelle: string;
  aideCandidat?: string | null;
  noteEvaluateur?: string | null;
  typeChamp?: string | null;
  reponse?: string | null;

  noteMax: number;
  statutEvaluation: StatutEvaluation;
  conforme: boolean;
  noteObtenue: number;
  commentaireEvaluateur?: string | null;

  pieces: ElEmarPieceEvaluation[];
}

/* =========================================================
   LOT / APPLICATION CANDIDATURE
========================================================= */

export interface ElEmarLotEvaluation {
  applicationCandidatureId: number;
  lotId?: number | null;
  nomLot: string;

  statut?: string | null;
  dateSoumission?: string | null;

  noteLot: number;

  decisionFinale?: DecisionFinale | string | null;
  observationFinale?: string | null;

  criteres: ElEmarCritereEvaluation[];
  references: ElEmarReferenceProjet[];
}

/* =========================================================
   DÉTAIL CANDIDATURE
========================================================= */

export interface ElEmarCandidatureDetail {
  candidatureId: number;

  raisonSociale?: string | null;
  formeJuridique?: string | null;
  rneMatriculeFiscal?: string | null;
  dateCreationBureau?: string | null;
  adresseSiege?: string | null;
  telephone?: string | null;
  emailPrincipal?: string | null;
  siteInternet?: string | null;
  ville?: string | null;
  representantLegal?: string | null;
  fonctionRepresentant?: string | null;
  specialites?: string | null;
  agrementsCertifications?: string | null;
  banquePrincipale?: string | null;
  localisation?: string | null;

  solvabiliteStatut?: SolvabiliteStatut | null;
  solvabiliteCommentaire?: string | null;
  solvabiliteEvaluateurId?: number | null;
  solvabiliteDateValidation?: string | null;

  statut?: string | null;
  dateSoumission?: string | null;

  rneNomFichier?: string | null;
  rnePdfUrl?: string | null;
  rneStatut?: StatutEvaluation | null;

  cnssNomFichier?: string | null;
  cnssPdfUrl?: string | null;
  cnssStatut?: StatutEvaluation | null;

  dossierRecevable?: boolean | null;
  motifNonRecevable?: string | null;

  noteGlobale: number;
  lots: ElEmarLotEvaluation[];
}

/* =========================================================
   ÉVALUATION CRITÈRE
========================================================= */

export interface SaveEvaluationRequest {
  statut: StatutEvaluation;
  commentaireEvaluateur?: string | null;
  evaluateurId?: number | null;
}

export interface SaveEvaluationResponse {
  reponseCritereId: number;
  applicationCandidatureId: number;
  statutEvaluation: StatutEvaluation;
  conforme: boolean;
  noteObtenue: number;
  noteLot: number;
  noteGlobale: number;
  commentaireEvaluateur?: string | null;
}

/* =========================================================
   CLASSEMENT ZONE
========================================================= */

export interface SaveReferenceZoneRequest {
  referenceProjetId: number;
  applicationCandidatureId: number;
  zoneId: number;
  commentaire?: string | null;
}

export interface ClassementZoneResponse {
  id: number;
  applicationCandidatureId: number;
  zoneId: number;
  nomZone: string;
  categorie: string;
  commentaire: string | null;
  actif: boolean;
  createdAt: string;
}

export interface ClassementParZoneReference {
  referenceProjetId: number;
  candidatureId: number;
  applicationCandidatureId: number;

  raisonSociale?: string | null;
  nomLot?: string | null;

  nomProjet?: string | null;
  maitreOuvrage?: string | null;
  ville?: string | null;
  montant?: number | null;

  categorieClassement?: string | null;
  commentaireZone?: string | null;
}

export interface ClassementParZoneGroup {
  zoneId: number;
  nomZone: string;
  references: ClassementParZoneReference[];
}

@Injectable({
  providedIn: 'root'
})
export class ElEmarEvaluationService {
  private readonly apiUrl = 'http://localhost:8089/api/el-emar/evaluations';
  private readonly backendBaseUrl = 'http://localhost:8089';
  constructor(private http: HttpClient) {}

  getCandidatures(typeIntervenantId?: number | null): Observable<ElEmarCandidatureListItem[]> {
    let params = new HttpParams();

    if (typeIntervenantId) {
      params = params.set('typeIntervenantId', String(typeIntervenantId));
    }

    return this.http.get<ElEmarCandidatureListItem[]>(
      `${this.apiUrl}/candidatures`,
      { params }
    );
  }

  getCandidatureDetail(candidatureId: number): Observable<ElEmarCandidatureDetail> {
    return this.http.get<ElEmarCandidatureDetail>(
      `${this.apiUrl}/candidatures/${candidatureId}`
    );
  }

  saveSolvabilite(
    candidatureId: number,
    request: SaveSolvabiliteRequest
  ): Observable<SaveSolvabiliteResponse> {
    return this.http.put<SaveSolvabiliteResponse>(
      `${this.apiUrl}/candidatures/${candidatureId}/solvabilite`,
      request
    );
  }

  saveCritereEvaluation(
    applicationCandidatureId: number,
    reponseCritereId: number,
    request: SaveEvaluationRequest
  ): Observable<SaveEvaluationResponse> {
    let params = new HttpParams();

    if (request.evaluateurId !== null && request.evaluateurId !== undefined) {
      params = params.set('evaluateurId', String(request.evaluateurId));
    }

    return this.http.put<SaveEvaluationResponse>(
      `${this.apiUrl}/applications/${applicationCandidatureId}/reponses/${reponseCritereId}`,
      request,
      { params }
    );
  }

  /*
    IMPORTANT :
    Backend = PUT
    Ancien front = POST
    Donc l'erreur "POST is not supported" est corrigée ici.
  */
  saveDecisionFinaleLot(
    applicationCandidatureId: number,
    request: DecisionFinaleLotRequest
  ): Observable<SaveDecisionFinaleResponse> {
    const body: SaveDecisionFinaleRequest = {
      decisionFinale: request.decision,
      observationFinale: request.observation,
      evaluateurId: request.evaluateurId
    };

    let params = new HttpParams();

    if (body.evaluateurId !== null && body.evaluateurId !== undefined) {
      params = params.set('evaluateurId', String(body.evaluateurId));
    }

    return this.http.put<SaveDecisionFinaleResponse>(
      `${this.apiUrl}/applications/${applicationCandidatureId}/decision-finale`,
      body,
      { params }
    );
  }

  validerZoneReference(
    request: SaveReferenceZoneRequest
  ): Observable<ClassementZoneResponse> {
    return this.http.post<ClassementZoneResponse>(
      `${this.apiUrl}/zones/valider-reference`,
      request
    );
  }
saveDocumentsStatut(
  candidatureId: number,
  request: SaveDocumentsStatutRequest
): Observable<SaveDocumentsStatutResponse> {
  return this.http.put<SaveDocumentsStatutResponse>(
    `${this.apiUrl}/candidatures/${candidatureId}/documents-statut`,
    request
  );
}
  getClassementParZone(): Observable<ClassementParZoneGroup[]> {
    return this.http.get<ClassementParZoneGroup[]>(
      `${this.apiUrl}/zones/classement-par-zone`
    );
  }

  buildFullFileUrl(url: string): string {
    if (!url) return '';

    const cleanUrl = url.trim();

    if (cleanUrl.startsWith('http://localhost/')) {
      return cleanUrl.replace('http://localhost/', `${this.backendBaseUrl}/`);
    }

    if (cleanUrl.startsWith('http://127.0.0.1/')) {
      return cleanUrl.replace('http://127.0.0.1/', `${this.backendBaseUrl}/`);
    }

    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl;
    }

    if (cleanUrl.startsWith('/')) {
      return `${this.backendBaseUrl}${cleanUrl}`;
    }

    return `${this.backendBaseUrl}/${cleanUrl}`;
  }
  getClassementCandidatsParLot(
    minNote = 80,
    admisOnly = false
  ): Observable<CandidatLotClassement[]> {
    const params = new HttpParams()
      .set('minNote', String(minNote))
      .set('admisOnly', String(admisOnly));

    return this.http.get<CandidatLotClassement[]>(
      `${this.apiUrl}/classement-candidats-par-lot`,
      { params }
    );
  }
  getPdfBlob(url: string): Observable<Blob> {
    const fullUrl = this.buildFullFileUrl(url);

    return this.http.get(fullUrl, {
      responseType: 'blob'
    });
  }
}