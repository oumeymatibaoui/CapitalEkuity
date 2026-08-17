import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface ReponseCritereSaveRequest {
  critereId: number;
  valeur: string;
}

export interface FormulaireLotSaveRequest {
  reponses: ReponseCritereSaveRequest[];
}

export interface ReponseCritereSavedResponse {
  critereId: number;
  valeur: string;
}

export interface PieceCritereDeposeeResponse {
  criterePieceId: number;
  nomFichier: string;
  statut: string;
}

export interface FormulaireLotSavedResponse {
  candidatureId: number;
  applicationCandidatureId: number | null;
  lotId: number;
  reponses: ReponseCritereSavedResponse[];
  pieces: PieceCritereDeposeeResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class CndFormulaireSauvegardeService {

  private apiUrl = `${environment.apiBaseUrl}/api/cnd/formulaire-candidature`;

  constructor(private http: HttpClient) {}

  saveReponses(
    candidatureId: number,
    lotId: number,
    request: FormulaireLotSaveRequest
  ): Observable<FormulaireLotSavedResponse> {
    return this.http.put<FormulaireLotSavedResponse>(
      `${this.apiUrl}/${candidatureId}/lots/${lotId}/reponses`,
      request
    );
  }

  uploadPiece(
    candidatureId: number,
    lotId: number,
    criterePieceId: number,
    file: File
  ): Observable<PieceCritereDeposeeResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<PieceCritereDeposeeResponse>(
      `${this.apiUrl}/${candidatureId}/lots/${lotId}/pieces/${criterePieceId}`,
      formData
    );
  }

  getSavedFormulaire(
    candidatureId: number,
    lotId: number
  ): Observable<FormulaireLotSavedResponse> {
    return this.http.get<FormulaireLotSavedResponse>(
      `${this.apiUrl}/${candidatureId}/lots/${lotId}`
    );
  }

  getLotsRemplis(candidatureId: number): Observable<number[]> {
    return this.http.get<number[]>(
      `${this.apiUrl}/${candidatureId}/lots-remplis`
    );
  }
  deletePiece(
  candidatureId: number,
  lotId: number,
  criterePieceId: number
): Observable<void> {
  return this.http.delete<void>(
    `${this.apiUrl}/${candidatureId}/lots/${lotId}/pieces/${criterePieceId}`
  );
}
}