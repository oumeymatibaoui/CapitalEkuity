import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  Observable,
  map,
  tap
} from 'rxjs';

// =====================================================
// MOT DE PASSE
// =====================================================

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// =====================================================
// UTILISATEUR INTERNE EL EMAR
// =====================================================

export interface ConnectedElEmarUser {
  id?: number;
  userId?: number;
  utilisateurId?: number;

  nom?: string;
  prenom?: string;
  email?: string;

  /**
   * Ancien système, conservé pour compatibilité.
   *
   * Exemple :
   * EL_EMAR, IT, DA, ADMIN
   */
  typeUtilisateur?: string;

  /**
   * Nouveau rôle dynamique.
   *
   * Exemple :
   * EVALUATEUR_JUNIOR
   */
  roleId?: number | null;
  roleCode?: string | null;
  roleNom?: string | null;

  /**
   * Anciennes formes possibles des réponses backend.
   */
  role?: string | Record<string, any> | null;
  type?: string | null;

  token?: string | null;
}

// =====================================================
// UTILISATEUR CANDIDAT
// =====================================================

export interface ConnectedCndUser {
  id?: number;
  userId?: number;
  utilisateurId?: number;

  candidatureId?: number | null;

  nom?: string;
  prenom?: string;
  email?: string;

  typeUtilisateur?: string;

  roleId?: number | null;
  roleCode?: string | null;
  roleNom?: string | null;

  role?: string | Record<string, any> | null;
  type?: string | null;

  mustChangePassword?: boolean;
  premiereConnexion?: boolean;
  actif?: boolean;
  statutCompte?: string | null;

  token?: string | null;
}

export type ConnectedUser =
  | ConnectedElEmarUser
  | ConnectedCndUser;

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly apiUrl =
    'http://localhost:8089/api/user';

  constructor(
    private http: HttpClient
  ) {}

  // =====================================================
  // LOGIN UTILISATEUR INTERNE
  // =====================================================

  loginElEmar(
    email: string,
    motDePasse: string
  ): Observable<ConnectedElEmarUser> {
    const body = {
      email: String(email || '')
        .trim()
        .toLowerCase(),

      motDePasse: String(motDePasse || '')
        .trim()
    };

    return this.http.post<any>(
      `${this.apiUrl}/el-emar/login`,
      body
    ).pipe(
      map((response: any) =>
        this.normalizeElEmarUser(response)
      ),

      tap((user: ConnectedElEmarUser) =>
        this.saveElEmarUser(user)
      )
    );
  }

  // =====================================================
  // LOGIN CANDIDAT
  // =====================================================

  loginCandidat(
    email: string,
    motDePasse: string
  ): Observable<ConnectedCndUser> {
    const body = {
      email: String(email || '')
        .trim()
        .toLowerCase(),

      motDePasse: String(motDePasse || '')
        .trim()
    };

    return this.http.post<any>(
      `${this.apiUrl}/candidat/login`,
      body
    ).pipe(
      map((response: any) =>
        this.normalizeCndUser(response)
      ),

      tap((user: ConnectedCndUser) =>
        this.saveCndUser(user)
      )
    );
  }

  // =====================================================
  // SESSION
  // =====================================================

  isLoggedIn(): boolean {
    return this.getConnectedUser() !== null;
  }

  logout(): void {
    const keysToRemove = [
      'userId',
      'connectedUser',
      'currentUser',
      'token',

      'elEmarUser',
      'elEmarConnectedUser',

      'candidatUser',
      'candidatUtilisateurId',
      'candidatCandidatureId',
      'candidatMustChangePassword',
      'candidatPremiereConnexion',

      'userRoleId',
      'userRoleCode',
      'userRoleNom'
    ];

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
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

  // =====================================================
  // INFORMATIONS UTILISATEUR
  // =====================================================

  /**
   * Retourne le véritable rôle dynamique.
   *
   * La priorité est :
   * roleCode → objet role → ancien typeUtilisateur.
   */
  getUserRole(
    user?: ConnectedUser | null
  ): string {
    const currentUser =
      user ?? this.getConnectedUser();

    if (!currentUser) {
      return String(
        localStorage.getItem('userRoleCode') || ''
      )
        .trim()
        .toUpperCase();
    }

    const rawUser = currentUser as any;

    const roleObject =
      rawUser?.role &&
      typeof rawUser.role === 'object'
        ? rawUser.role
        : null;

    return String(
      rawUser?.roleCode ??
      roleObject?.codeRole ??
      roleObject?.code ??
      (
        typeof rawUser?.role === 'string'
          ? rawUser.role
          : null
      ) ??
      rawUser?.typeUtilisateur ??
      rawUser?.type ??
      localStorage.getItem('userRoleCode') ??
      ''
    )
      .trim()
      .toUpperCase();
  }

  /**
   * Retourne l’ancien type technique.
   *
   * Il sert encore à distinguer CND des utilisateurs internes.
   */
  getLegacyUserType(
    user?: ConnectedUser | null
  ): string {
    const currentUser =
      user ?? this.getConnectedUser();

    if (!currentUser) {
      return '';
    }

    const rawUser = currentUser as any;

    return String(
      rawUser?.typeUtilisateur ??
      rawUser?.type ??
      ''
    )
      .trim()
      .toUpperCase();
  }

  getUserRoleId(): number | null {
    const user = this.getConnectedUser() as any;

    const value =
      user?.roleId ??
      localStorage.getItem('userRoleId') ??
      null;

    if (
      value === null ||
      value === undefined ||
      value === '' ||
      isNaN(Number(value))
    ) {
      return null;
    }

    return Number(value);
  }

  getUserRoleName(): string {
    const user = this.getConnectedUser() as any;

    return String(
      user?.roleNom ??
      localStorage.getItem('userRoleNom') ??
      ''
    ).trim();
  }

  isCandidat(
    user?: ConnectedUser | null
  ): boolean {
    const currentUser =
      user ?? this.getConnectedUser();

    if (!currentUser) {
      return false;
    }

    return (
      this.getLegacyUserType(currentUser) === 'CND' ||
      this.getUserRole(currentUser) === 'CND'
    );
  }

  getUserName(): string {
    const user = this.getConnectedUser();

    if (!user) {
      return '';
    }

    const rawUser = user as any;

    const prenom = String(
      rawUser?.prenom || ''
    ).trim();

    const nom = String(
      rawUser?.nom || ''
    ).trim();

    const fullName =
      `${prenom} ${nom}`.trim();

    if (fullName) {
      return fullName;
    }

    if (rawUser?.email) {
      return String(rawUser.email);
    }

    return 'Utilisateur';
  }

  getUserId(): number | null {
    const user = this.getConnectedUser();

    if (!user) {
      const storedId =
        localStorage.getItem('userId');

      return storedId &&
        !isNaN(Number(storedId))
          ? Number(storedId)
          : null;
    }

    const rawUser = user as any;

    const userId =
      rawUser?.id ??
      rawUser?.userId ??
      rawUser?.utilisateurId ??
      null;

    if (
      userId === null ||
      userId === undefined ||
      isNaN(Number(userId))
    ) {
      return null;
    }

    return Number(userId);
  }

  getCandidatUtilisateurId(): number | null {
    const value =
      localStorage.getItem(
        'candidatUtilisateurId'
      );

    return value &&
      !isNaN(Number(value))
        ? Number(value)
        : null;
  }

  getCandidatCandidatureId(): number | null {
    const value =
      localStorage.getItem(
        'candidatCandidatureId'
      );

    return value &&
      !isNaN(Number(value))
        ? Number(value)
        : null;
  }

  // =====================================================
  // NORMALISATION UTILISATEUR INTERNE
  // =====================================================

  private normalizeElEmarUser(
    response: any
  ): ConnectedElEmarUser {
    if (!response) {
      throw new Error(
        'Réponse login El Emar vide.'
      );
    }

    const user =
      response?.user ??
      response?.utilisateur ??
      response?.connectedUser ??
      response;

    const roleObject =
      user?.role &&
      typeof user.role === 'object'
        ? user.role
        : null;

    const roleId = this.toNumberOrNull(
      user?.roleId ??
      roleObject?.id ??
      null
    );

    const typeUtilisateur = String(
      user?.typeUtilisateur ??
      user?.type ??
      'EL_EMAR'
    )
      .trim()
      .toUpperCase();

    const roleCode = String(
      user?.roleCode ??
      roleObject?.codeRole ??
      roleObject?.code ??
      (
        typeof user?.role === 'string'
          ? user.role
          : null
      ) ??
      typeUtilisateur
    )
      .trim()
      .toUpperCase();

    const roleNomValue =
      user?.roleNom ??
      roleObject?.nomRole ??
      roleObject?.libelle ??
      null;

    const roleNom =
      roleNomValue !== null &&
      roleNomValue !== undefined
        ? String(roleNomValue).trim()
        : null;

    const tokenValue =
      response?.token ??
      user?.token ??
      null;

    const token =
      tokenValue !== null &&
      tokenValue !== undefined
        ? String(tokenValue)
        : null;

    return {
      ...user,

      id: this.toNumberOrUndefined(
        user?.id
      ),

      userId: this.toNumberOrUndefined(
        user?.userId
      ),

      utilisateurId: this.toNumberOrUndefined(
        user?.utilisateurId
      ),

      nom: String(user?.nom ?? ''),
      prenom: String(user?.prenom ?? ''),
      email: String(user?.email ?? ''),

      typeUtilisateur,

      roleId,
      roleCode,
      roleNom,

      role:
        typeof user?.role === 'string'
          ? user.role
          : roleObject,

      type:
        user?.type !== undefined &&
        user?.type !== null
          ? String(user.type)
          : null,

      token
    };
  }

  // =====================================================
  // NORMALISATION CANDIDAT
  // =====================================================

  private normalizeCndUser(
    response: any
  ): ConnectedCndUser {
    if (!response) {
      throw new Error(
        'Réponse login candidat vide.'
      );
    }

    const user =
      response?.user ??
      response?.utilisateur ??
      response?.connectedUser ??
      response;

    const roleObject =
      user?.role &&
      typeof user.role === 'object'
        ? user.role
        : null;

    const utilisateurId =
      this.toNumberOrUndefined(
        user?.utilisateurId ??
        user?.id ??
        user?.userId
      );

    const candidatureId =
      this.toNumberOrNull(
        user?.candidatureId
      );

    const roleId =
      this.toNumberOrNull(
        user?.roleId ??
        roleObject?.id ??
        null
      );

    const typeUtilisateur = String(
      user?.typeUtilisateur ??
      user?.type ??
      'CND'
    )
      .trim()
      .toUpperCase();

    const roleCode = String(
      user?.roleCode ??
      roleObject?.codeRole ??
      roleObject?.code ??
      (
        typeof user?.role === 'string'
          ? user.role
          : null
      ) ??
      typeUtilisateur ??
      'CND'
    )
      .trim()
      .toUpperCase();

    const roleNomValue =
      user?.roleNom ??
      roleObject?.nomRole ??
      roleObject?.libelle ??
      'Candidat';

    const tokenValue =
      response?.token ??
      user?.token ??
      null;

    return {
      id: this.toNumberOrUndefined(
        user?.id
      ),

      userId: this.toNumberOrUndefined(
        user?.userId
      ),

      utilisateurId,
      candidatureId,

      nom: String(user?.nom ?? ''),
      prenom: String(user?.prenom ?? ''),
      email: String(user?.email ?? ''),

      typeUtilisateur,

      roleId,
      roleCode,
      roleNom: String(roleNomValue),

      role:
        typeof user?.role === 'string'
          ? user.role
          : roleObject,

      type:
        user?.type !== undefined &&
        user?.type !== null
          ? String(user.type)
          : null,

      mustChangePassword:
        user?.mustChangePassword === true,

      premiereConnexion:
        user?.premiereConnexion === true,

      actif:
        user?.actif !== false,

      statutCompte:
        user?.statutCompte !== undefined &&
        user?.statutCompte !== null
          ? String(user.statutCompte)
          : null,

      token:
        tokenValue !== null &&
        tokenValue !== undefined
          ? String(tokenValue)
          : null
    };
  }

  // =====================================================
  // SAUVEGARDE UTILISATEUR INTERNE
  // =====================================================

  private saveElEmarUser(
    user: ConnectedElEmarUser
  ): void {
    const userId =
      user.id ??
      user.userId ??
      user.utilisateurId ??
      null;

    if (
      userId !== null &&
      userId !== undefined
    ) {
      localStorage.setItem(
        'userId',
        String(userId)
      );
    }

    this.saveRoleInformation(user);

    if (user.token) {
      localStorage.setItem(
        'token',
        user.token
      );
    } else {
      localStorage.removeItem('token');
    }

    localStorage.setItem(
      'elEmarUser',
      JSON.stringify(user)
    );

    localStorage.setItem(
      'connectedUser',
      JSON.stringify(user)
    );

    localStorage.setItem(
      'currentUser',
      JSON.stringify(user)
    );
  }

  // =====================================================
  // SAUVEGARDE CANDIDAT
  // =====================================================

  private saveCndUser(
    user: ConnectedCndUser
  ): void {
    const utilisateurId =
      user.utilisateurId ??
      user.id ??
      user.userId ??
      null;

    if (
      utilisateurId !== null &&
      utilisateurId !== undefined
    ) {
      localStorage.setItem(
        'userId',
        String(utilisateurId)
      );

      localStorage.setItem(
        'candidatUtilisateurId',
        String(utilisateurId)
      );
    }

    if (
      user.candidatureId !== null &&
      user.candidatureId !== undefined
    ) {
      localStorage.setItem(
        'candidatCandidatureId',
        String(user.candidatureId)
      );
    } else {
      localStorage.removeItem(
        'candidatCandidatureId'
      );
    }

    this.saveRoleInformation(user);

    if (user.token) {
      localStorage.setItem(
        'token',
        user.token
      );
    } else {
      localStorage.removeItem('token');
    }

    localStorage.setItem(
      'candidatUser',
      JSON.stringify(user)
    );

    localStorage.setItem(
      'connectedUser',
      JSON.stringify(user)
    );

    localStorage.setItem(
      'currentUser',
      JSON.stringify(user)
    );

    localStorage.setItem(
      'candidatMustChangePassword',
      String(user.mustChangePassword === true)
    );

    localStorage.setItem(
      'candidatPremiereConnexion',
      String(user.premiereConnexion === true)
    );
  }

  private saveRoleInformation(
    user: ConnectedUser
  ): void {
    const roleCode =
      user.roleCode ||
      user.typeUtilisateur ||
      '';

    if (
      user.roleId !== null &&
      user.roleId !== undefined
    ) {
      localStorage.setItem(
        'userRoleId',
        String(user.roleId)
      );
    } else {
      localStorage.removeItem('userRoleId');
    }

    if (roleCode) {
      localStorage.setItem(
        'userRoleCode',
        String(roleCode).toUpperCase()
      );
    } else {
      localStorage.removeItem('userRoleCode');
    }

    if (user.roleNom) {
      localStorage.setItem(
        'userRoleNom',
        String(user.roleNom)
      );
    } else {
      localStorage.removeItem('userRoleNom');
    }
  }

  // =====================================================
  // MOT DE PASSE
  // =====================================================

  forgotPassword(
    email: string
  ): Observable<string> {
    const body: ForgotPasswordRequest = {
      email: String(email || '')
        .trim()
        .toLowerCase()
    };

    return this.http.post(
      `${this.apiUrl}/forgot-password`,
      body,
      {
        responseType: 'text'
      }
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
      {
        responseType: 'text'
      }
    );
  }

  // =====================================================
  // CONVERSION DES VALEURS
  // =====================================================

  private toNumberOrNull(
    value: unknown
  ): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const numberValue = Number(value);

    return isNaN(numberValue)
      ? null
      : numberValue;
  }

  private toNumberOrUndefined(
    value: unknown
  ): number | undefined {
    const numberValue =
      this.toNumberOrNull(value);

    return numberValue === null
      ? undefined
      : numberValue;
  }
}