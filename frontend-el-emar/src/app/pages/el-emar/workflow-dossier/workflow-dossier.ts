import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  WorkflowElEmarService,
  WorkflowExecutionState,
  WorkflowResponse,
  WorkflowStepResponse,
} from '../../../core/services/workflow-el-emar.service';

import {
  UtilisateurAdminResponse,
  UtilisateurAdminService,
} from '../../../core/services/utilisateur-admin.service';

@Component({
  selector: 'app-workflow-dossier',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './workflow-dossier.html',
  styleUrl: './workflow-dossier.scss',
})
export class WorkflowDossier
implements OnChanges {

  @Input({ required: true })
  candidatureId!: number;

  @Input()
  raisonSociale = '';

  @Output()
  workflowStateChange =
    new EventEmitter<WorkflowExecutionState>();

  /**
   * Compatibilité temporaire avec les anciens parents.
   * Tu pourras le supprimer quand tous les parents utilisent workflowStateChange.
   */
  @Output()
  editableChange =
    new EventEmitter<boolean>();

  workflow: WorkflowResponse | null = null;
  users: UtilisateurAdminResponse[] = [];

  loading = false;
  loadingUsers = false;
  saving = false;

  errorMessage = '';
  successMessage = '';
  transmissionComment = '';

  showReassignModal = false;
  reassignStepTarget:
    WorkflowStepResponse | null = null;
  reassignUserId: number | null = null;
  reassignReason = '';

  showReopenModal = false;
  reopenStepTarget:
    WorkflowStepResponse | null = null;
  reopenUserId: number | null = null;
  reopenReason = '';

  constructor(
    private readonly workflowService:
      WorkflowElEmarService,
    private readonly userService:
      UtilisateurAdminService,
  ) {}

  ngOnChanges(
    changes: SimpleChanges,
  ): void {
    if (
      changes['candidatureId'] &&
      Number(this.candidatureId) > 0
    ) {
      this.loadWorkflow();

      if (
        this.isWorkflowStructureAdmin() ||
        this.isAdminAchatReadOnly()
      ) {
        this.loadUsers();
      } else {
        this.users = [];
      }
    }
  }

  // =====================================================
  // LOAD
  // =====================================================

  loadWorkflow(): void {
    if (!this.candidatureId) {
      this.emitState(null);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.workflowService
      .getWorkflow(this.candidatureId)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (workflow) => {
          this.workflow = workflow;
          this.emitState(workflow);
        },

        error: (error) => {
          console.error(
            'ERROR LOAD WORKFLOW',
            error,
          );

          this.workflow = null;
          this.emitState(null);
          this.errorMessage =
            this.extractError(
              error,
              'Impossible de charger le workflow du dossier.',
            );
        },
      });
  }

  loadUsers(): void {
    this.loadingUsers = true;

    this.userService
      .getAllUsers()
      .pipe(
        finalize(() => {
          this.loadingUsers = false;
        }),
      )
      .subscribe({
        next: (users) => {
          this.users = (users || [])
            .filter(
              (user) => this.isUserActive(user),
            )
            .sort((a, b) =>
              String(a.nom || '')
                .localeCompare(
                  String(b.nom || ''),
                  'fr',
                  { sensitivity: 'base' },
                ),
            );
        },
        error: () => {
          this.users = [];
        },
      });
  }

  // =====================================================
  // ÉTAPE ACTIVE
  // =====================================================

  startMyStep(): void {
    const active =
      this.workflow?.etapeActive;

    if (!active || !this.canStartCurrentStep()) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.workflowService
      .startStep(active.id)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage =
            'Votre étape est maintenant en cours.';
          this.loadWorkflow();
        },
        error: (error) => {
          this.errorMessage =
            this.extractError(
              error,
              'Impossible de démarrer cette étape.',
            );
        },
      });
  }

  transmitMyStep(): void {
    const active =
      this.workflow?.etapeActive;

    if (!active || !this.canTransmitCurrentStep()) {
      return;
    }

    const confirmed = window.confirm(
      'Terminer votre étape et transmettre le dossier à la prochaine étape ?',
    );

    if (!confirmed) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.workflowService
      .transmitStep(
        active.id,
        {
          commentaire:
            this.transmissionComment.trim() ||
            null,
        },
      )
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: (workflow) => {
          this.transmissionComment = '';
          this.workflow = workflow;
          this.emitState(workflow);

          this.successMessage =
            workflow.workflowTermine
              ? 'Dernière étape terminée. Le dossier est maintenant clôturé.'
              : 'Étape terminée. Le dossier a été transmis au responsable suivant.';
        },
        error: (error) => {
          this.errorMessage =
            this.extractError(
              error,
              "Impossible de terminer et transmettre l'étape.",
            );
        },
      });
  }

  canStartCurrentStep(): boolean {
    const active =
      this.workflow?.etapeActive;

    return Boolean(
      active &&
      this.isCurrentUserAssigned() &&
      (
        active.statut === 'A_TRAITER' ||
        active.statut === 'REOUVERTE'
      ),
    );
  }

  canTransmitCurrentStep(): boolean {
    const active =
      this.workflow?.etapeActive;

    return Boolean(
      active &&
      this.isCurrentUserAssigned() &&
      active.statut === 'EN_COURS',
    );
  }

  isCurrentUserAssigned(): boolean {
    const currentId =
      this.getCurrentUserId();

    return Boolean(
      currentId &&
      this.workflow?.etapeActive &&
      Number(
        this.workflow.etapeActive
          .utilisateurAffecteId,
      ) === Number(currentId),
    );
  }

  isStepAssignedToCurrentUser(
    step: WorkflowStepResponse,
  ): boolean {
    const currentId =
      this.getCurrentUserId();

    return Boolean(
      currentId &&
      Number(step.utilisateurAffecteId) ===
        Number(currentId),
    );
  }

  isDossierOpen(): boolean {
    return Boolean(
      this.workflow?.workflowInitialise &&
      !this.workflow?.workflowTermine,
    );
  }

  isDossierClosed(): boolean {
    return Boolean(
      this.workflow?.workflowTermine,
    );
  }

  isAnotherUserActiveStep(): boolean {
    return Boolean(
      this.isDossierOpen() &&
      this.workflow?.etapeActive &&
      !this.isCurrentUserAssigned(),
    );
  }

  // =====================================================
  // RÉAFFECTATION
  // =====================================================

  canReassignStep(
    step: WorkflowStepResponse | null,
  ): boolean {
    if (!step) {
      return false;
    }

    if (
      step.statut === 'TERMINEE' ||
      step.statut === 'ANNULEE'
    ) {
      return false;
    }

    return (
      this.isWorkflowStructureAdmin() ||
      this.isAdminAchatReadOnly()
    );
  }

  openReassignModal(
    step: WorkflowStepResponse,
  ): void {
    if (!this.canReassignStep(step)) {
      return;
    }

    this.reassignStepTarget = step;
    this.reassignUserId =
      step.utilisateurAffecteId;
    this.reassignReason = '';
    this.showReassignModal = true;
  }

  closeReassignModal(): void {
    if (this.saving) {
      return;
    }

    this.showReassignModal = false;
    this.reassignStepTarget = null;
    this.reassignUserId = null;
    this.reassignReason = '';
  }

  confirmReassign(): void {
    if (
      !this.reassignStepTarget ||
      !this.reassignUserId
    ) {
      this.errorMessage =
        'Choisissez un utilisateur.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    this.workflowService
      .reassignStep(
        this.reassignStepTarget.id,
        {
          nouvelUtilisateurId:
            Number(this.reassignUserId),
          motif:
            this.reassignReason.trim() ||
            null,
        },
      )
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: () => {
          this.closeReassignModal();
          this.successMessage =
            'Responsable réaffecté.';
          this.loadWorkflow();
        },
        error: (error) => {
          this.errorMessage =
            this.extractError(
              error,
              'Impossible de réaffecter cette étape.',
            );
        },
      });
  }

  reassignUsers(): UtilisateurAdminResponse[] {
    if (!this.reassignStepTarget) {
      return [];
    }

    const department =
      this.getStepDepartment(
        this.reassignStepTarget,
      );

    return this.users.filter(
      (user) =>
        this.normalizeDepartment(
          user.typeUtilisateur,
        ) === department,
    );
  }

  // =====================================================
  // RÉOUVERTURE ADMIN IT
  // =====================================================

  canReopenStep(
    step: WorkflowStepResponse | null,
  ): boolean {
    return Boolean(
      step &&
      step.statut === 'TERMINEE' &&
      this.isWorkflowStructureAdmin(),
    );
  }

  openReopenModal(
    step: WorkflowStepResponse,
  ): void {
    if (!this.canReopenStep(step)) {
      return;
    }

    this.reopenStepTarget = step;
    this.reopenUserId =
      step.utilisateurAffecteId;
    this.reopenReason = '';
    this.showReopenModal = true;
  }

  closeReopenModal(): void {
    if (this.saving) {
      return;
    }

    this.showReopenModal = false;
    this.reopenStepTarget = null;
    this.reopenUserId = null;
    this.reopenReason = '';
  }

  confirmReopen(): void {
    if (!this.reopenStepTarget) {
      return;
    }

    if (!this.reopenReason.trim()) {
      this.errorMessage =
        'Le motif de réouverture est obligatoire.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    this.workflowService
      .reopenStep(
        this.reopenStepTarget.id,
        {
          utilisateurAffecteId:
            this.reopenUserId,
          motif:
            this.reopenReason.trim(),
        },
      )
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: (workflow) => {
          this.closeReopenModal();
          this.workflow = workflow;
          this.emitState(workflow);
          this.successMessage =
            'Étape réouverte. Cette étape et les étapes suivantes devront être retraitées.';
        },
        error: (error) => {
          this.errorMessage =
            this.extractError(
              error,
              'Impossible de réouvrir cette étape.',
            );
        },
      });
  }

  reopenUsers(): UtilisateurAdminResponse[] {
    if (!this.reopenStepTarget) {
      return [];
    }

    const department =
      this.getStepDepartment(
        this.reopenStepTarget,
      );

    return this.users.filter(
      (user) =>
        this.normalizeDepartment(
          user.typeUtilisateur,
        ) === department,
    );
  }

  // =====================================================
  // AUTORISATIONS UX
  // =====================================================

  isWorkflowStructureAdmin(): boolean {
    const role = this.getCurrentRoleCode();

    return (
      (role === 'ADMIN' || role === 'ROLE_ADMIN') &&
      this.getCurrentDepartment() === 'IT'
    );
  }

  isAdminAchatReadOnly(): boolean {
    const role = this.getCurrentRoleCode();
    const department = this.getCurrentDepartment();

    return (
      (role === 'ADMIN' || role === 'ROLE_ADMIN') &&
      department === 'ACHAT'
    );
  }

  private getCurrentRoleCode(): string {
    const identity = this.readIdentity();

    return String(
      identity?.roleCode ??
      identity?.codeRole ??
      localStorage.getItem('roleCode') ??
      localStorage.getItem('userRoleCode') ??
      '',
    )
      .trim()
      .toUpperCase();
  }

  private getCurrentDepartment(): string {
    const identity = this.readIdentity();

    return this.normalizeDepartment(
      identity?.typeUtilisateur ??
      identity?.type ??
      localStorage.getItem('typeUtilisateur') ??
      localStorage.getItem('userType') ??
      '',
    );
  }

  private getCurrentUserId(): number | null {
    const identity = this.readIdentity();

    const raw =
      identity?.id ??
      identity?.utilisateurId ??
      identity?.userId ??
      localStorage.getItem('userId');

    const id = Number(raw);

    return Number.isFinite(id) && id > 0
      ? id
      : null;
  }

  private readIdentity(): any {
    for (
      const key of [
        'connectedUser',
        'currentUser',
        'user',
        'authUser',
      ]
    ) {
      const raw = localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      try {
        return JSON.parse(raw);
      } catch {
        continue;
      }
    }

    return null;
  }

  private getStepDepartment(
    step: WorkflowStepResponse,
  ): string {
    if (step.departementCode) {
      return this.normalizeDepartment(
        step.departementCode,
      );
    }

    switch (
      String(step.codeEtape || '')
        .trim()
        .toUpperCase()
    ) {
      case 'RECEVABILITE_ADMINISTRATIVE':
      case 'CLASSEMENT_ZONE':
        return 'ACHAT';
      case 'EVALUATION_TECHNIQUE':
        return 'TECHNIQUE';
      case 'DECISION_FINALE':
        return 'COMITE';
      default:
        return '';
    }
  }

  private normalizeDepartment(
    value?: string | null,
  ): string {
    const department = String(value || '')
      .trim()
      .toUpperCase();

    switch (department) {
      case 'DA':
      case 'ACHATS':
        return 'ACHAT';
      case 'EVALUATEUR':
      case 'EL_EMAR':
        return 'TECHNIQUE';
      case 'DECIDEUR':
        return 'COMITE';
      default:
        return department;
    }
  }

  // =====================================================
  // DISPLAY
  // =====================================================

  getProgressPercent(): number {
    const steps = this.workflow?.etapes || [];

    if (steps.length === 0) {
      return 0;
    }

    const finished = steps.filter(
      (step) =>
        step.statut === 'TERMINEE' ||
        step.statut === 'ANNULEE',
    ).length;

    return Math.round(
      (finished / steps.length) * 100,
    );
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'EN_ATTENTE':
        return 'En attente';
      case 'A_TRAITER':
        return 'À traiter';
      case 'EN_COURS':
        return 'En cours';
      case 'TERMINEE':
        return 'Terminée';
      case 'REOUVERTE':
        return 'Réouverte';
      case 'ANNULEE':
        return 'Annulée';
      default:
        return status || '-';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'TERMINEE':
        return 'ti ti-circle-check';
      case 'EN_COURS':
        return 'ti ti-progress-check';
      case 'A_TRAITER':
        return 'ti ti-player-play';
      case 'REOUVERTE':
        return 'ti ti-lock-open';
      case 'ANNULEE':
        return 'ti ti-circle-x';
      default:
        return 'ti ti-clock';
    }
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(
      'fr-FR',
      {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    ).format(date);
  }

  trackByStepId(
    _index: number,
    step: WorkflowStepResponse,
  ): number {
    return step.id;
  }

  private emitState(
    workflow: WorkflowResponse | null,
  ): void {
    const active = workflow?.etapeActive;
    const assigned = Boolean(
      active &&
      this.getCurrentUserId() &&
      Number(active.utilisateurAffecteId) ===
        Number(this.getCurrentUserId()),
    );

    const editable = Boolean(
      workflow?.workflowInitialise &&
      !workflow?.workflowTermine &&
      active &&
      assigned &&
      active.statut === 'EN_COURS' &&
      active.modifiable === true,
    );

    const state: WorkflowExecutionState = {
      workflowInitialise:
        workflow?.workflowInitialise === true,
      workflowTermine:
        workflow?.workflowTermine === true,
      activeStepCode:
        active?.codeEtape || null,
      activeStepStatus:
        active?.statut || null,
      assignedToCurrentUser: assigned,
      editable,
    };

    this.workflowStateChange.emit(state);
    this.editableChange.emit(editable);
  }

  private isUserActive(
    user: UtilisateurAdminResponse,
  ): boolean {
    const raw: any = user as any;
    const value = raw?.actif;

    if (value === false || value === 0) {
      return false;
    }

    const normalized = String(value ?? '')
      .trim()
      .toUpperCase();

    return ![
      'FALSE',
      '0',
      'NON',
      'INACTIF',
      'INACTIVE',
      'DESACTIVE',
      'DISABLED',
    ].includes(normalized);
  }

  private extractError(
    error: any,
    fallback: string,
  ): string {
    return (
      error?.error?.message ||
      error?.error?.detail ||
      error?.message ||
      fallback
    );
  }
}
