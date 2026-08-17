import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

import { Observable } from 'rxjs';

// =====================================================
// TYPES UTILISATEUR
// =====================================================

export type TypeUtilisateur =
  | 'IT'
  | 'ACHAT'
  | 'COMITE'
  | 'TECHNIQUE'
  | 'CND';

/**
 * Types autorisés pour les utilisateurs créés
 * depuis l’administration interne.
 */
export type TypeUtilisateurInterne =
  Exclude<TypeUtilisateur, 'CND'>;

// =====================================================
// RÉPONSE UTILISATEUR
// =====================================================

export interface UtilisateurAdminResponse {
  id: number;

  nom: string;
  email: string;
  fonction?: string | null;

  typeUtilisateur: TypeUtilisateur;

  roleId?: number | null;
  roleCode?: string | null;
  roleNom?: string | null;

  actif: boolean;

  premiereConnexion?: boolean | null;
  mustChangePassword?: boolean | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

// =====================================================
// CRÉATION
// =====================================================

export interface CreateUtilisateurRequest {
  nom: string;
  email: string;
  fonction?: string;

  motDePasse: string;

  /**
   * Département :
   * IT, ACHAT, COMITE ou TECHNIQUE.
   */
  typeUtilisateur: TypeUtilisateurInterne;

  /**
   * Identifiant du rôle dynamique.
   */
  roleId: number;

  createurId?: number | null;
}

// =====================================================
// MODIFICATION COMPLÈTE
// =====================================================

export interface UpdateUtilisateurAdminRequest {
  nom: string;
  email: string;
  fonction?: string;

  typeUtilisateur: TypeUtilisateurInterne;
  roleId: number;
  actif: boolean;

  modificateurId?: number | null;
}

// =====================================================
// MODIFICATION DU RÔLE ET DU DÉPARTEMENT
// =====================================================

export interface UpdateUtilisateurRoleRequest {
  roleId: number;

  /**
   * Facultatif.
   * Lorsque la valeur n’est pas envoyée,
   * le backend conserve le département actuel.
   */
  typeUtilisateur?: TypeUtilisateurInterne;

  modificateurId?: number | null;
}

// =====================================================
// SERVICE
// =====================================================

@Injectable({
  providedIn: 'root'
})
export class UtilisateurAdminService {

  /**
   * Backend :
   * @RequestMapping("/api/el-emar/utilisateurs")
   */
  private readonly apiUrl =
    `${environment.apiBaseUrl}/api/el-emar/utilisateurs`;

  constructor(
    private readonly http: HttpClient
  ) {}

  // ===================================================
  // TEST
  // GET /api/el-emar/utilisateurs/test
  // ===================================================

  test(): Observable<string> {
    return this.http.get(
      `${this.apiUrl}/test`,
      {
        responseType: 'text'
      }
    );
  }

  // ===================================================
  // LISTE
  // GET /api/el-emar/utilisateurs
  // ===================================================

  getAllUsers():
    Observable<UtilisateurAdminResponse[]> {
    return this.http.get<UtilisateurAdminResponse[]>(
      this.apiUrl
    );
  }

  // ===================================================
  // DÉTAIL
  // GET /api/el-emar/utilisateurs/{id}
  // ===================================================

  getUserById(
    utilisateurId: number
  ): Observable<UtilisateurAdminResponse> {
    return this.http.get<UtilisateurAdminResponse>(
      `${this.apiUrl}/${utilisateurId}`
    );
  }

  // ===================================================
  // CRÉATION
  // POST /api/el-emar/utilisateurs
  // ===================================================

  createUser(
    request: CreateUtilisateurRequest
  ): Observable<UtilisateurAdminResponse> {
    return this.http.post<UtilisateurAdminResponse>(
      this.apiUrl,
      request
    );
  }

  // ===================================================
  // MODIFICATION COMPLÈTE
  // PUT /api/el-emar/utilisateurs/{id}
  // ===================================================

  updateUser(
    utilisateurId: number,
    request: UpdateUtilisateurAdminRequest
  ): Observable<UtilisateurAdminResponse> {
    return this.http.put<UtilisateurAdminResponse>(
      `${this.apiUrl}/${utilisateurId}`,
      request
    );
  }

  // ===================================================
  // MODIFICATION DU RÔLE
  // PATCH /api/el-emar/utilisateurs/{id}/role
  // ===================================================

  updateRole(
    utilisateurId: number,
    request: UpdateUtilisateurRoleRequest
  ): Observable<UtilisateurAdminResponse> {
    return this.http.patch<UtilisateurAdminResponse>(
      `${this.apiUrl}/${utilisateurId}/role`,
      request
    );
  }

  // ===================================================
  // ACTIVER / DÉSACTIVER
  // PATCH /api/el-emar/utilisateurs/{id}/toggle-actif
  // ===================================================

  toggleActif(
    utilisateurId: number
  ): Observable<UtilisateurAdminResponse> {
    return this.http.patch<UtilisateurAdminResponse>(
      `${this.apiUrl}/${utilisateurId}/toggle-actif`,
      {}
    );
  }

  // ===================================================
  // SUPPRESSION
  // DELETE /api/el-emar/utilisateurs/{id}
  // ===================================================

  deleteUser(
    utilisateurId: number,
    demandeurId?: number | null
  ): Observable<void> {
    let params = new HttpParams();

    if (
      demandeurId !== null
      && demandeurId !== undefined
    ) {
      params = params.set(
        'demandeurId',
        String(demandeurId)
      );
    }

    return this.http.delete<void>(
      `${this.apiUrl}/${utilisateurId}`,
      {
        params
      }
    );
  }
}