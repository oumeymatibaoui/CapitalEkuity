import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';

import {
  HistoriqueActionResponse
} from './historique-action.service';

export interface CompteUtilisateurResponse {
  id?: number | null;
  nom?: string | null;
  email?: string | null;
  fonction?: string | null;
  typeUtilisateur?: string | null;
  actif?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UpdateCompteUtilisateurRequest {
  nom: string;
  fonction?: string | null;
}

export interface ChangePasswordCompteRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompteUtilisateurService {

  private readonly apiUrl =
    `${environment.apiBaseUrl}/api/el-emar/compte`;

  constructor(
    private readonly http: HttpClient
  ) {}

  // =====================================================
  // MON COMPTE
  //
  // Aucun ID dans l'URL.
  // Le backend retrouve l'utilisateur via le JWT.
  // =====================================================

  getCompte():
    Observable<CompteUtilisateurResponse> {

    return this.http.get<
      CompteUtilisateurResponse
    >(
      `${this.apiUrl}/me`
    );
  }

  // =====================================================
  // MODIFIER MON COMPTE
  // =====================================================

  updateCompte(
    request: UpdateCompteUtilisateurRequest
  ): Observable<CompteUtilisateurResponse> {

    return this.http.put<
      CompteUtilisateurResponse
    >(
      `${this.apiUrl}/me`,
      request
    );
  }

  // =====================================================
  // CHANGER MOT DE PASSE
  // =====================================================

  changePassword(
    request: ChangePasswordCompteRequest
  ): Observable<void> {

    return this.http.put<void>(
      `${this.apiUrl}/me/password`,
      request
    );
  }

  // =====================================================
  // MON HISTORIQUE
  // =====================================================

  getHistorique():
    Observable<HistoriqueActionResponse[]> {

    return this.http.get<
      HistoriqueActionResponse[]
    >(
      `${this.apiUrl}/me/historique`
    );
  }
}
