import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

import {
  HistoriqueActionResponse
} from './historique-action.service';

export interface ElEmarCompteResponse {
  id: number;

  nom?: string | null;
  email?: string | null;
  fonction?: string | null;

  typeUtilisateur?: string | null;
  actif?: boolean | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ElEmarCompteUpdateRequest {
  nom: string;
  fonction: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class ElEmarCompteService {

  private readonly apiUrl = `${environment.apiBaseUrl}/api/el-emar/compte`;

  constructor(private http: HttpClient) {}

  getCompte(utilisateurId: number): Observable<ElEmarCompteResponse> {
    return this.http.get<ElEmarCompteResponse>(
      `${this.apiUrl}/${utilisateurId}`
    );
  }

  updateCompte(
    utilisateurId: number,
    request: ElEmarCompteUpdateRequest
  ): Observable<ElEmarCompteResponse> {
    return this.http.put<ElEmarCompteResponse>(
      `${this.apiUrl}/${utilisateurId}`,
      request
    );
  }

  changePassword(
    utilisateurId: number,
    request: ChangePasswordRequest
  ): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/${utilisateurId}/password`,
      request
    );
  }

  getHistorique(utilisateurId: number): Observable<HistoriqueActionResponse[]> {
    return this.http.get<HistoriqueActionResponse[]>(
      `${this.apiUrl}/${utilisateurId}/historique`
    );
  }
}