import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type StatutRfp = 'BROUILLON' | 'PUBLIE' | 'CLOTURE';

export interface AppelCandidature {
  id?: number;
  reference?: string;

  titre: string;
  description?: string;

  dateDebut?: string;
  dateLimite?: string;

  statut: StatutRfp;

  seuilAdmission: number;

  objectif?: string;
  emailDepot?: string;

  utilisateurId?: number;
  utilisateurNom?: string;

  lotIds: number[];
  lotNames?: string[];

  zoneIds: number[];
  zoneNames?: string[];

  candidaturesCount?: number;

  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppelCandidatureService {

  private apiUrl = 'http://localhost:8089/api/appels';

  constructor(private http: HttpClient) {}

  getAll(): Observable<AppelCandidature[]> {
    return this.http.get<AppelCandidature[]>(this.apiUrl);
  }

  create(appel: AppelCandidature): Observable<AppelCandidature> {
    return this.http.post<AppelCandidature>(this.apiUrl, appel);
  }

  update(id: number, appel: AppelCandidature): Observable<AppelCandidature> {
    return this.http.put<AppelCandidature>(`${this.apiUrl}/${id}`, appel);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}