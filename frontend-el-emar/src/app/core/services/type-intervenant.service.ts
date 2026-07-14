import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TypeIntervenant {
  id?: number;
  code: string;
  libelle: string;
  description?: string | null;
  actif?: boolean | string | number;
  ordreAffichage?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TypeIntervenantService {

  private readonly apiUrl = 'http://localhost:8089/api/types-intervenant';

  constructor(private http: HttpClient) {}

  getAll(activeOnly = false): Observable<TypeIntervenant[]> {
    let params = new HttpParams();

    if (activeOnly) {
      params = params.set('activeOnly', 'true');
    }

    return this.http.get<TypeIntervenant[]>(this.apiUrl, { params });
  }

  create(type: TypeIntervenant): Observable<TypeIntervenant> {
    return this.http.post<TypeIntervenant>(this.apiUrl, type);
  }

  update(id: number, type: TypeIntervenant): Observable<TypeIntervenant> {
    return this.http.put<TypeIntervenant>(`${this.apiUrl}/${id}`, type);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}