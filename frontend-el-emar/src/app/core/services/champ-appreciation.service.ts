import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface LiaisonChampPiece {
  id?: number;

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

export interface LiaisonChampPieceRequest {
  champAppreciationId?: number | null;
  documentDemandeId: number | null;
  obligatoire?: boolean;
  conditionReponse?: string;
  messagePrestataire?: string;
  ordreAffichage?: number | null;
  actif?: boolean;
}

export interface ChampAppreciation {
  id?: number;

  lotId: number;
  lotNom: string;

  section: string;
  nomChamp: string;
  labelChamp: string;
  descriptionChamp: string;

  modeleReponse: string;
  typeChamp: string;
  conditionProcedure: string;
  codePxx: string;
  options: string;

  obligatoire: boolean;
  ordreAffichage: number;
  actif: boolean;

  piecesLiees?: LiaisonChampPiece[];
}

export interface ChampAppreciationRequest {
  lotId: number | null;

  section: string;
  nomChamp: string;
  labelChamp: string;
  descriptionChamp: string;

  modeleReponse: string;
  typeChamp: string;
  conditionProcedure: string;
  codePxx: string;
  options: string;

  obligatoire: boolean;
  ordreAffichage: number;
  actif: boolean;

  piecesLiees?: LiaisonChampPieceRequest[];
}

@Injectable({
  providedIn: 'root'
})
export class ChampAppreciationService {

  private apiUrl = `${environment.apiBaseUrl}/api/champs-appreciation`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ChampAppreciation[]> {
    return this.http.get<ChampAppreciation[]>(this.apiUrl);
  }

  getByLot(lotId: number): Observable<ChampAppreciation[]> {
    return this.http.get<ChampAppreciation[]>(`${this.apiUrl}/lot/${lotId}`);
  }

  getById(id: number): Observable<ChampAppreciation> {
    return this.http.get<ChampAppreciation>(`${this.apiUrl}/${id}`);
  }

  create(request: ChampAppreciationRequest): Observable<ChampAppreciation> {
    return this.http.post<ChampAppreciation>(this.apiUrl, request);
  }

  update(id: number, request: ChampAppreciationRequest): Observable<ChampAppreciation> {
    return this.http.put<ChampAppreciation>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}