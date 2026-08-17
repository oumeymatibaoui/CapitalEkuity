import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class CandidatCompteService {

  private readonly baseUrl = `${environment.apiBaseUrl}/api/candidat/compte`;

  constructor(private http: HttpClient) {}

  changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Observable<void> {
    const body: ChangePasswordRequest = {
      oldPassword,
      newPassword
    };

    return this.http.put<void>(
      `${this.baseUrl}/${userId}/mot-de-passe`,
      body
    );
  }
}