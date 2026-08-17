import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type WorkflowDepartmentCode =
  | 'IT'
  | 'ACHAT'
  | 'TECHNIQUE'
  | 'COMITE';

export interface WorkflowModeleEtape {
  id?: number | null;
  codeEtape: string;
  libelleEtape: string;
  ordre: number;
  departementCode: WorkflowDepartmentCode;
  utilisateurDefautId: number | null;
  utilisateurDefautNom?: string | null;
  utilisateurDefautEmail?: string | null;
  actif?: boolean | null;
  updatedAt?: string | null;
}

export interface WorkflowModeleEtapeRequest {
  codeEtape: string;
  libelleEtape: string;
  ordre: number;
  departementCode: WorkflowDepartmentCode;
  utilisateurDefautId: number;
}

export interface WorkflowModeleUpdateRequest {
  etapes: WorkflowModeleEtapeRequest[];
}

export interface WorkflowBackfillResponse {
  nombreInitialise?: number;
  nombreReconstruit?: number;
}

@Injectable({ providedIn: 'root' })
export class WorkflowModeleService {

  private readonly apiUrl =
    `${environment.apiBaseUrl}/api/el-emar/workflow-modele`;

  constructor(
    private readonly http: HttpClient,
  ) {}

  getModele(): Observable<WorkflowModeleEtape[]> {
    return this.http.get<WorkflowModeleEtape[]>(
      this.apiUrl,
    );
  }

  saveModele(
    request: WorkflowModeleUpdateRequest,
  ): Observable<WorkflowModeleEtape[]> {
    return this.http.put<WorkflowModeleEtape[]>(
      this.apiUrl,
      request,
    );
  }

  initializeSubmittedWithoutWorkflow():
    Observable<WorkflowBackfillResponse> {
    return this.http.post<WorkflowBackfillResponse>(
      `${this.apiUrl}/initialiser-dossiers-sans-workflow`,
      {},
    );
  }

  rebuildUnstartedLegacyWorkflows():
    Observable<WorkflowBackfillResponse> {
    return this.http.post<WorkflowBackfillResponse>(
      `${this.apiUrl}/reconstruire-dossiers-non-demarres`,
      {},
    );
  }
}
