import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface HistoriqueActionResponse {
  id: number;

  utilisateurId?: number | null;
  utilisateurNom?: string | null;
  utilisateurEmail?: string | null;
  typeUtilisateur?: string | null;

  candidatureId?: number | null;
  raisonSociale?: string | null;
  emailCandidature?: string | null;

  applicationCandidatureId?: number | null;
  lotId?: number | null;
  lotNom?: string | null;

  action: string;
  description?: string | null;
  dateAction?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class HistoriqueActionService {

  private readonly apiUrl = `${environment.apiBaseUrl}/api/historique-actions`;

  constructor(private http: HttpClient) {}

  getHistoriqueByUtilisateur(utilisateurId: number): Observable<HistoriqueActionResponse[]> {
    return this.http.get<HistoriqueActionResponse[]>(
      `${this.apiUrl}/utilisateur/${utilisateurId}`
    );
  }

  getHistoriqueByCandidature(candidatureId: number): Observable<HistoriqueActionResponse[]> {
    return this.http.get<HistoriqueActionResponse[]>(
      `${this.apiUrl}/candidature/${candidatureId}`
    );
  }

  getAllHistorique(): Observable<HistoriqueActionResponse[]> {
    return this.http.get<HistoriqueActionResponse[]>(
      this.apiUrl
    );
  }
}