import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

// =========================
// USER EL EMAR
// =========================
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}
export interface ConnectedElEmarUser {
  id?: number;
  userId?: number;
  utilisateurId?: number;

  nom?: string;
  prenom?: string;
  email?: string;

  typeUtilisateur?: string;
  role?: string;
  type?: string;

  token?: string;
}

// =========================
// USER CANDIDAT / CND
// =========================

export interface ConnectedCndUser {
  id?: number;
  userId?: number;
  utilisateurId?: number;

  candidatureId?: number | null;

  nom?: string;
  prenom?: string;
  email?: string;

  typeUtilisateur?: string;
  role?: string;
  type?: string;

  mustChangePassword?: boolean;
  premiereConnexion?: boolean;
  actif?: boolean;
  statutCompte?: string;

  token?: string;
}

// Type commun
export type ConnectedUser = ConnectedElEmarUser | ConnectedCndUser;

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly apiUrl = 'http://localhost:8089/api/user';

  constructor(private http: HttpClient) {}

  // =========================
  // LOGIN EL EMAR
  // =========================

  loginElEmar(email: string, motDePasse: string): Observable<ConnectedElEmarUser> {
    const body = {
      email: email.trim().toLowerCase(),
      motDePasse: motDePasse.trim()
    };

    console.log('LOGIN EL EMAR BODY = ', JSON.stringify(body));

    return this.http.post<any>(
      `${this.apiUrl}/el-emar/login`,
      body
    ).pipe(
      map((response: any) => this.normalizeElEmarUser(response)),
      tap((user: ConnectedElEmarUser) => this.saveElEmarUser(user))
    );
  }

  // =========================
  // LOGIN CANDIDAT
  // =========================

  loginCandidat(email: string, motDePasse: string): Observable<ConnectedCndUser> {
    const body = {
      email: email.trim().toLowerCase(),
      motDePasse: motDePasse.trim()
    };

    console.log('LOGIN CANDIDAT BODY = ', JSON.stringify(body));

    return this.http.post<any>(
      `${this.apiUrl}/candidat/login`,
      body
    ).pipe(
      map((response: any) => this.normalizeCndUser(response)),
      tap((user: ConnectedCndUser) => this.saveCndUser(user))
    );
  }

  // =========================
  // SESSION
  // =========================

  isLoggedIn(): boolean {
    return this.getConnectedUser() !== null;
  }

  logout(): void {
    localStorage.removeItem('userId');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');

    localStorage.removeItem('elEmarUser');

    localStorage.removeItem('candidatUser');
    localStorage.removeItem('candidatUtilisateurId');
    localStorage.removeItem('candidatCandidatureId');
    localStorage.removeItem('candidatMustChangePassword');
    localStorage.removeItem('candidatPremiereConnexion');
  }

  getConnectedUser(): ConnectedUser | null {
    const value =
      localStorage.getItem('connectedUser') ||
      localStorage.getItem('currentUser');

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as ConnectedUser;
    } catch {
      return null;
    }
  }

  getConnectedCndUser(): ConnectedCndUser | null {
    const value = localStorage.getItem('candidatUser');

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as ConnectedCndUser;
    } catch {
      return null;
    }
  }

  getUserRole(user?: ConnectedUser | null): string {
    const currentUser = user ?? this.getConnectedUser();

    if (!currentUser) {
      return '';
    }

    const rawUser = currentUser as any;

    return String(
      rawUser?.typeUtilisateur ??
      rawUser?.role ??
      rawUser?.type ??
      ''
    )
      .trim()
      .toUpperCase();
  }

  getUserName(): string {
    const user = this.getConnectedUser();

    if (!user) {
      return '';
    }

    const rawUser = user as any;

    const prenom = rawUser?.prenom ?? '';
    const nom = rawUser?.nom ?? '';

    const fullName = `${prenom} ${nom}`.trim();

    if (fullName) {
      return fullName;
    }

    if (rawUser?.email) {
      return rawUser.email;
    }

    return 'Utilisateur';
  }

  getUserId(): number | null {
    const user = this.getConnectedUser();

    if (!user) {
      return null;
    }

    const rawUser = user as any;

    const userId =
      rawUser?.id ??
      rawUser?.userId ??
      rawUser?.utilisateurId ??
      null;

    if (userId === null || userId === undefined) {
      return null;
    }

    return Number(userId);
  }

  getCandidatUtilisateurId(): number | null {
    const value = localStorage.getItem('candidatUtilisateurId');
    return value ? Number(value) : null;
  }

  getCandidatCandidatureId(): number | null {
    const value = localStorage.getItem('candidatCandidatureId');
    return value ? Number(value) : null;
  }

  // =========================
  // NORMALISATION EL EMAR
  // =========================

  private normalizeElEmarUser(response: any): ConnectedElEmarUser {
    if (!response) {
      throw new Error('Réponse login El Emar vide.');
    }

    const user =
      response.user ??
      response.utilisateur ??
      response.connectedUser ??
      response;

    const token = response.token ?? user.token;

    return {
      ...user,
      token
    };
  }

  // =========================
  // NORMALISATION CND
  // =========================

  private normalizeCndUser(response: any): ConnectedCndUser {
    if (!response) {
      throw new Error('Réponse login candidat vide.');
    }

    const user =
      response.user ??
      response.utilisateur ??
      response.connectedUser ??
      response;

    return {
      id: user.id,
      userId: user.userId,
      utilisateurId: Number(
        user.utilisateurId ??
        user.id ??
        user.userId
      ),

      candidatureId:
        user.candidatureId !== null && user.candidatureId !== undefined
          ? Number(user.candidatureId)
          : null,

      nom: user.nom ?? '',
      prenom: user.prenom ?? '',
      email: user.email ?? '',

      typeUtilisateur: String(
        user.typeUtilisateur ??
        user.role ??
        user.type ??
        'CND'
      ).toUpperCase(),

      role: user.role,
      type: user.type,

      mustChangePassword: user.mustChangePassword === true,
      premiereConnexion: user.premiereConnexion === true,
      actif: user.actif !== false,
      statutCompte: user.statutCompte ?? null,

      token: response.token ?? user.token
    };
  }

  // =========================
  // SAVE EL EMAR
  // =========================

  private saveElEmarUser(user: ConnectedElEmarUser): void {
    const rawUser = user as any;

    const userId =
      rawUser?.id ??
      rawUser?.userId ??
      rawUser?.utilisateurId ??
      null;

    if (userId !== null && userId !== undefined) {
      localStorage.setItem('userId', String(userId));
    }

    if (rawUser?.token) {
      localStorage.setItem('token', rawUser.token);
    }

    localStorage.setItem('elEmarUser', JSON.stringify(user));
    localStorage.setItem('connectedUser', JSON.stringify(user));
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  // =========================
  // SAVE CND
  // =========================

  private saveCndUser(user: ConnectedCndUser): void {
    const utilisateurId =
      user.utilisateurId ??
      user.id ??
      user.userId ??
      null;

    if (utilisateurId !== null && utilisateurId !== undefined) {
      localStorage.setItem('userId', String(utilisateurId));
      localStorage.setItem('candidatUtilisateurId', String(utilisateurId));
    }

    if (user.candidatureId !== null && user.candidatureId !== undefined) {
      localStorage.setItem('candidatCandidatureId', String(user.candidatureId));
    }

    if (user.token) {
      localStorage.setItem('token', user.token);
    }

    localStorage.setItem('candidatUser', JSON.stringify(user));
    localStorage.setItem('connectedUser', JSON.stringify(user));
    localStorage.setItem('currentUser', JSON.stringify(user));

    localStorage.setItem(
      'candidatMustChangePassword',
      String(user.mustChangePassword === true)
    );

    localStorage.setItem(
      'candidatPremiereConnexion',
      String(user.premiereConnexion === true)
    );
  }
  forgotPassword(email: string): Observable<string> {
  const body: ForgotPasswordRequest = {
    email: email.trim().toLowerCase()
  };

  return this.http.post(
    `${this.apiUrl}/forgot-password`,
    body,
    { responseType: 'text' }
  );
}

resetPassword(
  token: string,
  newPassword: string,
  confirmPassword: string
): Observable<string> {
  const body: ResetPasswordRequest = {
    token,
    newPassword,
    confirmPassword
  };

  return this.http.post(
    `${this.apiUrl}/reset-password`,
    body,
    { responseType: 'text' }
  );
}
}