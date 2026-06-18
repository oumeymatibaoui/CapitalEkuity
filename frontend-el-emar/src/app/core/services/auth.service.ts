import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface ConnectedUser {
  id: number;
  nom: string;
  email: string;
  typeUtilisateur: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8089/api/auth';
  private storageKey = 'connectedUser';

  constructor(private http: HttpClient) {}

  login(email: string, motDePasse: string): Observable<ConnectedUser> {
    return this.http.post<ConnectedUser>(`${this.apiUrl}/login`, {
      email,
      motDePasse
    }).pipe(
      tap(user => {
        localStorage.setItem(this.storageKey, JSON.stringify(user));
      })
    );
  }

  getConnectedUser(): ConnectedUser | null {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : null;
  }

  getConnectedUserId(): number | null {
    return this.getConnectedUser()?.id ?? null;
  }

  isElEmar(): boolean {
    return this.getConnectedUser()?.typeUtilisateur === 'EL_EMAR';
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
  }
}