import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface LiaisonChampPieceRequest {
  id?: number | null;

  champAppreciationId?: number | null;
  labelChamp?: string;
  codePxx?: string;

  lotId?: number | null;
  lotNom?: string;

  documentDemandeId?: number | null;
  codeDocument?: string;
  nomDocument?: string;

  obligatoire?: boolean;
  conditionReponse?: string;
  messagePrestataire?: string;
  ordreAffichage?: number | null;
  actif?: boolean;
}

export interface DocumentDemande {
  id: number;

  codeDocument: string;
  nomDocument: string;
  phase?: string | null;

  formatAccepte?: string | null;
  obligatoire?: boolean;
  actif?: boolean;
  ordreAffichage?: number | null;

  applicableTousLots?: boolean;
  applicableA?: string | null;
  applicableLots?: string[];

  lotId?: number | null;
  nomLot?: string | null;

  champsLies?: LiaisonChampPieceRequest[];
}

export interface DocumentDemandeRequest {
  codeDocument: string;
  nomDocument: string;
  phase?: string | null;

  formatAccepte?: string | null;
  obligatoire?: boolean;
  actif?: boolean;
  ordreAffichage?: number | null;

  applicableTousLots?: boolean;
  applicableLots?: string[];
  applicableA?: string | null;
  lotId?: number | null;

  champsLies?: LiaisonChampPieceRequest[];
}

@Injectable({
  providedIn: 'root'
})
export class DocumentDemandeService {

  private apiUrl = 'http://localhost:8089/api/documents-demandes';

  constructor(private http: HttpClient) {}

  getAll(): Observable<DocumentDemande[]> {
    return this.http.get<DocumentDemande[]>(this.apiUrl);
  }

  getActifs(): Observable<DocumentDemande[]> {
    return this.http.get<DocumentDemande[]>(`${this.apiUrl}/actifs`);
  }

  getById(id: number): Observable<DocumentDemande> {
    return this.http.get<DocumentDemande>(`${this.apiUrl}/${id}`);
  }

  create(request: DocumentDemandeRequest): Observable<DocumentDemande> {
    return this.http.post<DocumentDemande>(this.apiUrl, request);
  }

  update(id: number, request: DocumentDemandeRequest): Observable<DocumentDemande> {
    return this.http.put<DocumentDemande>(`${this.apiUrl}/${id}`, request);
  }

  deactivate(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleActif(id: number): Observable<DocumentDemande> {
    return this.http.patch<DocumentDemande>(`${this.apiUrl}/${id}/toggle-actif`, {});
  }

  getDocumentsGeneraux(): Observable<DocumentDemande[]> {
    return this.getActifs().pipe(
      map((documents: DocumentDemande[]) =>
        (documents ?? [])
          .filter((document: DocumentDemande) => this.isDocumentGeneral(document))
          .sort((a: DocumentDemande, b: DocumentDemande) =>
            (a.ordreAffichage ?? 0) - (b.ordreAffichage ?? 0)
          )
      )
    );
  }

  private isDocumentGeneral(document: DocumentDemande): boolean {
    const applicableA = (document.applicableA ?? '').trim().toUpperCase();

    return (
      document.lotId === null ||
      document.lotId === undefined ||
      document.applicableTousLots === true ||
      applicableA === 'TOUS' ||
      applicableA === 'TOUS LES LOTS' ||
      applicableA === 'CND' ||
      applicableA === 'GENERAL' ||
      applicableA === 'GENERALE'
    );
  }
}