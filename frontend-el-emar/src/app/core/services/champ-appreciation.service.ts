import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChampAppreciation {
  id?: number;

  lotId: number;
  lotNom?: string;

  section: string;
  nomChamp: string;
  labelChamp: string;
  descriptionChamp: string;

  modeleReponse: string;
  typeChamp: string;

  conditionProcedure: string;
  codePxx: string;
  options?: string;

  obligatoire: boolean;
  ordreAffichage: number;
  actif: boolean;
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
  options?: string;

  obligatoire: boolean;
  ordreAffichage: number;
  actif: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChampAppreciationService {

  private apiUrl = 'http://localhost:8089/api/champs-appreciation';

  constructor(private http: HttpClient) {}

  getAll(): Observable<ChampAppreciation[]> {
    return this.http.get<ChampAppreciation[]>(this.apiUrl);
  }

  getByLot(lotId: number): Observable<ChampAppreciation[]> {
    return this.http.get<ChampAppreciation[]>(`${this.apiUrl}/lot/${lotId}`);
  }

  create(champ: ChampAppreciationRequest): Observable<ChampAppreciation> {
    return this.http.post<ChampAppreciation>(this.apiUrl, champ);
  }

  update(id: number, champ: ChampAppreciationRequest): Observable<ChampAppreciation> {
    return this.http.put<ChampAppreciation>(`${this.apiUrl}/${id}`, champ);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}