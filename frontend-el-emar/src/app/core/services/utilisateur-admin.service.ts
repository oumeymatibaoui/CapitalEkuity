import { Injectable } from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

// =====================================================
// UTILISATEUR
// =====================================================

export interface UtilisateurAdminResponse {
  id: number;

  nom?: string | null;
  email?: string | null;
  fonction?: string | null;

  typeUtilisateur?: string | null;

  roleId?: number | null;
  roleCode?: string | null;
  roleNom?: string | null;

  actif?: boolean | null;
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
  fonction: string;
  motDePasse: string;
  roleId: number;
  createurId: number | null;
}

// =====================================================
// MODIFICATION DU RÔLE
// =====================================================

export interface UpdateUtilisateurRoleRequest {
  roleId: number;
  modificateurId: number | null;
}

// =====================================================
// MODIFICATION COMPLÈTE
// =====================================================

export interface UpdateUtilisateurAdminRequest {
  nom: string;
  email: string;
  fonction: string;
  roleId: number;
  actif: boolean;
  modificateurId: number | null;
}

// =====================================================
// SERVICE
// =====================================================

@Injectable({
  providedIn: 'root'
})
export class UtilisateurAdminService {

  /*
   * Cette URL doit correspondre exactement à :
   *
   * @RequestMapping("/api/el-emar/utilisateurs")
   */
  private readonly apiUrl =
    'http://localhost:8089/api/el-emar/utilisateurs';

  constructor(
    private http: HttpClient
  ) {}

  // ===================================================
  // TEST
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

  getAllUsers(): Observable<UtilisateurAdminResponse[]> {
    return this.http.get<UtilisateurAdminResponse[]>(
      this.apiUrl
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
  // SUPPRESSION
  // DELETE /api/el-emar/utilisateurs/{id}
  // ===================================================

  deleteUser(
    utilisateurId: number,
    demandeurId: number | null
  ): Observable<void> {
    let params = new HttpParams();

    if (
      demandeurId !== null &&
      demandeurId !== undefined
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