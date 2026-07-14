import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
export interface UpdateRoleRequest {
  nomRole: string;
  description: string;
  typeRole: string;
  actif: boolean;
}

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

export interface ModuleGroup {
  groupe: string;
  ordreGroupe: number;
  totalModules: number;
  modulesAutorises: number;
  modules: ModuleAccess[];
}

export interface CreateRoleRequest {
  nomRole: string;
  description: string;
  typeRole: string;
}

export interface UpdateRoleModulesRequest {
  modules: {
    moduleId: number;
    autorise: boolean;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleAccessService {

  private apiUrl = 'http://localhost:8089/api/admin/roles-acces';

  constructor(private http: HttpClient) {}

  getRoles(): Observable<RoleAccess[]> {
    return this.http.get<RoleAccess[]>(`${this.apiUrl}/roles`);
  }

  createRole(request: CreateRoleRequest): Observable<RoleAccess> {
    return this.http.post<RoleAccess>(`${this.apiUrl}/roles`, request);
  }

  getModulesByRole(roleId: number): Observable<ModuleGroup[]> {
    return this.http.get<ModuleGroup[]>(`${this.apiUrl}/roles/${roleId}/modules`);
  }

  updateRoleModules(roleId: number, request: UpdateRoleModulesRequest): Observable<ModuleGroup[]> {
    return this.http.put<ModuleGroup[]>(`${this.apiUrl}/roles/${roleId}/modules`, request);
  }

  allowAll(roleId: number): Observable<ModuleGroup[]> {
    return this.http.patch<ModuleGroup[]>(`${this.apiUrl}/roles/${roleId}/allow-all`, {});
  }

  blockAll(roleId: number): Observable<ModuleGroup[]> {
    return this.http.patch<ModuleGroup[]>(`${this.apiUrl}/roles/${roleId}/block-all`, {});
  }

  getNavigationByRole(roleCode: string): Observable<ModuleAccess[]> {
    return this.http.get<ModuleAccess[]>(`${this.apiUrl}/navigation/${roleCode}`);
  }
  updateRole(roleId: number, request: UpdateRoleRequest): Observable<RoleAccess> {
  return this.http.put<RoleAccess>(`${this.apiUrl}/roles/${roleId}`, request);
}

deleteRole(roleId: number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/roles/${roleId}`);
}
}