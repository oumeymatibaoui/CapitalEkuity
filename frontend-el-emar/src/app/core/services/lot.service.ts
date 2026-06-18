import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Lot {
  id?: number;
  codeLot: string;
  nomLot: string;
  description?: string;
  actif?: boolean | string | number;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LotService {

  private apiUrl = 'http://localhost:8089/api/lots';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Lot[]> {
    return this.http.get<Lot[]>(this.apiUrl);
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