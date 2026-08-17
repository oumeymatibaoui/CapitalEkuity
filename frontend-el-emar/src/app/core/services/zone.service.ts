import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface Zone {
  id?: number;
  nomZone: string;
  adresse?: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string;
  utilisateurId?: number;
  utilisateurNom?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ZoneService {

  private apiUrl = `${environment.apiBaseUrl}/api/zones`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Zone[]> {
    return this.http.get<Zone[]>(this.apiUrl);
  }

  create(zone: Zone): Observable<Zone> {
    const headers = new HttpHeaders({
      'X-USER-ID': '1'
    });

    return this.http.post<Zone>(this.apiUrl, zone, { headers });
  }

  update(id: number, zone: Zone): Observable<Zone> {
    return this.http.put<Zone>(`${this.apiUrl}/${id}`, zone);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}