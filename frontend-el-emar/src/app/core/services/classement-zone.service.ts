import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SaveReferenceZoneRequest {
  referenceProjetId: number;
  applicationCandidatureId: number;
  zoneId: number;
  commentaire?: string | null;
}

export interface ClassementZoneResponse {
  id: number;
  applicationCandidatureId: number;

  zoneId: number;
  nomZone: string;

  categorie: string;
  commentaire: string;

  actif: boolean;
  createdAt: string;

  // Champs additionnels utilisés dans l'écran de classification
  nomEntreprise?: string | null;
  raisonSociale?: string | null;

  lotId?: number | null;
  lotNom?: string | null;

  typeProjet?: string | null;

  typeIntervenantId?: number | null;
  typeIntervenantCode?: string | null;
  typeIntervenantLibelle?: string | null;

  noteTechnique?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ClassementZoneService {

  private readonly apiUrl = 'http://localhost:8089/api/el-emar/evaluations/zones';

  constructor(private http: HttpClient) {}

  validerReferenceZone(
    request: SaveReferenceZoneRequest
  ): Observable<ClassementZoneResponse> {
    return this.http.post<ClassementZoneResponse>(
      `${this.apiUrl}/valider-reference`,
      request
    );
  }

  getClassements(): Observable<ClassementZoneResponse[]> {
    return this.http.get<ClassementZoneResponse[]>(
      `${this.apiUrl}/classements`
    );
  }

  getClassementsByApplication(
    applicationCandidatureId: number
  ): Observable<ClassementZoneResponse[]> {
    return this.http.get<ClassementZoneResponse[]>(
      `${this.apiUrl}/classements/application/${applicationCandidatureId}`
    );
  }
}