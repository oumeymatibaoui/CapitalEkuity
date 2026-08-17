import { Injectable } from "@angular/core";
import {
  HttpClient,
  HttpParams,
} from "@angular/common/http";
import {
  Observable,
  Subject,
  tap,
} from "rxjs";
import { environment } from '../../../environments/environment.development';

// =====================================================
// RÔLE
// =====================================================

export interface RoleAccess {
  id: number;
  codeRole: string;
  nomRole: string;
  description?: string | null;
  typeRole: string;
  roleSysteme: boolean;
  actif: boolean;
  totalModules: number;
  modulesAutorises: number;
}

// =====================================================
// MODULE / PERMISSION
// =====================================================

export interface ModuleAccess {
  moduleId: number;
  codeModule?: string | null;
  libelle: string;
  description?: string | null;
  groupe: string;
  routeFront?: string | null;
  icone?: string | null;
  ordreGroupe?: number | null;
  ordreModule?: number | null;
  autorise: boolean;
}

export interface ModuleGroup {
  groupe: string;
  libelleGroupe?: string | null;
  ordreGroupe?: number | null;
  totalModules: number;
  modulesAutorises: number;
  modules: ModuleAccess[];
}

// =====================================================
// CATÉGORIE
// =====================================================

export interface RoleCategoryAccess {
  categorieId: number;
  typeIntervenantId?: number | null;
  typeIntervenantLibelle?: string | null;
  lotId?: number | null;
  lotNom?: string | null;
  code: string;
  libelle: string;
  description?: string | null;
  ordreAffichage?: number | null;
  autorise: boolean;
}

// =====================================================
// ACCÈS DE L'UTILISATEUR CONNECTÉ
// =====================================================

export interface CurrentRoleAccessResponse {
  utilisateurId: number;
  roleId: number;
  roleCode: string;
  roleNom?: string | null;
  modules: ModuleAccess[];
  categories: RoleCategoryAccess[];
}

// =====================================================
// REQUÊTES
// =====================================================

export interface CreateRoleRequest {
  nomRole: string;
  description?: string;
  typeRole: string;
  roleSysteme: boolean;
}

export interface UpdateRoleRequest {
  nomRole: string;
  description?: string;
  typeRole: string;
  roleSysteme: boolean;
  actif: boolean;
}

export interface UpdateRoleModulesRequest {
  modules: Array<{
    moduleId: number;
    autorise: boolean;
  }>;
}

export interface UpdateRoleCategoriesRequest {
  categorieIds: number[];
}

@Injectable({
  providedIn: "root",
})
export class RoleAccessService {
  private readonly adminBaseUrl =
    `${environment.apiBaseUrl}/api/admin/roles-acces`;

  private readonly currentAccessUrl =
    `${environment.apiBaseUrl}/api/el-emar/access/me`;

  private readonly navigationChangedSubject =
    new Subject<void>();

  readonly navigationChanged$ =
    this.navigationChangedSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
  ) {}

  notifyNavigationChanged(): void {
    this.navigationChangedSubject.next();
  }

  // ===================================================
  // RÔLES — ADMINISTRATION
  // ===================================================

  getRoles(): Observable<RoleAccess[]> {
    return this.http.get<RoleAccess[]>(
      `${this.adminBaseUrl}/roles`,
    );
  }

  createRole(
    request: CreateRoleRequest,
  ): Observable<RoleAccess> {
    return this.http.post<RoleAccess>(
      `${this.adminBaseUrl}/roles`,
      request,
    );
  }

  updateRole(
    roleId: number,
    request: UpdateRoleRequest,
  ): Observable<RoleAccess> {
    return this.http
      .put<RoleAccess>(
        `${this.adminBaseUrl}/roles/${roleId}`,
        request,
      )
      .pipe(
        tap(() => this.notifyNavigationChanged()),
      );
  }

  deleteRole(roleId: number): Observable<void> {
    return this.http
      .delete<void>(
        `${this.adminBaseUrl}/roles/${roleId}`,
      )
      .pipe(
        tap(() => this.notifyNavigationChanged()),
      );
  }

  // ===================================================
  // MODULES — ADMINISTRATION
  // ===================================================

  getModulesByRole(
    roleId: number,
  ): Observable<ModuleGroup[]> {
    return this.http.get<ModuleGroup[]>(
      `${this.adminBaseUrl}/roles/${roleId}/modules`,
      {
        params: this.refreshParams(),
      },
    );
  }

  updateRoleModules(
    roleId: number,
    request: UpdateRoleModulesRequest,
  ): Observable<ModuleGroup[]> {
    return this.http.put<ModuleGroup[]>(
      `${this.adminBaseUrl}/roles/${roleId}/modules`,
      request,
    );
  }

  allowAll(roleId: number): Observable<ModuleGroup[]> {
    return this.http
      .patch<ModuleGroup[]>(
        `${this.adminBaseUrl}/roles/${roleId}/allow-all`,
        {},
      )
      .pipe(
        tap(() => this.notifyNavigationChanged()),
      );
  }

  blockAll(roleId: number): Observable<ModuleGroup[]> {
    return this.http
      .patch<ModuleGroup[]>(
        `${this.adminBaseUrl}/roles/${roleId}/block-all`,
        {},
      )
      .pipe(
        tap(() => this.notifyNavigationChanged()),
      );
  }

  // ===================================================
  // CATÉGORIES — ADMINISTRATION
  // ===================================================

  getCategoriesByRole(
    roleId: number,
  ): Observable<RoleCategoryAccess[]> {
    return this.http.get<RoleCategoryAccess[]>(
      `${this.adminBaseUrl}/roles/${roleId}/categories`,
      {
        params: this.refreshParams(),
      },
    );
  }

  updateRoleCategories(
    roleId: number,
    request: UpdateRoleCategoriesRequest,
  ): Observable<RoleCategoryAccess[]> {
    return this.http.put<RoleCategoryAccess[]>(
      `${this.adminBaseUrl}/roles/${roleId}/categories`,
      request,
    );
  }

  // ===================================================
  // ACCÈS DU COMPTE CONNECTÉ — JWT
  // ===================================================

  /**
   * Charge les droits du compte authentifié.
   * Le backend déduit utilisateurId et roleId depuis le JWT.
   */
  getMyAccess(): Observable<CurrentRoleAccessResponse> {
    return this.http.get<CurrentRoleAccessResponse>(
      this.currentAccessUrl,
      {
        params: this.refreshParams(),
      },
    );
  }

  // ===================================================
  // NAVIGATION SIDEBAR
  // ===================================================

  getNavigationByRoleCode(
    roleCode: string,
  ): Observable<ModuleAccess[]> {
    const normalizedRoleCode = String(roleCode || "")
      .trim()
      .toUpperCase();

    return this.http.get<ModuleAccess[]>(
      `${this.adminBaseUrl}/navigation/${encodeURIComponent(normalizedRoleCode)}`,
      {
        params: this.refreshParams(),
      },
    );
  }

  private refreshParams(): HttpParams {
    return new HttpParams().set(
      "_refresh",
      String(Date.now()),
    );
  }
}
