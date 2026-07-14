import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  HistoriqueActionResponse
} from './historique-action.service';

export interface CompteUtilisateurResponse {
  id: number;

  nom?: string | null;
  email?: string | null;
  fonction?: string | null;

  typeUtilisateur?: string | null;
  actif?: boolean | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CompteUtilisateurUpdateRequest {
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
export class CompteUtilisateurService {

  /*
   IMPORTANT :
   Ton backend actuel /api/el-emar/compte lit la table utilisateur.
   Donc il peut marcher pour EL_EMAR et CND si tu ne bloques pas par type.
   Plus tard, tu peux renommer backend vers /api/compte.
  */
  private readonly apiUrl = 'http://localhost:8089/api/el-emar/compte';

  constructor(private http: HttpClient) {}

  getCompte(utilisateurId: number): Observable<CompteUtilisateurResponse> {
    return this.http.get<CompteUtilisateurResponse>(
      `${this.apiUrl}/${utilisateurId}`
    );
  }

  updateCompte(
    utilisateurId: number,
    request: CompteUtilisateurUpdateRequest
  ): Observable<CompteUtilisateurResponse> {
    return this.http.put<CompteUtilisateurResponse>(
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