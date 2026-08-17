import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type WorkflowStepStatus =
  | 'EN_ATTENTE'
  | 'A_TRAITER'
  | 'EN_COURS'
  | 'TERMINEE'
  | 'REOUVERTE'
  | 'ANNULEE';

export const WORKFLOW_STEP_CODES = {
  RECEVABILITE_ADMINISTRATIVE:
    'RECEVABILITE_ADMINISTRATIVE',

  EVALUATION_TECHNIQUE:
    'EVALUATION_TECHNIQUE',

  DECISION_FINALE:
    'DECISION_FINALE',

  CLASSEMENT_ZONE:
    'CLASSEMENT_ZONE',
} as const;

export type WorkflowBusinessStepCode =
  typeof WORKFLOW_STEP_CODES[
    keyof typeof WORKFLOW_STEP_CODES
  ];

export interface TransmitWorkflowRequest {
  commentaire?: string | null;
}

export interface ReopenWorkflowRequest {
  utilisateurAffecteId?: number | null;
  motif: string;
}

export interface ReassignWorkflowRequest {
  nouvelUtilisateurId: number;
  motif?: string | null;
}

export interface WorkflowStepResponse {
  id: number;
  candidatureId: number;
  raisonSociale?: string | null;
  codeEtape: string;
  libelleEtape: string;
  ordre: number;
  departementCode?: string | null;
  statut: WorkflowStepStatus;
  active: boolean;
  modifiable: boolean;
  verrouillee: boolean;
  utilisateurAffecteId: number | null;
  utilisateurAffecteNom?: string | null;
  utilisateurAffecteEmail?: string | null;
  commentaireTransmission?: string | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  dateReouverture?: string | null;
  motifReouverture?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface WorkflowResponse {
  candidatureId: number;
  raisonSociale?: string | null;
  workflowInitialise: boolean;
  workflowTermine: boolean;
  etapeActive: WorkflowStepResponse | null;
  etapes: WorkflowStepResponse[];
}

export interface WorkflowAssignableUser {
  id: number;
  nom?: string | null;
  email?: string | null;
  typeUtilisateur?: string | null;
}

/**
 * État envoyé par WorkflowDossier à EvaluationCandidatures.
 *
 * editable = l'utilisateur connecté est affecté à l'étape active
 *            ET cette étape est EN_COURS.
 *
 * activeStepCode permet ensuite à EvaluationCandidatures d'ouvrir
 * uniquement la bonne section métier.
 */
export interface WorkflowExecutionState {
  workflowInitialise: boolean;
  workflowTermine: boolean;
  activeStepCode: string | null;
  activeStepStatus: WorkflowStepStatus | null;
  assignedToCurrentUser: boolean;
  editable: boolean;
}

@Injectable({ providedIn: 'root' })
export class WorkflowElEmarService {
  private readonly apiUrl =
    `${environment.apiBaseUrl}/api/el-emar/workflow`;

  constructor(
    private readonly http: HttpClient,
  ) {}

  getWorkflow(
    candidatureId: number,
  ): Observable<WorkflowResponse> {
    return this.http.get<WorkflowResponse>(
      `${this.apiUrl}/candidatures/${candidatureId}`,
    );
  }

  getMySteps(): Observable<WorkflowStepResponse[]> {
    return this.http.get<WorkflowStepResponse[]>(
      `${this.apiUrl}/mes-etapes`,
    );
  }

  getAssignableUsers(
    stepId: number,
  ): Observable<WorkflowAssignableUser[]> {
    return this.http.get<WorkflowAssignableUser[]>(
      `${this.apiUrl}/etapes/${stepId}/utilisateurs-affectables`,
    );
  }

  startStep(
    stepId: number,
  ): Observable<WorkflowStepResponse> {
    return this.http.patch<WorkflowStepResponse>(
      `${this.apiUrl}/etapes/${stepId}/demarrer`,
      null,
    );
  }

  transmitStep(
    stepId: number,
    request: TransmitWorkflowRequest,
  ): Observable<WorkflowResponse> {
    return this.http.patch<WorkflowResponse>(
      `${this.apiUrl}/etapes/${stepId}/transmettre`,
      request,
    );
  }

  reopenStep(
    stepId: number,
    request: ReopenWorkflowRequest,
  ): Observable<WorkflowResponse> {
    return this.http.patch<WorkflowResponse>(
      `${this.apiUrl}/etapes/${stepId}/reouvrir`,
      request,
    );
  }

  reassignStep(
    stepId: number,
    request: ReassignWorkflowRequest,
  ): Observable<WorkflowStepResponse> {
    return this.http.patch<WorkflowStepResponse>(
      `${this.apiUrl}/etapes/${stepId}/reaffecter`,
      request,
    );
  }
}
