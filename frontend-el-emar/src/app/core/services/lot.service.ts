import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Lot {
  id?: number;
  codeLot: string;
  nomLot: string;
  description?: string | null;
  actif?: boolean | string | number;
  createdAt?: string;
  updatedAt?: string;

  typeIntervenantId?: number | null;
  typeIntervenantCode?: string | null;
  typeIntervenantLibelle?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class LotService {

  private readonly apiUrl = 'http://localhost:8089/api/lots';

  constructor(private http: HttpClient) {}

  getAll(typeIntervenantId?: number | null): Observable<Lot[]> {
    let params = new HttpParams();

    if (typeIntervenantId) {
      params = params.set('typeIntervenantId', String(typeIntervenantId));
    }

    return this.http.get<Lot[]>(this.apiUrl, { params });
  }

  create(lot: Lot): Observable<Lot> {
    return this.http.post<Lot>(this.apiUrl, lot);
  }

  update(id: number, lot: Lot): Observable<Lot> {
    return this.http.put<Lot>(`${this.apiUrl}/${id}`, lot);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}