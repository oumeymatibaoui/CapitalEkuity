import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, switchMap, map } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface LotOption {
  id: number;
  nomLot: string;
  codeLot?: string;
  description?: string;
  actif?: boolean;

  nom?: string;
  libelle?: string;
  name?: string;
  code?: string;
}

export interface ApplicationCandidatureResponse {
  id: number;

  lotId?: number;
  idLot?: number;
  nomLot?: string;
  lotNom?: string;

  lot?: {
    id: number;
    nomLot?: string;
    nom?: string;
    codeLot?: string;
  };

  statut: string;
}

export interface CandidatureInfoRequest {
  raisonSociale: string;
  formeJuridique: string;
  rneMatriculeFiscal: string;
  dateCreationBureau: string | null;

  adresseSiege: string;
  telephone: string;
  emailPrincipal: string;
  siteInternet: string;
  ville: string;

  representantLegal: string;
  fonctionRepresentant: string;

  specialites: string;
  agrementsCertifications: string;

  banquePrincipale: string;
  localisation: string;
}

export interface CandidatureResponse {
  id: number;

  utilisateurId: number;
  appelCandidatureId?: number | null;
  creeParUtilisateurId?: number | null;

  statut: string;
  accesBloque: boolean;
  dateSoumission?: string | null;

  raisonSociale: string;
  formeJuridique: string;
  rneMatriculeFiscal: string;
  dateCreationBureau: string | null;

  adresseSiege: string;
  telephone: string;
  emailPrincipal: string;
  siteInternet: string;
  ville: string;

  representantLegal: string;
  fonctionRepresentant: string;

  specialites: string;
  agrementsCertifications: string;

  banquePrincipale: string;
  localisation: string;

  rneNomFichier?: string | null;
  rneCheminFichier?: string | null;
  rneTypeContenu?: string | null;
  rneTailleFichier?: number | null;
  rneStatut?: string | null;

  cnssNomFichier?: string | null;
  cnssCheminFichier?: string | null;
  cnssTypeContenu?: string | null;
  cnssTailleFichier?: number | null;
  cnssStatut?: string | null;

  applications?: ApplicationCandidatureResponse[];

  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CndCandidatureService {

  private readonly candidatureApiUrl = `${environment.apiBaseUrl}/api/cnd/candidatures`;
  private readonly lotApiUrl = `${environment.apiBaseUrl}/api/lots`;

  constructor(private http: HttpClient) {}

  getLots(): Observable<LotOption[]> {
    return this.http.get<LotOption[]>(this.lotApiUrl);
  }

  getCurrent(utilisateurId: number): Observable<CandidatureResponse> {
    return this.http.get<CandidatureResponse>(
      `${this.candidatureApiUrl}/current/${utilisateurId}`
    );
  }

  updateInformationsSociete(
    utilisateurId: number,
    request: CandidatureInfoRequest
  ): Observable<CandidatureResponse> {
    return this.http.put<CandidatureResponse>(
      `${this.candidatureApiUrl}/${utilisateurId}/societe`,
      request
    );
  }

  uploadRne(candidatureId: number, file: File): Observable<CandidatureResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<CandidatureResponse>(
      `${this.candidatureApiUrl}/${candidatureId}/piece-rne`,
      formData
    );
  }

  uploadCnss(candidatureId: number, file: File): Observable<CandidatureResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<CandidatureResponse>(
      `${this.candidatureApiUrl}/${candidatureId}/piece-cnss`,
      formData
    );
  }

  uploadPiecesSociete(
    candidatureId: number,
    rneFile: File | null,
    cnssFile: File | null
  ): Observable<CandidatureResponse[]> {

    if (!rneFile && !cnssFile) {
      return of([]);
    }

    if (rneFile && cnssFile) {
      return this.uploadRne(candidatureId, rneFile).pipe(
        switchMap((rneResponse: CandidatureResponse) =>
          this.uploadCnss(candidatureId, cnssFile).pipe(
            map((cnssResponse: CandidatureResponse) => [
              rneResponse,
              cnssResponse
            ])
          )
        )
      );
    }

    if (rneFile) {
      return this.uploadRne(candidatureId, rneFile).pipe(
        map((response: CandidatureResponse) => [response])
      );
    }

    return this.uploadCnss(candidatureId, cnssFile as File).pipe(
      map((response: CandidatureResponse) => [response])
    );
  }

  applyToLot(
    utilisateurId: number,
    lotId: number
  ): Observable<ApplicationCandidatureResponse> {
    return this.http.post<ApplicationCandidatureResponse>(
      `${this.candidatureApiUrl}/${utilisateurId}/lots/${lotId}`,
      {}
    );
  }

  removeLot(
    utilisateurId: number,
    lotId: number
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.candidatureApiUrl}/${utilisateurId}/lots/${lotId}`
    );
  }

  submit(candidatureId: number): Observable<CandidatureResponse> {
    return this.http.post<CandidatureResponse>(
      `${this.candidatureApiUrl}/${candidatureId}/submit`,
      {}
    );
  }

  getLotsAutorises(candidatureId: number): Observable<LotOption[]> {
    return this.http.get<LotOption[]>(
      `${this.candidatureApiUrl}/${candidatureId}/lots-autorises`
    );
  }

  deleteRne(candidatureId: number): Observable<CandidatureResponse> {
    return this.http.delete<CandidatureResponse>(
      `${this.candidatureApiUrl}/${candidatureId}/piece-rne`
    );
  }

  deleteCnss(candidatureId: number): Observable<CandidatureResponse> {
    return this.http.delete<CandidatureResponse>(
      `${this.candidatureApiUrl}/${candidatureId}/piece-cnss`
    );
  }
}