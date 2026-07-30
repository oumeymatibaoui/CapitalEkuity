import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// =====================================================
// RÔLE
// =====================================================

export interface RoleAccess {
  id: number;
  codeRole: string;
  nomRole: string;
  description: string;
  typeRole: string;
  roleSysteme: boolean;
  actif: boolean;
  modulesAutorises: number;
  totalModules: number;
}

// =====================================================
// CRÉATION RÔLE
// =====================================================

export interface CreateRoleRequest {
  nomRole: string;
  description: string;
  typeRole: string;

  /*
   * true  = système
   * false = standard
   */
  roleSysteme: boolean;
}

export interface UpdateRoleRequest {
  nomRole: string;
  description: string;
  typeRole: string;
  actif: boolean;
  roleSysteme: boolean;
}

// =====================================================
// MODULE
// =====================================================

export interface ModuleAccess {
  moduleId: number;
  codeModule: string;
  groupe: string;
  libelle: string;
  description: string;
  routeFront: string;
  icone: string;
  ordreGroupe: number;
  ordreModule: number;
  autorise: boolean;
}

// =====================================================
// GROUPE DE MODULES
// =====================================================

export interface ModuleGroup {
  groupe: string;
  ordreGroupe: number;
  totalModules: number;
  modulesAutorises: number;
  modules: ModuleAccess[];
}

// =====================================================
// MODIFICATION DES ACCÈS
// =====================================================

export interface UpdateRoleModulesRequest {
  modules: Array<{
    moduleId: number;
    autorise: boolean;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class RoleAccessService {

  /*
   * Correspond exactement au :
   *
   * @RequestMapping("/api/admin/roles-acces")
   */
  private readonly apiUrl =
    'http://localhost:8089/api/admin/roles-acces';

  constructor(
    private http: HttpClient
  ) {}

  // =====================================================
  // GET /api/admin/roles-acces/roles
  // =====================================================

  getRoles(): Observable<RoleAccess[]> {
    return this.http.get<RoleAccess[]>(
      `${this.apiUrl}/roles`
    );
  }

  // =====================================================
  // POST /api/admin/roles-acces/roles
  // =====================================================

  createRole(
    request: CreateRoleRequest
  ): Observable<RoleAccess> {
    return this.http.post<RoleAccess>(
      `${this.apiUrl}/roles`,
      request
    );
  }

  // =====================================================
  // PUT /api/admin/roles-acces/roles/{roleId}
  // =====================================================

  updateRole(
    roleId: number,
    request: UpdateRoleRequest
  ): Observable<RoleAccess> {
    return this.http.put<RoleAccess>(
      `${this.apiUrl}/roles/${roleId}`,
      request
    );
  }

  // =====================================================
  // DELETE /api/admin/roles-acces/roles/{roleId}
  // =====================================================

  deleteRole(
    roleId: number
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/roles/${roleId}`
    );
  }

  // =====================================================
  // GET /api/admin/roles-acces/roles/{roleId}/modules
  // =====================================================

  getModulesByRole(
    roleId: number
  ): Observable<ModuleGroup[]> {
    return this.http.get<ModuleGroup[]>(
      `${this.apiUrl}/roles/${roleId}/modules`
    );
  }

  // =====================================================
  // PUT /api/admin/roles-acces/roles/{roleId}/modules
  // =====================================================

  updateRoleModules(
    roleId: number,
    request: UpdateRoleModulesRequest
  ): Observable<ModuleGroup[]> {
    return this.http.put<ModuleGroup[]>(
      `${this.apiUrl}/roles/${roleId}/modules`,
      request
    );
  }

  // =====================================================
  // PATCH /api/admin/roles-acces/roles/{roleId}/allow-all
  // =====================================================

  allowAll(
    roleId: number
  ): Observable<ModuleGroup[]> {
    return this.http.patch<ModuleGroup[]>(
      `${this.apiUrl}/roles/${roleId}/allow-all`,
      {}
    );
  }

  // =====================================================
  // PATCH /api/admin/roles-acces/roles/{roleId}/block-all
  // =====================================================

  blockAll(
    roleId: number
  ): Observable<ModuleGroup[]> {
    return this.http.patch<ModuleGroup[]>(
      `${this.apiUrl}/roles/${roleId}/block-all`,
      {}
    );
  }

  // =====================================================
  // GET /api/admin/roles-acces/navigation/{roleCode}
  // =====================================================

  getNavigationByRole(
    roleCode: string
  ): Observable<ModuleAccess[]> {
    const normalizedRoleCode = encodeURIComponent(
      String(roleCode || '')
        .trim()
        .toUpperCase()
    );

    return this.http.get<ModuleAccess[]>(
      `${this.apiUrl}/navigation/${normalizedRoleCode}`
    );
  }
}