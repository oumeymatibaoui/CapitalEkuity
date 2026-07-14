import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TypeUtilisateur =
  | 'IT'
  | 'ADMIN'
  | 'EL_EMAR'
  | 'DA';

export interface UtilisateurAdminResponse {
  id: number;
  nom?: string | null;
  email?: string | null;
  fonction?: string | null;
  typeUtilisateur?: TypeUtilisateur | string | null;
  actif?: boolean | null;
  premiereConnexion?: boolean | null;
  mustChangePassword?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateUtilisateurRequest {
  nom: string;
  email: string;
  fonction: string;
  typeUtilisateur: TypeUtilisateur;
  motDePasse: string;
  createurId?: number | null;
}

export interface UpdateUtilisateurRoleRequest {
  typeUtilisateur: TypeUtilisateur;
}

@Injectable({
  providedIn: 'root'
})
export class UtilisateurAdminService {

  private readonly apiUrl = 'http://localhost:8089/api/el-emar/utilisateurs';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<UtilisateurAdminResponse[]> {
    return this.http.get<UtilisateurAdminResponse[]>(this.apiUrl);
  }

  createUser(request: CreateUtilisateurRequest): Observable<UtilisateurAdminResponse> {
    return this.http.post<UtilisateurAdminResponse>(this.apiUrl, request);
  }

  updateRole(
    utilisateurId: number,
    request: UpdateUtilisateurRoleRequest
  ): Observable<UtilisateurAdminResponse> {
    return this.http.patch<UtilisateurAdminResponse>(
      `${this.apiUrl}/${utilisateurId}/role`,
      request
    );
  }

  toggleActif(utilisateurId: number): Observable<UtilisateurAdminResponse> {
    return this.http.patch<UtilisateurAdminResponse>(
      `${this.apiUrl}/${utilisateurId}/toggle-actif`,
      {}
    );
  }
}