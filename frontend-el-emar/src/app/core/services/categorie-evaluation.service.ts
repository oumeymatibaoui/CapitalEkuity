import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface CategorieEvaluation {
  id?: number;

  typeIntervenantId: number;
  typeIntervenantCode?: string | null;
  typeIntervenantLibelle?: string | null;

  lotId?: number | null;
  lotCode?: string | null;
  lotNom?: string | null;

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
export class CategorieEvaluationService {

  private readonly apiUrl = `${environment.apiBaseUrl}/api/categories-evaluation`;

  constructor(private http: HttpClient) {}

  getByScope(
    typeIntervenantId: number,
    lotId?: number | null,
    activeOnly = true
  ): Observable<CategorieEvaluation[]> {
    let params = new HttpParams()
      .set('typeIntervenantId', String(typeIntervenantId))
      .set('activeOnly', String(activeOnly));

    if (lotId) {
      params = params.set('lotId', String(lotId));
    }

    return this.http.get<CategorieEvaluation[]>(this.apiUrl, { params });
  }

  create(category: CategorieEvaluation): Observable<CategorieEvaluation> {
    return this.http.post<CategorieEvaluation>(this.apiUrl, category);
  }

  update(id: number, category: CategorieEvaluation): Observable<CategorieEvaluation> {
    return this.http.put<CategorieEvaluation>(`${this.apiUrl}/${id}`, category);
  }

  toggleActif(id: number): Observable<CategorieEvaluation> {
    return this.http.patch<CategorieEvaluation>(`${this.apiUrl}/${id}/toggle-actif`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}