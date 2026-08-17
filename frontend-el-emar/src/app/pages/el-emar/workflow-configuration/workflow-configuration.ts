import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  finalize,
  forkJoin,
} from 'rxjs';

import {
  UtilisateurAdminResponse,
  UtilisateurAdminService,
} from '../../../core/services/utilisateur-admin.service';

import {
  WorkflowDepartmentCode,
  WorkflowModeleEtape,
  WorkflowModeleService,
} from '../../../core/services/workflow-modele.service';

type StepType =
  | 'RECEVABILITE_ADMINISTRATIVE'
  | 'EVALUATION_TECHNIQUE'
  | 'DECISION_FINALE'
  | 'CLASSEMENT_ZONE'
  | 'GENERIC';

interface StepTypeOption {
  code: StepType;
  label: string;
  defaultLabel: string;
  defaultDepartment: WorkflowDepartmentCode;
  business: boolean;
}

interface WorkflowStepForm {
  uid: string;
  id?: number | null;
  typeEtape: StepType;
  codeEtape: string;
  libelleEtape: string;
  ordre: number;
  departementCode: WorkflowDepartmentCode;
  utilisateurDefautId: number | null;
}

@Component({
  selector: 'app-workflow-configuration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './workflow-configuration.html',
  styleUrl: './workflow-configuration.scss',
})
export class WorkflowConfiguration
implements OnInit {

  readonly departments: Array<{
    code: WorkflowDepartmentCode;
    label: string;
  }> = [
    { code: 'ACHAT', label: 'Achat' },
    { code: 'TECHNIQUE', label: 'Technique' },
    { code: 'COMITE', label: 'Comité' },
    { code: 'IT', label: 'IT' },
  ];

  readonly stepTypes: StepTypeOption[] = [
    {
      code: 'RECEVABILITE_ADMINISTRATIVE',
      label: 'Recevabilité administrative',
      defaultLabel: 'Recevabilité administrative',
      defaultDepartment: 'ACHAT',
      business: true,
    },
    {
      code: 'EVALUATION_TECHNIQUE',
      label: 'Évaluation technique',
      defaultLabel: 'Évaluation technique',
      defaultDepartment: 'TECHNIQUE',
      business: true,
    },
    {
      code: 'DECISION_FINALE',
      label: 'Décision finale',
      defaultLabel: 'Décision finale',
      defaultDepartment: 'COMITE',
      business: true,
    },
    {
      code: 'CLASSEMENT_ZONE',
      label: 'Classement par zone',
      defaultLabel: 'Classement par zone',
      defaultDepartment: 'ACHAT',
      business: true,
    },
    {
      code: 'GENERIC',
      label: 'Étape libre / transmission',
      defaultLabel: 'Nouvelle étape',
      defaultDepartment: 'ACHAT',
      business: false,
    },
  ];

  readonly requiredBusinessCodes: string[] = [
    'RECEVABILITE_ADMINISTRATIVE',
    'EVALUATION_TECHNIQUE',
    'DECISION_FINALE',
    'CLASSEMENT_ZONE',
  ];

  steps: WorkflowStepForm[] = [];
  users: UtilisateurAdminResponse[] = [];

  loading = false;
  saving = false;
  backfilling = false;
  rebuilding = false;

  pageError = '';
  successMessage = '';

  private sequence = 0;

  constructor(
    private readonly modeleService: WorkflowModeleService,
    private readonly userService: UtilisateurAdminService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  // =====================================================
  // PROFIL CONNECTÉ
  // =====================================================

  get canEditStructure(): boolean {
    const role = this.getCurrentRoleCode();
    const department = this.getCurrentDepartment();

    return (
      (role === 'ADMIN' || role === 'ROLE_ADMIN') &&
      department === 'IT'
    );
  }

  get isAdminAchatReadOnly(): boolean {
    const role = this.getCurrentRoleCode();
    const department = this.getCurrentDepartment();

    return (
      (role === 'ADMIN' || role === 'ROLE_ADMIN') &&
      department === 'ACHAT'
    );
  }

  // =====================================================
  // LOAD
  // =====================================================

  load(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.pageError = '';
    this.successMessage = '';

    forkJoin({
      model: this.modeleService.getModele(),
      users: this.userService.getAllUsers(),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: ({ model, users }) => {
          this.users = (users || [])
            .filter(user => this.isUserActive(user))
            .filter(user =>
              [
                'IT',
                'ACHAT',
                'TECHNIQUE',
                'COMITE',
              ].includes(
                this.resolveUserDepartment(user),
              )
            )
            .sort((a, b) =>
              String(a.nom || '').localeCompare(
                String(b.nom || ''),
                'fr',
                { sensitivity: 'base' },
              )
            );

          this.steps = this.mapModelToForm(model || []);
          this.recalculateOrders();
        },

        error: error => {
          console.error(
            'ERROR LOAD GLOBAL WORKFLOW MODEL',
            error,
          );

          this.pageError = this.extractError(
            error,
            'Impossible de charger la configuration globale du workflow.',
          );
        },
      });
  }

  // =====================================================
  // CREATION
  // =====================================================

  addStep(): void {
    if (!this.canEditStructure) {
      return;
    }
    this.steps = [
      ...this.steps,
      this.createGenericStep(),
    ];

    this.recalculateOrders();
    this.clearMessages();
  }

  createBusinessTemplate(): void {
    if (!this.canEditStructure) {
      return;
    }
    for (const option of this.stepTypes) {
      if (!option.business) {
        continue;
      }

      const exists = this.steps.some(
        step => step.codeEtape === option.code,
      );

      if (exists) {
        continue;
      }

      this.steps.push({
        uid: this.newUid(),
        id: null,
        typeEtape: option.code,
        codeEtape: option.code,
        libelleEtape: option.defaultLabel,
        ordre: this.steps.length + 1,
        departementCode: option.defaultDepartment,
        utilisateurDefautId: null,
      });
    }

    this.recalculateOrders();
    this.clearMessages();
  }

  // =====================================================
  // TYPE D'ETAPE
  // =====================================================

  onTypeChange(
    step: WorkflowStepForm,
    type: StepType,
  ): void {
    if (!this.canEditStructure) {
      return;
    }
    const option = this.stepTypes.find(
      item => item.code === type,
    );

    if (!option) {
      return;
    }

    if (
      option.business &&
      this.isBusinessTypeUsed(type, step)
    ) {
      this.pageError =
        'Cette étape métier existe déjà dans le workflow.';
      return;
    }

    step.typeEtape = type;

    if (type === 'GENERIC') {
      if (this.isBusinessCode(step.codeEtape)) {
        step.codeEtape = this.generateGenericCode();
      }

      if (!String(step.libelleEtape || '').trim()) {
        step.libelleEtape = option.defaultLabel;
      }

      this.pageError = '';
      return;
    }

    step.codeEtape = option.code;
    step.libelleEtape = option.defaultLabel;
    step.departementCode = option.defaultDepartment;
    step.utilisateurDefautId = null;
    this.pageError = '';
  }

  isBusinessTypeUsed(
    type: StepType,
    currentStep: WorkflowStepForm,
  ): boolean {
    if (type === 'GENERIC') {
      return false;
    }

    return this.steps.some(
      step =>
        step.uid !== currentStep.uid &&
        step.codeEtape === type,
    );
  }

  isBusinessStep(step: WorkflowStepForm): boolean {
    return this.isBusinessCode(step.codeEtape);
  }

  departmentLocked(step: WorkflowStepForm): boolean {
    return !this.canEditStructure || this.isBusinessStep(step);
  }

  onCustomCodeBlur(step: WorkflowStepForm): void {
    if (!this.canEditStructure) {
      return;
    }
    if (this.isBusinessStep(step)) {
      return;
    }

    const normalized = this.normalizeCustomCode(
      step.codeEtape,
    );

    step.codeEtape = normalized || this.generateGenericCode();
  }

  // =====================================================
  // DELETE
  // =====================================================

  removeStep(step: WorkflowStepForm): void {
    if (!this.canEditStructure) {
      return;
    }
    const confirmed = window.confirm(
      `Supprimer l'étape « ${step.libelleEtape || step.codeEtape} » ?`,
    );

    if (!confirmed) {
      return;
    }

    this.steps = this.steps.filter(
      item => item.uid !== step.uid,
    );

    this.recalculateOrders();
    this.clearMessages();
  }

  clearWorkflow(): void {
    if (!this.canEditStructure) {
      return;
    }
    if (!this.steps.length) {
      return;
    }

    const confirmed = window.confirm(
      'Vider le workflow affiché ? Vous devrez recréer les étapes métier avant de pouvoir enregistrer.',
    );

    if (!confirmed) {
      return;
    }

    this.steps = [];
    this.clearMessages();
  }

  // =====================================================
  // ORDER
  // =====================================================

  moveUp(index: number): void {
    if (!this.canEditStructure) {
      return;
    }
    if (index <= 0) {
      return;
    }

    [
      this.steps[index - 1],
      this.steps[index],
    ] = [
      this.steps[index],
      this.steps[index - 1],
    ];

    this.recalculateOrders();
    this.clearMessages();
  }

  moveDown(index: number): void {
    if (!this.canEditStructure) {
      return;
    }
    if (
      index < 0 ||
      index >= this.steps.length - 1
    ) {
      return;
    }

    [
      this.steps[index],
      this.steps[index + 1],
    ] = [
      this.steps[index + 1],
      this.steps[index],
    ];

    this.recalculateOrders();
    this.clearMessages();
  }

  private recalculateOrders(): void {
    this.steps = this.steps.map(
      (step, index) => ({
        ...step,
        ordre: index + 1,
      })
    );
  }

  // =====================================================
  // DEPARTMENT / USERS
  // =====================================================

  onDepartmentChange(step: WorkflowStepForm): void {
    if (!this.canEditStructure) {
      return;
    }
    if (this.departmentLocked(step)) {
      const option = this.stepTypes.find(
        item => item.code === step.typeEtape,
      );

      if (option) {
        step.departementCode = option.defaultDepartment;
      }
    }

    if (!step.utilisateurDefautId) {
      return;
    }

    const current = this.users.find(
      user =>
        Number(user.id) ===
        Number(step.utilisateurDefautId),
    );

    if (
      !current ||
      this.resolveUserDepartment(current) !==
        step.departementCode
    ) {
      step.utilisateurDefautId = null;
    }
  }

  usersForStep(
    step: WorkflowStepForm,
  ): UtilisateurAdminResponse[] {
    return this.users.filter(
      user =>
        this.resolveUserDepartment(user) ===
        step.departementCode,
    );
  }

  // =====================================================
  // SAVE
  // =====================================================

  save(): void {
    if (!this.canEditStructure) {
      return;
    }
    if (this.loading || this.saving) {
      return;
    }

    this.pageError = '';
    this.successMessage = '';

    if (!this.steps.length) {
      this.pageError =
        'Ajoutez au moins une étape au workflow.';
      return;
    }

    this.recalculateOrders();

    const missing = this.requiredBusinessCodes.filter(
      code =>
        !this.steps.some(
          step => step.codeEtape === code,
        ),
    );

    if (missing.length > 0) {
      this.pageError =
        'Le workflow doit contenir les 4 étapes métier obligatoires : ' +
        missing.join(', ') +
        '.';
      return;
    }

    const duplicateCodes = this.findDuplicateCodes();
    if (duplicateCodes.length > 0) {
      this.pageError =
        'Codes d’étape dupliqués : ' +
        duplicateCodes.join(', ') +
        '.';
      return;
    }

    for (const step of this.steps) {
      step.codeEtape = this.isBusinessStep(step)
        ? step.codeEtape
        : this.normalizeCustomCode(step.codeEtape);

      if (!step.codeEtape) {
        this.pageError =
          `Code obligatoire pour l'étape ${step.ordre}.`;
        return;
      }

      if (!String(step.libelleEtape || '').trim()) {
        this.pageError =
          `Libellé obligatoire pour l'étape ${step.ordre}.`;
        return;
      }

      if (!step.utilisateurDefautId) {
        this.pageError =
          `Choisissez un responsable pour l'étape ${step.ordre}.`;
        return;
      }

      const selected = this.users.find(
        user =>
          Number(user.id) ===
          Number(step.utilisateurDefautId),
      );

      if (!selected) {
        this.pageError =
          `Utilisateur introuvable pour l'étape ${step.ordre}.`;
        return;
      }

      if (
        this.resolveUserDepartment(selected) !==
        step.departementCode
      ) {
        this.pageError =
          `Le responsable de « ${step.libelleEtape} » doit appartenir au département ${this.departmentLabel(step.departementCode)}.`;
        return;
      }
    }

    this.saving = true;

    this.modeleService
      .saveModele({
        etapes: this.steps.map(step => ({
          codeEtape: step.codeEtape,
          libelleEtape: String(
            step.libelleEtape,
          ).trim(),
          ordre: step.ordre,
          departementCode: step.departementCode,
          utilisateurDefautId: Number(
            step.utilisateurDefautId,
          ),
        })),
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: model => {
          this.steps = this.mapModelToForm(
            model || [],
          );

          this.successMessage =
            'Workflow global enregistré. Les nouvelles candidatures utiliseront cette structure.';
        },

        error: error => {
          console.error(
            'ERROR SAVE DYNAMIC WORKFLOW',
            error,
          );

          this.pageError = this.extractError(
            error,
            "Impossible d'enregistrer le workflow global.",
          );
        },
      });
  }

  // =====================================================
  // BACKFILL
  // =====================================================

  initializeExistingWithoutWorkflow(): void {
    if (!this.canEditStructure) {
      return;
    }
    if (
      this.backfilling ||
      this.rebuilding ||
      this.saving
    ) {
      return;
    }

    const confirmed = window.confirm(
      'Créer le workflow actuel pour les candidatures déjà soumises qui ne possèdent encore aucun workflow ?',
    );

    if (!confirmed) {
      return;
    }

    this.backfilling = true;
    this.pageError = '';
    this.successMessage = '';

    this.modeleService
      .initializeSubmittedWithoutWorkflow()
      .pipe(
        finalize(() => {
          this.backfilling = false;
        }),
      )
      .subscribe({
        next: response => {
          this.successMessage =
            `${response?.nombreInitialise || 0} dossier(s) initialisé(s).`;
        },
        error: error => {
          this.pageError = this.extractError(
            error,
            "Impossible d'initialiser les dossiers existants.",
          );
        },
      });
  }

  rebuildUnstartedLegacy(): void {
    if (!this.canEditStructure) {
      return;
    }
    if (
      this.rebuilding ||
      this.backfilling ||
      this.saving
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Reconstruire tous les circuits soumis qui n'ont jamais démarré avec le modèle global actuel ? Les circuits déjà commencés ne seront pas touchés.",
    );

    if (!confirmed) {
      return;
    }

    this.rebuilding = true;
    this.pageError = '';
    this.successMessage = '';

    this.modeleService
      .rebuildUnstartedLegacyWorkflows()
      .pipe(
        finalize(() => {
          this.rebuilding = false;
        }),
      )
      .subscribe({
        next: response => {
          this.successMessage =
            `${response?.nombreReconstruit || 0} circuit(s) non démarré(s) reconstruit(s).`;
        },
        error: error => {
          this.pageError = this.extractError(
            error,
            'Impossible de reconstruire les anciens circuits.',
          );
        },
      });
  }

  // =====================================================
  // UI HELPERS
  // =====================================================

  departmentLabel(department: string): string {
    switch (this.normalizeDepartment(department)) {
      case 'ACHAT':
        return 'Achat';
      case 'TECHNIQUE':
        return 'Technique';
      case 'COMITE':
        return 'Comité';
      case 'IT':
        return 'IT';
      default:
        return department || '-';
    }
  }

  stepIcon(step: WorkflowStepForm): string {
    switch (step.codeEtape) {
      case 'RECEVABILITE_ADMINISTRATIVE':
        return 'ti ti-file-check';
      case 'EVALUATION_TECHNIQUE':
        return 'ti ti-list-check';
      case 'DECISION_FINALE':
        return 'ti ti-gavel';
      case 'CLASSEMENT_ZONE':
        return 'ti ti-map-pin-check';
      default:
        return 'ti ti-route';
    }
  }

  trackByUid(
    _index: number,
    step: WorkflowStepForm,
  ): string {
    return step.uid;
  }

  trackByUserId(
    _index: number,
    user: UtilisateurAdminResponse,
  ): number | string {
    return user.id ?? _index;
  }

  // =====================================================
  // MODEL -> FORM
  // =====================================================

  private mapModelToForm(
    model: WorkflowModeleEtape[],
  ): WorkflowStepForm[] {
    return (model || [])
      .slice()
      .sort(
        (a, b) =>
          Number(a.ordre || 0) -
          Number(b.ordre || 0),
      )
      .map((item, index) => ({
        uid: this.newUid(),
        id: item.id ?? null,
        typeEtape: this.resolveStepType(
          item.codeEtape,
        ),
        codeEtape: String(
          item.codeEtape || '',
        )
          .trim()
          .toUpperCase(),
        libelleEtape: String(
          item.libelleEtape || '',
        ),
        ordre: Number(
          item.ordre ?? index + 1,
        ),
        departementCode:
          this.normalizeDepartment(
            item.departementCode,
          ) as WorkflowDepartmentCode,
        utilisateurDefautId:
          item.utilisateurDefautId ?? null,
      }));
  }

  private resolveStepType(
    code?: string | null,
  ): StepType {
    const normalized = String(code || '')
      .trim()
      .toUpperCase();

    switch (normalized) {
      case 'RECEVABILITE_ADMINISTRATIVE':
      case 'EVALUATION_TECHNIQUE':
      case 'DECISION_FINALE':
      case 'CLASSEMENT_ZONE':
        return normalized;
      default:
        return 'GENERIC';
    }
  }

  private createGenericStep(): WorkflowStepForm {
    return {
      uid: this.newUid(),
      id: null,
      typeEtape: 'GENERIC',
      codeEtape: this.generateGenericCode(),
      libelleEtape: 'Nouvelle étape',
      ordre: this.steps.length + 1,
      departementCode: 'ACHAT',
      utilisateurDefautId: null,
    };
  }

  private isBusinessCode(code: string): boolean {
    return this.requiredBusinessCodes.includes(
      String(code || '')
        .trim()
        .toUpperCase(),
    );
  }

  private normalizeCustomCode(
    value?: string | null,
  ): string {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
  }

  private generateGenericCode(): string {
    this.sequence++;
    return `ETAPE_LIBRE_${Date.now()}_${this.sequence}`;
  }

  private newUid(): string {
    this.sequence++;
    return `wf_${Date.now()}_${this.sequence}`;
  }

  private findDuplicateCodes(): string[] {
    const counts = new Map<string, number>();

    for (const step of this.steps) {
      const code = this.isBusinessStep(step)
        ? step.codeEtape
        : this.normalizeCustomCode(step.codeEtape);

      counts.set(
        code,
        (counts.get(code) || 0) + 1,
      );
    }

    return [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([code]) => code);
  }

  // =====================================================
  // USER HELPERS
  // =====================================================

  private normalizeDepartment(
    value?: string | null,
  ): string {
    return String(value || '')
      .trim()
      .toUpperCase();
  }

  private resolveUserDepartment(
    user: UtilisateurAdminResponse,
  ): string {
    if (!user) {
      return '';
    }

    const type = this.normalizeDepartment(
      user.typeUtilisateur,
    );

    if (
      [
        'IT',
        'ACHAT',
        'TECHNIQUE',
        'COMITE',
      ].includes(type)
    ) {
      return type;
    }

    const raw = user as any;
    const role = String(
      raw?.roleCode ||
      raw?.codeRole ||
      raw?.role ||
      '',
    )
      .trim()
      .toUpperCase();

    switch (role) {
      case 'GESTIONNAIRE':
      case 'ACHATS_CONSULTATION':
      case 'ACHAT':
        return 'ACHAT';

      case 'EVALUATEUR':
      case 'TECHNIQUE':
        return 'TECHNIQUE';

      case 'DECIDEUR':
      case 'COMITE':
        return 'COMITE';

      case 'ADMIN':
        return type === 'ADMIN'
          ? 'IT'
          : type;

      default:
        return '';
    }
  }

  private isUserActive(
    user: UtilisateurAdminResponse,
  ): boolean {
    if (!user) {
      return false;
    }

    const raw = user as any;
    const actif = raw?.actif;

    if (actif === false || actif === 0) {
      return false;
    }

    const normalized = String(actif ?? '')
      .trim()
      .toUpperCase();

    return ![
      'FALSE',
      '0',
      'NON',
      'NO',
      'INACTIF',
      'INACTIVE',
      'DESACTIVE',
      'DÉSACTIVÉ',
      'DISABLED',
    ].includes(normalized);
  }

  private getCurrentRoleCode(): string {
    const identity = this.readIdentity();

    return String(
      identity?.roleCode ??
      identity?.codeRole ??
      localStorage.getItem('roleCode') ??
      localStorage.getItem('userRoleCode') ??
      localStorage.getItem('userRole') ??
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

  private readIdentity(): any {
    for (const key of [
      'connectedUser',
      'currentUser',
      'user',
      'authUser',
    ]) {
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

  private clearMessages(): void {
    this.pageError = '';
    this.successMessage = '';
  }

  private extractError(
    error: any,
    fallback: string,
  ): string {
    return (
      error?.error?.message ||
      error?.error?.detail ||
      error?.error?.error ||
      error?.message ||
      fallback
    );
  }
}
