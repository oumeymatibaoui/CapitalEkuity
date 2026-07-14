import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProjetReferenceRequest {
  id?: number | null;

  nomProjet: string;
  maitreOuvrage: string;

  ville: string;
  zone: string;
  typeProjet: string;
adresseProjet: string;
latitude: number | null;
longitude: number | null;
  surfaceM2: number | null;
  niveauxRPlus: number | null;
  nombreSousSols: number | null;
  anneeLivraison: number | null;

  bimOuiNon: boolean | null;
  seuilOk: boolean | null;

  missionRealisee: string;
  montant: number | null;
}

export interface ProjetReferenceResponse {
  id: number;

  applicationCandidatureId: number | null;
  lotId: number | null;
  lotNom: string | null;

  nomProjet: string;
  maitreOuvrage: string;

  ville: string;
  zone: string;
  typeProjet: string;
adresseProjet?: string;
latitude?: number | null;
longitude?: number | null;
  surfaceM2: number | null;
  niveauxRPlus: number | null;
  nombreSousSols: number | null;
  anneeLivraison: number | null;

  bimOuiNon: boolean | null;
  seuilOk: boolean | null;

  missionRealisee: string;
  montant: number | null;

  fichierP11?: string | null;
  fichierP12?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CndReferenceCandidatService {

  private apiUrl = 'http://localhost:8089/api/cnd/references';

  constructor(private http: HttpClient) {}

  getReferences(
    candidatureId: number,
    lotId: number
  ): Observable<ProjetReferenceResponse[]> {
    return this.http.get<ProjetReferenceResponse[]>(
      `${this.apiUrl}/${candidatureId}/lots/${lotId}`
    );
  }

  saveReferences(
    candidatureId: number,
    lotId: number,
    request: ProjetReferenceRequest[]
  ): Observable<ProjetReferenceResponse[]> {
    return this.http.put<ProjetReferenceResponse[]>(
      `${this.apiUrl}/${candidatureId}/lots/${lotId}`,
      request
    );
  }

  uploadReferenceFile(
    candidatureId: number,
    lotId: number,
    projetReferenceId: number,
    typeFichier: 'P11' | 'P12',
    file: File
  ): Observable<ProjetReferenceResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ProjetReferenceResponse>(
      `${this.apiUrl}/${candidatureId}/lots/${lotId}/projets/${projetReferenceId}/files/${typeFichier}`,
      formData
    );
  }
}
