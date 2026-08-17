import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface CreateCndUserRequest {
  nomComplet: string;
  email: string;
  telephone?: string | null;
  fonction?: string | null;
}

export interface CreateCandidatureAccessRequest {
  nomEntreprise: string;
  typeIntervenantId: number | null;
  lotIds: number[];
  users: CreateCndUserRequest[];
}

export interface UpdateCandidatureLotsRequest {
  lotIds: number[];
}

export interface GeneratedAccountResponse {
  utilisateurId: number;
  nomComplet: string;
  email: string;
  motDePasseTemporaire: string;
}

export interface LotLightResponse {
  id: number;
  codeLot?: string | null;
  nomLot: string;
}

export interface UtilisateurCndResponse {
  id: number;
  nomComplet: string;
  email: string;
  telephone?: string | null;
  fonction?: string | null;
  actif?: boolean | null;
  mustChangePassword?: boolean | null;
}
export interface UpdateCandidatureAccessRequest {
  nomEntreprise: string;
  typeIntervenantId: number | null;
  lotIds: number[];
}

export interface CandidatureAccessResponse {
  candidatureId: number;
  nomEntreprise: string;

  typeIntervenantId: number;
  typeIntervenantCode?: string | null;
  typeIntervenantLibelle?: string | null;

  statut?: string | null;
  profilComplete?: boolean | null;
  actif?: boolean | null;

  // AJOUTER CECI
  accesBloque?: boolean | null;

  lots: LotLightResponse[];
  utilisateurs: UtilisateurCndResponse[];
  comptesGeneres: GeneratedAccountResponse[];
}
export interface CreateCndUserRequest {
  nomComplet: string;
  email: string;
  telephone?: string | null;
  fonction?: string | null;
}

export interface UpdateCndUserRequest {
  nomComplet: string;
  email: string;
  telephone?: string | null;
  fonction?: string | null;
}
@Injectable({
  providedIn: 'root'
})
export class CandidatureAccessService {

  private readonly baseUrl = `${environment.apiBaseUrl}/api/el-emar/candidatures-access`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<CandidatureAccessResponse[]> {
    return this.http.get<CandidatureAccessResponse[]>(this.baseUrl);
  }
updateCandidature(
  candidatureId: number,
  request: UpdateCandidatureAccessRequest
): Observable<CandidatureAccessResponse> {
  return this.http.put<CandidatureAccessResponse>(
    `${this.baseUrl}/${candidatureId}`,
    request
  );
}
deactivateCandidature(
  candidatureId: number
): Observable<CandidatureAccessResponse> {
  return this.http.patch<CandidatureAccessResponse>(
    `${this.baseUrl}/${candidatureId}/deactivate`,
    {}
  );
}

activateCandidature(
  candidatureId: number
): Observable<CandidatureAccessResponse> {
  return this.http.patch<CandidatureAccessResponse>(
    `${this.baseUrl}/${candidatureId}/activate`,
    {}
  );
}
  getById(candidatureId: number): Observable<CandidatureAccessResponse> {
    return this.http.get<CandidatureAccessResponse>(`${this.baseUrl}/${candidatureId}`);
  }

  create(request: CreateCandidatureAccessRequest): Observable<CandidatureAccessResponse> {
    return this.http.post<CandidatureAccessResponse>(this.baseUrl, request);
  }

  updateLots(candidatureId: number, lotIds: number[]): Observable<CandidatureAccessResponse> {
    return this.http.put<CandidatureAccessResponse>(
      `${this.baseUrl}/${candidatureId}/lots`,
      { lotIds }
    );
  }

addUser(
  candidatureId: number,
  request: UpdateCndUserRequest
): Observable<GeneratedAccountResponse> {
  return this.http.post<GeneratedAccountResponse>(
    `${this.baseUrl}/${candidatureId}/users`,
    request
  );
}
activateUser(userId: number): Observable<void> {
  return this.http.patch<void>(
    `${this.baseUrl}/utilisateurs/${userId}/activate`,
    {}
  );
}
deactivateUser(userId: number): Observable<void> {
  return this.http.patch<void>(
    `${this.baseUrl}/utilisateurs/${userId}/deactivate`,
    {}
  );
}

  resetPassword(userId: number): Observable<GeneratedAccountResponse> {
    return this.http.patch<GeneratedAccountResponse>(
      `${this.baseUrl}/utilisateurs/${userId}/reset-password`,
      {}
    );
  }

  deleteCandidature(candidatureId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${candidatureId}`
    );
  }
  updateUser(
  userId: number,
  request: UpdateCndUserRequest
): Observable<UtilisateurCndResponse> {
  return this.http.put<UtilisateurCndResponse>(
    `${this.baseUrl}/users/${userId}`,
    request
  );
}

deleteUser(
  userId: number
): Observable<void> {
  return this.http.delete<void>(
    `${this.baseUrl}/users/${userId}`
  );
}

}