import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { catchError, finalize, forkJoin, of, timeout } from "rxjs";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  DashboardActivityResponse,
  DashboardAlertResponse,
  DashboardCommitteeStatsResponse,
  DashboardConfigurationStatsResponse,
  DashboardContextResponse,
  DashboardDecisionResponse,
  DashboardEvaluationStatsResponse,
  DashboardFilters,
  DashboardIntervenantResponse,
  DashboardItStatsResponse,
  DashboardNoteBandResponse,
  DashboardOptionResponse,
  DashboardOverviewResponse,
  DashboardProfile,
  DashboardQuickActionResponse,
  DashboardResponse,
  DashboardService,
  DashboardZoneResponse,
} from "../../../core/services/dashboard.service";

import {
  WorkflowAssignableUser,
  WorkflowElEmarService,
  WorkflowResponse,
  WorkflowStepResponse,
} from "../../../core/services/workflow-el-emar.service";

interface DashboardKpi {
  label: string;
  value: number;
  help: string;
  icon: string;
  tone: "blue" | "green" | "amber" | "red" | "purple" | "navy";
  suffix?: string;
}

interface DashboardMetric {
  label: string;
  value: number;
  tone?: "normal" | "success" | "warning" | "danger";
  suffix?: string;
}

interface StoredIdentity {
  nom?: string | null;
  typeUtilisateur?: string | null;
  roleCode?: string | null;
  roleNom?: string | null;
}

@Component({
  selector: "app-tableau-de-bord",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./tableau-de-bord.html",
  styleUrl: "./tableau-de-bord.scss",
})
export class TableauDeBord implements OnInit {
  loading = false;
  pageError = "";

  profile: DashboardProfile = "TECHNIQUE";
  userName = "Utilisateur";
  roleName = "Utilisateur interne";

  /*
   * Le rôle et le département restent séparés.
   *
   * ADMIN + IT    => admin global.
   * ADMIN + ACHAT => dashboard ACHAT en lecture seule.
   */
  private connectedRoleCode = "";
  private connectedDepartment = "";

  workflowActionMessage = "";
  workflowActionError = "";

  showWorkflowReassignModal = false;
  reassigningWorkflow = false;
  loadingAssignableUsers = false;

  workflowReassignTarget:
    WorkflowStepResponse | null = null;

  workflowReassignUserId:
    number | null = null;

  workflowReassignReason = "";

  workflowReassignConfirmStep = false;

  assignableWorkflowUsers:
    WorkflowAssignableUser[] = [];

  overview: DashboardOverviewResponse = this.initialOverview();
  itStats: DashboardItStatsResponse = this.initialIt();
  configurationStats: DashboardConfigurationStatsResponse =
    this.initialConfiguration();
  evaluationStats: DashboardEvaluationStatsResponse =
    this.initialEvaluation();
  committeeStats: DashboardCommitteeStatsResponse = this.initialCommittee();

  alerts: DashboardAlertResponse[] = [];
  activities: DashboardActivityResponse[] = [];
  quickActions: DashboardQuickActionResponse[] = [];
  intervenants: DashboardIntervenantResponse[] = [];
  decisions: DashboardDecisionResponse[] = [];
  zones: DashboardZoneResponse[] = [];
  noteBands: DashboardNoteBandResponse[] = [];
  typesIntervenant: DashboardOptionResponse[] = [];
  lots: DashboardOptionResponse[] = [];

  // =====================================================
  // WORKFLOW — SUPERVISION ADMIN EN LECTURE SEULE
  // =====================================================

  adminWorkflows: WorkflowResponse[] = [];
  loadingAdminWorkflows = false;
  adminWorkflowError = "";

  filters: DashboardFilters = {
    typeIntervenantId: null,
    lotId: null,
    decision: "ALL",
    search: "",
  };

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly workflowService: WorkflowElEmarService,
  ) {}

  ngOnInit(): void {
    this.applyStoredIdentity(this.readStoredIdentity());
    this.loadDashboard();
  }

  // =====================================================
  // CHARGEMENT
  // =====================================================

  loadDashboard(): void {
    this.loading = true;
    this.pageError = "";

    const filters: DashboardFilters = {
      typeIntervenantId: this.positiveNumber(this.filters.typeIntervenantId),
      lotId: this.positiveNumber(this.filters.lotId),
      decision: String(this.filters.decision || "ALL"),
      search: String(this.filters.search || "").trim(),
    };

    this.dashboardService
      .getDashboard(filters)
      .pipe(
        timeout(20000),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (response: DashboardResponse) => this.applyDashboard(response),
        error: (error: any) => this.handleLoadError(error),
      });
  }

  private applyDashboard(response: DashboardResponse): void {
    this.applyServerContext(response.context);

    this.overview = response.overview || this.initialOverview();
    this.itStats = response.it || this.initialIt();
    this.configurationStats =
      response.configuration || this.initialConfiguration();
    this.evaluationStats = response.evaluation || this.initialEvaluation();
    this.committeeStats = response.committee || this.initialCommittee();

    this.alerts =
      this.filterAlertsForProfile(
        response.alerts || []
      );

    this.activities =
      response.activities || [];

    this.quickActions =
      this.filterQuickActions(
        response.quickActions || []
      );
    this.intervenants = response.intervenants || [];
    this.decisions = response.decisions || [];
    this.zones = response.zones || [];
    this.noteBands = response.noteBands || [];
    this.typesIntervenant = response.typesIntervenant || [];
    this.lots = response.lots || [];

    /*
     * ADMIN + IT et ADMIN + ACHAT voient
     * tous les workflows.
     *
     * ADMIN + ACHAT peut uniquement changer
     * le responsable d'une étape.
     */
    if (this.canSuperviseWorkflow) {
      this.loadAdminWorkflows();
    } else {
      this.adminWorkflows = [];
      this.adminWorkflowError = "";
      this.loadingAdminWorkflows = false;
    }
  }

  private handleLoadError(error: any): void {
    console.error("ERROR LOAD DASHBOARD", error);

    if (error?.status === 401) {
      this.pageError = "Votre session a expiré. Reconnectez-vous.";
      return;
    }

    if (error?.status === 403) {
      this.pageError =
        "Votre profil ne possède pas l’autorisation d’ouvrir ce tableau de bord.";
      return;
    }

    if (error?.status === 404) {
      this.pageError =
        "La route du tableau de bord n’est pas enregistrée dans le backend.";
      return;
    }

    this.pageError =
      error?.error?.message ||
      error?.error?.detail ||
      (error?.name === "TimeoutError"
        ? "Le serveur ne répond pas."
        : "Impossible de charger le tableau de bord.");
  }

  // =====================================================
  // WORKFLOW — SUPERVISION ADMIN
  // =====================================================

  private loadAdminWorkflows(): void {
    if (!this.canSuperviseWorkflow) {
      this.adminWorkflows = [];
      this.adminWorkflowError = "";
      this.loadingAdminWorkflows = false;
      return;
    }

    /*
     * Le dashboard contient déjà les candidatures du périmètre.
     * On déduplique les candidatureId puis on récupère
     * le workflow complet de chaque dossier.
     */
    const candidatureIds = Array.from(
      new Set(
        (this.intervenants || [])
          .map((item) => Number(item.candidatureId))
          .filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0,
          ),
      ),
    );

    if (candidatureIds.length === 0) {
      this.adminWorkflows = [];
      this.adminWorkflowError = "";
      this.loadingAdminWorkflows = false;
      return;
    }

    this.loadingAdminWorkflows = true;
    this.adminWorkflowError = "";

    forkJoin(
      candidatureIds.map((candidatureId) =>
        this.workflowService
          .getWorkflow(candidatureId)
          .pipe(
            catchError((error) => {
              /*
               * Un dossier sans workflow initialisé ou non accessible
               * ne doit pas bloquer toute la supervision.
               */
              console.error(
                "ERROR LOAD ADMIN WORKFLOW",
                candidatureId,
                error,
              );

              return of(null);
            }),
          ),
      ),
    )
      .pipe(
        finalize(() => {
          this.loadingAdminWorkflows = false;
        }),
      )
      .subscribe({
        next: (workflows) => {
          this.adminWorkflows = workflows
            .filter(
              (
                workflow,
              ): workflow is WorkflowResponse =>
                workflow !== null &&
                workflow.workflowInitialise === true,
            )
            .sort((a, b) =>
              String(a.raisonSociale || "")
                .localeCompare(
                  String(b.raisonSociale || ""),
                  "fr",
                  {
                    sensitivity: "base",
                  },
                ),
            );
        },

        error: (error) => {
          console.error(
            "ERROR LOAD ADMIN WORKFLOWS",
            error,
          );

          this.adminWorkflows = [];
          this.adminWorkflowError =
            "Impossible de charger la supervision des workflows.";
        },
      });
  }

  getWorkflowStatusLabel(
    status?: string | null,
  ): string {
    switch (
      String(status || "")
        .trim()
        .toUpperCase()
    ) {
      case "EN_ATTENTE":
        return "En attente";

      case "A_TRAITER":
        return "À traiter";

      case "EN_COURS":
        return "En cours";

      case "TERMINEE":
        return "Terminée";

      case "REOUVERTE":
        return "Réouverte";

      case "ANNULEE":
        return "Annulée";

      default:
        return status || "—";
    }
  }

  getWorkflowStatusClass(
    status?: string | null,
  ): string {
    switch (
      String(status || "")
        .trim()
        .toUpperCase()
    ) {
      case "TERMINEE":
        return "status-success";

      case "EN_COURS":
        return "status-info";

      case "A_TRAITER":
      case "EN_ATTENTE":
        return "status-neutral";

      case "REOUVERTE":
        return "status-warning";

      case "ANNULEE":
        return "status-danger";

      default:
        return "status-neutral";
    }
  }

  trackByWorkflowCandidature(
    index: number,
    workflow: WorkflowResponse,
  ): number {
    return Number(
      workflow.candidatureId || index,
    );
  }

  trackByWorkflowStep(
    index: number,
    step: WorkflowStepResponse,
  ): number {
    return Number(step.id || index);
  }

  // =====================================================
  // WORKFLOW — CHANGEMENT DE RESPONSABLE
  // =====================================================

  get canSuperviseWorkflow(): boolean {
    return (
      this.isAdminIt
      ||
      this.isAdminAchat
    );
  }


  canReassignWorkflowStep(
    step: WorkflowStepResponse
  ): boolean {

    if (!this.canSuperviseWorkflow) {
      return false;
    }

    const status =
      String(step?.statut || '')
        .trim()
        .toUpperCase();

    return (
      status !== 'TERMINEE'
      &&
      status !== 'ANNULEE'
    );
  }


  openWorkflowReassign(
    step: WorkflowStepResponse
  ): void {

    if (
      !this.canReassignWorkflowStep(step)
    ) {
      return;
    }

    this.workflowActionError = '';
    this.workflowActionMessage = '';

    this.workflowReassignTarget =
      step;

    this.workflowReassignUserId =
      step.utilisateurAffecteId;

    this.workflowReassignReason = '';
    this.workflowReassignConfirmStep = false;
    this.assignableWorkflowUsers = [];
    this.showWorkflowReassignModal = true;
    this.loadingAssignableUsers = true;

    this.workflowService
      .getAssignableUsers(step.id)
      .pipe(
        finalize(() => {
          this.loadingAssignableUsers =
            false;
        }),
      )
      .subscribe({
        next: users => {

          this.assignableWorkflowUsers =
            (users || [])
              .slice()
              .sort(
                (a, b) =>
                  String(a.nom || '')
                    .localeCompare(
                      String(b.nom || ''),
                      'fr',
                      {
                        sensitivity:
                          'base',
                      },
                    ),
              );
        },

        error: error => {

          console.error(
            'ERROR LOAD WORKFLOW ASSIGNABLE USERS',
            error,
          );

          this.workflowActionError =
            this.extractHttpError(
              error,
              'Impossible de charger les utilisateurs affectables.',
            );
        },
      });
  }


  closeWorkflowReassign(): void {

    if (this.reassigningWorkflow) {
      return;
    }

    this.showWorkflowReassignModal =
      false;

    this.workflowReassignTarget =
      null;

    this.workflowReassignUserId =
      null;

    this.workflowReassignReason = '';
    this.workflowReassignConfirmStep = false;

    this.assignableWorkflowUsers = [];
  }


  selectWorkflowUser(
    user: WorkflowAssignableUser
  ): void {

    if (
      this.loadingAssignableUsers
      ||
      this.reassigningWorkflow
    ) {
      return;
    }

    this.workflowReassignUserId =
      Number(user.id);

    this.workflowActionError = '';
  }


  get selectedWorkflowUser():
    WorkflowAssignableUser | null {

    if (!this.workflowReassignUserId) {
      return null;
    }

    return (
      this.assignableWorkflowUsers.find(
        user =>
          Number(user.id)
          ===
          Number(
            this.workflowReassignUserId
          )
      )
      ||
      null
    );
  }


  continueWorkflowReassign(): void {

    if (!this.workflowReassignUserId) {
      this.workflowActionError =
        'Choisissez le nouveau responsable.';
      return;
    }

    if (
      Number(
        this.workflowReassignTarget
          ?.utilisateurAffecteId
      )
      ===
      Number(
        this.workflowReassignUserId
      )
    ) {
      this.workflowActionError =
        'Choisissez un utilisateur différent du responsable actuel.';
      return;
    }

    this.workflowActionError = '';
    this.workflowReassignConfirmStep = true;
  }


  backWorkflowReassign(): void {

    if (this.reassigningWorkflow) {
      return;
    }

    this.workflowActionError = '';
    this.workflowReassignConfirmStep = false;
  }


  confirmWorkflowReassign(): void {

    if (
      !this.workflowReassignTarget
      ||
      !this.workflowReassignUserId
    ) {

      this.workflowActionError =
        'Choisissez le nouvel utilisateur.';

      return;
    }

    this.reassigningWorkflow = true;
    this.workflowActionError = '';
    this.workflowActionMessage = '';

    this.workflowService
      .reassignStep(
        this.workflowReassignTarget.id,
        {
          nouvelUtilisateurId:
            Number(
              this.workflowReassignUserId
            ),

          motif: null,
        },
      )
      .pipe(
        finalize(() => {
          this.reassigningWorkflow =
            false;
        }),
      )
      .subscribe({
        next: () => {

          /*
           * next() est appelé avant finalize().
           * On remet donc explicitement saving à false
           * avant de fermer la modale.
           */
          this.reassigningWorkflow =
            false;

          this.closeWorkflowReassign();

          this.workflowActionMessage =
            'Le responsable de l’étape a été changé.';

          this.loadAdminWorkflows();
        },

        error: error => {

          console.error(
            'ERROR REASSIGN WORKFLOW STEP',
            error,
          );

          this.workflowActionError =
            this.extractHttpError(
              error,
              'Impossible de changer le responsable.',
            );
        },
      });
  }


  trackByAssignableUser(
    index: number,
    user: WorkflowAssignableUser
  ): number {

    return Number(
      user.id || index
    );
  }


  // =====================================================
  // PROFIL
  // =====================================================

  get isAdmin(): boolean {
    return this.isAdminIt;
  }


  get isAdminIt(): boolean {

    return (
      this.connectedRoleCode === "ADMIN"
      &&
      this.connectedDepartment === "IT"
    );
  }


  get isAdminAchat(): boolean {

    return (
      this.connectedRoleCode === "ADMIN"
      &&
      this.connectedDepartment === "ACHAT"
    );
  }

  get showFilters(): boolean {
    return this.profile !== "IT";
  }

  get showDecisionFilter(): boolean {
    return this.profile === "ADMIN" || this.profile === "COMITE";
  }

  get showIntervenantTable(): boolean {
    return this.profile !== "IT";
  }

  get profileLabel(): string {

    if (this.isAdminAchat) {
      return "Administration Achat";
    }

    const labels: Record<DashboardProfile, string> = {
      ADMIN: "Administration générale",
      IT: "Système d’information",
      ACHAT: "Configuration et référentiels",
      TECHNIQUE: "Évaluation technique",
      COMITE: "Décision et classement",
    };

    return labels[this.profile];
  }

  get pageEyebrow(): string {
    return this.profileLabel;
  }

  get pageTitle(): string {

    if (this.isAdminAchat) {
      return "Supervision Achat";
    }

    const titles: Record<DashboardProfile, string> = {
      ADMIN: "Vue de supervision",
      IT: "Comptes et accès",
      ACHAT: "Configuration de la qualification",
      TECHNIQUE: "Mes évaluations",
      COMITE: "Décisions et classements",
    };

    return titles[this.profile];
  }

  get pageSubtitle(): string {

    if (this.isAdminAchat) {
      return (
        "Consultez les configurations métier et les dossiers. "
        +
        "La seule modification autorisée est le changement "
        +
        "du responsable d'une étape workflow."
      );
    }

    const subtitles: Record<DashboardProfile, string> = {
      ADMIN:
        "Synthèse des intervenants actifs, des évaluations, des décisions et de la configuration.",
      IT: "Suivez uniquement les comptes actifs, les rôles et les modules autorisés.",
      ACHAT:
        "Contrôlez les types, domaines, catégories, grilles et critères actifs.",
      TECHNIQUE:
        "Retrouvez les dossiers affectés, les contrôles à réaliser et l’avancement de vos évaluations.",
      COMITE:
        "Traitez les décisions en attente et complétez le classement des intervenants admis.",
    };

    return subtitles[this.profile];
  }

  get sectionTitle(): string {
    const titles: Record<DashboardProfile, string> = {
      ADMIN: "Situation globale",
      IT: "État des accès",
      ACHAT: "Qualité de la configuration",
      TECHNIQUE: "Avancement du traitement",
      COMITE: "État des décisions",
    };

    return titles[this.profile];
  }


  get summaryIcon(): string {
    const icons: Record<DashboardProfile, string> = {
      ADMIN: "ti ti-chart-dots",
      IT: "ti ti-shield-lock",
      ACHAT: "ti ti-settings-check",
      TECHNIQUE: "ti ti-clipboard-check",
      COMITE: "ti ti-gavel",
    };

    return icons[this.profile];
  }
  get sectionDescription(): string {
    const descriptions: Record<DashboardProfile, string> = {
      ADMIN: "Indicateurs calculés uniquement sur les données actives.",
      IT: "Vue centrée sur les comptes autorisés et les accès disponibles.",
      ACHAT: "Vue centrée sur le référentiel actuellement utilisé pour la qualification.",
      TECHNIQUE: "Le périmètre est limité aux dossiers qui vous sont affectés.",
      COMITE: "Le périmètre est limité aux dossiers affectés à votre profil.",
    };

    return descriptions[this.profile];
  }

  // =====================================================
  // FILTRES
  // =====================================================

  onTypeChange(value: number | null): void {
    this.filters.typeIntervenantId = this.positiveNumber(value);
    this.filters.lotId = null;
    this.loadDashboard();
  }

  onLotChange(value: number | null): void {
    this.filters.lotId = this.positiveNumber(value);
  }

  applyFilters(): void {
    this.loadDashboard();
  }

  resetFilters(): void {
    this.filters = {
      typeIntervenantId: null,
      lotId: null,
      decision: "ALL",
      search: "",
    };

    this.loadDashboard();
  }

  // =====================================================
  // KPI PAR PROFIL
  // =====================================================

  getKpis(): DashboardKpi[] {
    if (this.profile === "IT") {
      return [
        this.kpi(
          "Utilisateurs actifs",
          this.itStats.utilisateursActifs,
          "Comptes internes autorisés",
          "ti ti-users",
          "blue",
        ),
        this.kpi(
          "Rôles actifs",
          this.itStats.rolesActifs,
          "Profils d’accès disponibles",
          "ti ti-shield-check",
          "navy",
        ),
        this.kpi(
          "Modules actifs",
          this.itStats.modulesActifs,
          "Fonctions disponibles",
          "ti ti-layout-grid",
          "purple",
        ),
        this.kpi(
          "Sans rôle",
          this.itStats.utilisateursSansRole,
          "Comptes actifs à configurer",
          "ti ti-user-question",
          this.itStats.utilisateursSansRole > 0 ? "red" : "green",
        ),
        this.kpi(
          "Rôles sans accès",
          this.itStats.rolesSansAcces,
          "Rôles actifs sans module",
          "ti ti-lock-question",
          this.itStats.rolesSansAcces > 0 ? "amber" : "green",
        ),
      ];
    }

    if (this.profile === "ACHAT") {
      return [
        this.kpi(
          "Types actifs",
          this.configurationStats.typesActifs,
          "Familles d’intervenants",
          "ti ti-category-2",
          "blue",
        ),
        this.kpi(
          "Domaines actifs",
          this.configurationStats.lotsActifs,
          "Domaines d’intervention",
          "ti ti-briefcase",
          "navy",
        ),
        this.kpi(
          "Grilles actives",
          this.configurationStats.grillesActives,
          "Grilles disponibles",
          "ti ti-list-check",
          "purple",
        ),
        this.kpi(
          "Critères actifs",
          this.configurationStats.criteresActifs,
          "Critères utilisés",
          "ti ti-checklist",
          "green",
        ),
        this.kpi(
          "Corrections",
          this.configurationIssueCount,
          "Paramétrages à compléter",
          "ti ti-alert-triangle",
          this.configurationIssueCount > 0 ? "amber" : "green",
        ),
      ];
    }

    if (this.profile === "TECHNIQUE") {
      return [
        this.kpi(
          "Dossiers affectés",
          this.evaluationStats.dossiersAffectes,
          "Votre périmètre actif",
          "ti ti-folders",
          "blue",
        ),
        this.kpi(
          "À commencer",
          this.evaluationStats.evaluationsACommencer,
          "Évaluations non démarrées",
          "ti ti-player-play",
          "amber",
        ),
        this.kpi(
          "En cours",
          this.evaluationStats.evaluationsEnCours,
          "Évaluations ouvertes",
          "ti ti-progress-check",
          "navy",
        ),
        this.kpi(
          "Terminées",
          this.evaluationStats.evaluationsTerminees,
          "Évaluations finalisées",
          "ti ti-circle-check",
          "green",
        ),
        this.kpi(
          "Critères à vérifier",
          this.evaluationStats.criteresAVerifier,
          "Réponses en attente",
          "ti ti-clipboard-search",
          this.evaluationStats.criteresAVerifier > 0 ? "red" : "green",
        ),
      ];
    }

    if (this.profile === "COMITE") {
      return [
        this.kpi(
          "Dossiers évalués",
          this.committeeStats.dossiersEvalues,
          "Dossiers prêts pour décision",
          "ti ti-clipboard-check",
          "blue",
        ),
        this.kpi(
          "Décisions en attente",
          this.committeeStats.decisionsEnAttente,
          "Dossiers à statuer",
          "ti ti-gavel",
          this.committeeStats.decisionsEnAttente > 0 ? "amber" : "green",
        ),
        this.kpi(
          "Admis",
          this.committeeStats.admis,
          "Décisions favorables",
          "ti ti-circle-check",
          "green",
        ),
        this.kpi(
          "Classés",
          this.committeeStats.dossiersClasses,
          "Intervenants admis classés",
          "ti ti-map-check",
          "purple",
        ),
        this.kpi(
          "Classements en attente",
          this.committeeStats.classementsEnAttente,
          "Admis sans classement",
          "ti ti-map-question",
          this.committeeStats.classementsEnAttente > 0 ? "red" : "green",
        ),
      ];
    }

    return [
      this.kpi(
        "Intervenants actifs",
        this.overview.intervenantsActifs,
        "Intervenants pris en compte",
        "ti ti-building-community",
        "blue",
      ),
      this.kpi(
        "Dossiers actifs",
        this.overview.dossiersActifs,
        "Dossiers suivis",
        "ti ti-folders",
        "navy",
      ),
      this.kpi(
        "Évaluations en cours",
        this.overview.evaluationsEnCours,
        "Traitements ouverts",
        "ti ti-progress",
        "purple",
      ),
      this.kpi(
        "Décisions en attente",
        this.overview.decisionsEnAttente,
        "Dossiers à statuer",
        "ti ti-gavel",
        "amber",
      ),
      this.kpi(
        "Classements en attente",
        this.overview.classementsEnAttente,
        "Admis sans zone",
        "ti ti-map-pin-question",
        this.overview.classementsEnAttente > 0 ? "red" : "green",
      ),
    ];
  }

  getProfileMetrics(): DashboardMetric[] {
    if (this.profile === "IT") {
      return [
        this.metric("Utilisateurs actifs", this.itStats.utilisateursActifs),
        this.metric("Rôles actifs", this.itStats.rolesActifs),
        this.metric("Modules actifs", this.itStats.modulesActifs),
        this.metric(
          "Comptes sans rôle",
          this.itStats.utilisateursSansRole,
          this.itStats.utilisateursSansRole > 0 ? "danger" : "success",
        ),
        this.metric(
          "Rôles sans module",
          this.itStats.rolesSansAcces,
          this.itStats.rolesSansAcces > 0 ? "warning" : "success",
        ),
      ];
    }

    if (this.profile === "ACHAT") {
      return [
        this.metric("Catégories actives", this.configurationStats.categoriesActives),
        this.metric(
          "Domaines sans grille",
          this.configurationStats.lotsSansGrille,
          this.configurationStats.lotsSansGrille > 0 ? "danger" : "success",
        ),
        this.metric(
          "Grilles sans critère",
          this.configurationStats.grillesSansCritere,
          this.configurationStats.grillesSansCritere > 0
            ? "danger"
            : "success",
        ),
        this.metric(
          "Totaux à corriger",
          this.configurationStats.grillesTotalInvalide,
          this.configurationStats.grillesTotalInvalide > 0
            ? "warning"
            : "success",
        ),
        this.metric(
          "Critères sans catégorie",
          this.configurationStats.criteresSansCategorie,
          this.configurationStats.criteresSansCategorie > 0
            ? "warning"
            : "success",
        ),
      ];
    }

    if (this.profile === "TECHNIQUE") {
      return [
        this.metric("À commencer", this.evaluationStats.evaluationsACommencer),
        this.metric("En cours", this.evaluationStats.evaluationsEnCours),
        this.metric("Terminées", this.evaluationStats.evaluationsTerminees),
        this.metric(
          "Réouvertes",
          this.evaluationStats.evaluationsReouvertes,
          this.evaluationStats.evaluationsReouvertes > 0
            ? "warning"
            : "success",
        ),
        this.metric(
          "Note moyenne",
          this.evaluationStats.noteMoyenne,
          "normal",
          "/100",
        ),
      ];
    }

    if (this.profile === "COMITE") {
      return [
        this.metric("Admis", this.committeeStats.admis, "success"),
        this.metric("Rejetés", this.committeeStats.rejetes),
        this.metric("À corriger", this.committeeStats.aCorriger, "warning"),
        this.metric(
          "Décisions en attente",
          this.committeeStats.decisionsEnAttente,
          this.committeeStats.decisionsEnAttente > 0 ? "warning" : "success",
        ),
        this.metric(
          "Classements en attente",
          this.committeeStats.classementsEnAttente,
          this.committeeStats.classementsEnAttente > 0
            ? "danger"
            : "success",
        ),
      ];
    }

    return [
      this.metric("Utilisateurs actifs", this.itStats.utilisateursActifs),
      this.metric("Domaines actifs", this.configurationStats.lotsActifs),
      this.metric("Critères actifs", this.configurationStats.criteresActifs),
      this.metric("Dossiers évalués", this.committeeStats.dossiersEvalues),
      this.metric("Note moyenne", this.overview.noteMoyenne, "normal", "/100"),
    ];
  }

  private kpi(
    label: string,
    value: number,
    help: string,
    icon: string,
    tone: DashboardKpi["tone"],
    suffix = "",
  ): DashboardKpi {
    return { label, value: Number(value || 0), help, icon, tone, suffix };
  }

  private metric(
    label: string,
    value: number,
    tone: DashboardMetric["tone"] = "normal",
    suffix = "",
  ): DashboardMetric {
    return { label, value: Number(value || 0), tone, suffix };
  }

  get configurationIssueCount(): number {
    return (
      this.configurationStats.lotsSansGrille +
      this.configurationStats.grillesSansCritere +
      this.configurationStats.grillesTotalInvalide +
      this.configurationStats.criteresSansCategorie
    );
  }

  get configurationHealth(): number {
    const total = this.configurationStats.grillesActives;
    if (total <= 0) {
      return 0;
    }

    const invalid =
      this.configurationStats.grillesSansCritere +
      this.configurationStats.grillesTotalInvalide;

    return this.percent(Math.max(0, total - invalid), total);
  }

  get evaluationProgress(): number {
    return this.percent(
      this.evaluationStats.evaluationsTerminees,
      this.evaluationStats.dossiersAffectes,
    );
  }

  get conformityRate(): number {
    const total =
      this.evaluationStats.criteresConformes +
      this.evaluationStats.criteresNonConformes;

    return this.percent(this.evaluationStats.criteresConformes, total);
  }

  // =====================================================
  // RÉPARTITIONS
  // =====================================================

  getDecisionTotal(): number {
    return this.decisions.reduce(
      (total, item) => total + Number(item.count || 0),
      0,
    );
  }

  getDecisionPercent(code: string): number {
    const total = this.getDecisionTotal();
    const item = this.decisions.find(
      (decision) => String(decision.code).toUpperCase() === code,
    );

    return this.percent(Number(item?.count || 0), total);
  }

  getDecisionPieStyle(): string {
    const admis = this.getDecisionPercent("ADMIS") * 3.6;
    const pending = this.getDecisionPercent("EN_ATTENTE") * 3.6;
    const correction = this.getDecisionPercent("A_CORRIGER") * 3.6;
    const rejected = this.getDecisionPercent("REJETE") * 3.6;

    const p1 = admis;
    const p2 = p1 + pending;
    const p3 = p2 + correction;
    const p4 = p3 + rejected;

    if (this.getDecisionTotal() <= 0) {
      return "conic-gradient(#edf0f5 0deg 360deg)";
    }

    return `conic-gradient(
      #2f9d78 0deg ${p1}deg,
      #4f6ecf ${p1}deg ${p2}deg,
      #d89b3c ${p2}deg ${p3}deg,
      #d85c66 ${p3}deg ${p4}deg,
      #edf0f5 ${p4}deg 360deg
    )`;
  }

  getNoteBandPercent(code: string): number {
    const total = this.noteBands.reduce(
      (sum, item) => sum + Number(item.count || 0),
      0,
    );
    const value = this.noteBands.find((item) => item.code === code)?.count || 0;
    return this.percent(Number(value), total);
  }

  getZoneWidth(zone: DashboardZoneResponse): number {
    const maximum = Math.max(0, ...this.zones.map((item) => item.count));
    return maximum <= 0 ? 0 : this.percent(zone.count, maximum);
  }

  // =====================================================
  // TABLE INTERVENANTS
  // =====================================================

  get visibleIntervenants(): DashboardIntervenantResponse[] {
    return this.intervenants.slice(0, 15);
  }

  getIntervenantStatus(item: DashboardIntervenantResponse): string {
    if (item.decision === "ADMIS") {
      return item.classement ? `Admis · ${item.classement}` : "Admis";
    }

    if (item.decision === "REJETE" || item.decision === "IRRECEVABLE") {
      return "Rejeté";
    }

    if (item.decision === "A_CORRIGER") {
      return "À corriger";
    }

    const status = String(item.statutEvaluation || "").toUpperCase();

    if (status === "TERMINEE") {
      return "Évalué";
    }

    if (status === "EN_COURS") {
      return "En cours";
    }

    if (status === "SOUMIS") {
      return "Soumis";
    }

    return "À traiter";
  }

  getIntervenantStatusClass(item: DashboardIntervenantResponse): string {
    if (item.decision === "ADMIS") {
      return "status-success";
    }

    if (item.decision === "REJETE" || item.decision === "IRRECEVABLE") {
      return "status-danger";
    }

    if (item.decision === "A_CORRIGER") {
      return "status-warning";
    }

    return String(item.statutEvaluation).toUpperCase() === "EN_COURS"
      ? "status-info"
      : "status-neutral";
  }

  // =====================================================
  // ALERTES ET ACTIVITÉS
  // =====================================================

  getAlertIcon(item: DashboardAlertResponse): string {
    if (item.level === "CRITICAL") {
      return "ti ti-alert-octagon";
    }

    if (item.level === "WARNING") {
      return "ti ti-alert-triangle";
    }

    return "ti ti-info-circle";
  }

  getActivityDate(value?: string | null): string {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // =====================================================
  // EXPORT ADMIN
  // =====================================================

  exportDashboardExcel(): void {
    if (!this.isAdmin) {
      return;
    }

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        this.getKpis().map((item) => ({
          Indicateur: item.label,
          Valeur: `${item.value}${item.suffix || ""}`,
          Description: item.help,
        })),
      ),
      "Synthèse",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        this.intervenants.map((item) => ({
          Intervenant: item.raisonSociale,
          Type: item.typeIntervenantLibelle || "-",
          Domaine: item.lotNom || "-",
          Note: item.score,
          Décision: item.decision || "En attente",
          Zone: item.zoneNom || "-",
          Classement: item.classement || "-",
        })),
      ),
      "Intervenants",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        this.alerts.map((item) => ({
          Niveau: item.level,
          Priorité: item.title,
          Nombre: item.count,
          Description: item.message,
        })),
      ),
      "Priorités",
    );

    XLSX.writeFile(
      workbook,
      `dashboard_el_emar_${this.dateStamp()}.xlsx`,
    );
  }

  exportDashboardPdf(): void {
    if (!this.isAdmin) {
      return;
    }

    const document = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    document.setFont("helvetica", "bold");
    document.setFontSize(17);
    document.text("Tableau de bord El Emar", 14, 16);

    document.setFont("helvetica", "normal");
    document.setFontSize(9);
    document.text(
      `Données actives au ${new Date().toLocaleString("fr-FR")}`,
      14,
      22,
    );

    autoTable(document, {
      startY: 29,
      head: [["Indicateur", "Valeur", "Description"]],
      body: this.getKpis().map((item) => [
        item.label,
        `${item.value}${item.suffix || ""}`,
        item.help,
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.4 },
      headStyles: { fillColor: [29, 45, 104] },
    });

    const startY = (document as any).lastAutoTable?.finalY + 8 || 75;

    autoTable(document, {
      startY,
      head: [["Intervenant", "Type", "Domaine", "Note", "État"]],
      body: this.visibleIntervenants.map((item) => [
        item.raisonSociale,
        item.typeIntervenantLibelle || "-",
        item.lotNom || "-",
        item.applicationCandidatureId ? item.score : "-",
        this.getIntervenantStatus(item),
      ]),
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 2.2 },
      headStyles: { fillColor: [29, 45, 104] },
    });

    document.save(`dashboard_el_emar_${this.dateStamp()}.pdf`);
  }

  // =====================================================
  // IDENTITÉ
  // =====================================================

  private applyServerContext(
    context: DashboardContextResponse
  ): void {

    this.userName =
      String(
        context?.nom || "Utilisateur"
      ).trim();

    this.roleName =
      String(
        context?.roleNom
        ||
        context?.roleCode
        ||
        "Utilisateur interne"
      ).trim();

    this.connectedRoleCode =
      String(
        context?.roleCode || ""
      )
        .trim()
        .toUpperCase();

    this.connectedDepartment =
      this.normalizeDepartment(
        context?.typeUtilisateur
      );

    /*
     * On ne fait PAS confiance à profile=ADMIN
     * seul, car ADMIN + ACHAT doit rester
     * sur le dashboard ACHAT.
     */
    this.profile =
      this.resolveDashboardProfile(
        this.connectedRoleCode,
        this.connectedDepartment
      );
  }

  private applyStoredIdentity(
    identity: StoredIdentity
  ): void {

    this.userName =
      String(
        identity.nom || "Utilisateur"
      ).trim();

    this.roleName =
      String(
        identity.roleNom
        ||
        identity.roleCode
        ||
        "Utilisateur interne"
      ).trim();

    this.connectedRoleCode =
      String(
        identity.roleCode || ""
      )
        .trim()
        .toUpperCase();

    this.connectedDepartment =
      this.normalizeDepartment(
        identity.typeUtilisateur
      );

    this.profile =
      this.resolveDashboardProfile(
        this.connectedRoleCode,
        this.connectedDepartment
      );
  }

  private readStoredIdentity(): StoredIdentity {
    const keys = ["elEmarUser", "connectedUser", "currentUser"];

    for (const key of keys) {
      const raw = localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      try {
        const value = JSON.parse(raw) as StoredIdentity;
        if (value && typeof value === "object") {
          return value;
        }
      } catch {
        // Essayer la clé suivante.
      }
    }

    return {
      nom: localStorage.getItem("userName"),
      typeUtilisateur: localStorage.getItem("userType"),
      roleCode:
        localStorage.getItem("userRoleCode") ||
        localStorage.getItem("userRole"),
      roleNom: localStorage.getItem("userRoleNom"),
    };
  }

  // =====================================================
  // PROFIL ROLE + DÉPARTEMENT
  // =====================================================

  private resolveDashboardProfile(
    role: string,
    department: string
  ): DashboardProfile {

    /*
     * ADMIN global uniquement :
     *
     * ADMIN + IT.
     */
    if (
      role === 'ADMIN'
      &&
      department === 'IT'
    ) {
      return 'ADMIN';
    }

    /*
     * Le département détermine
     * le dashboard métier.
     *
     * ADMIN + ACHAT => ACHAT.
     */
    switch (department) {

      case 'IT':
        return 'IT';

      case 'ACHAT':
        return 'ACHAT';

      case 'TECHNIQUE':
        return 'TECHNIQUE';

      case 'COMITE':
        return 'COMITE';
    }

    /*
     * Compatibilité avec anciens rôles.
     */
    switch (role) {

      case 'GESTIONNAIRE':
      case 'ACHATS_CONSULTATION':
      case 'ACHAT':
      case 'DA':
        return 'ACHAT';

      case 'EVALUATEUR':
      case 'EL_EMAR':
      case 'TECHNIQUE':
        return 'TECHNIQUE';

      case 'DECIDEUR':
      case 'COMITE':
        return 'COMITE';

      case 'IT':
        return 'IT';

      default:
        return 'TECHNIQUE';
    }
  }


  private normalizeDepartment(
    value?: string | null
  ): string {

    const department =
      String(value || '')
        .trim()
        .toUpperCase();

    switch (department) {

      case 'DA':
      case 'ACHATS':
        return 'ACHAT';

      case 'EL_EMAR':
      case 'EVALUATEUR':
        return 'TECHNIQUE';

      case 'DECIDEUR':
        return 'COMITE';

      default:
        return department;
    }
  }


  /**
   * ADMIN + ACHAT ne doit pas voir les raccourcis :
   * - utilisateurs ;
   * - rôles / accès ;
   * - builder structure workflow.
   *
   * Il garde les autres configurations système
   * en consultation.
   */
  private filterQuickActions(
    actions: DashboardQuickActionResponse[]
  ): DashboardQuickActionResponse[] {

    if (!this.isAdminAchat) {
      return actions;
    }

    return actions.filter(
      action => {

        const code =
          String(
            action.moduleCode
            ||
            action.code
            ||
            ''
          )
            .trim()
            .toUpperCase();

        const route =
          String(
            action.route || ''
          )
            .trim()
            .toLowerCase();

        const forbiddenCode =
          code.includes('UTILISATEUR')
          ||
          code.includes('USER')
          ||
          code.includes('ROLE')
          ||
          code.includes('ACCES')
          ||
          code === 'WORKFLOW_CONFIGURATION'
          ||
          code === 'WORKFLOW_CONFIGURER';

        const forbiddenRoute =
          route === '/el-emar/admin'
          ||
          route.includes(
            '/el-emar/adminprofile'
          )
          ||
          route.includes(
            '/el-emar/roles-acces'
          )
          ||
          route.includes(
            '/el-emar/workflow-configuration'
          );

        return !(
          forbiddenCode
          ||
          forbiddenRoute
        );
      }
    );
  }


  /**
   * Le backend peut encore renvoyer les alertes
   * globales du rôle ADMIN.
   *
   * Pour ADMIN + ACHAT, on retire uniquement
   * les alertes de gestion IT utilisateurs/rôles.
   */
  private filterAlertsForProfile(
    values: DashboardAlertResponse[]
  ): DashboardAlertResponse[] {

    if (!this.isAdminAchat) {
      return values;
    }

    return values.filter(
      item => {

        const raw =
          item as any;

        const code =
          String(
            raw?.code
            ||
            raw?.moduleCode
            ||
            ''
          )
            .trim()
            .toUpperCase();

        const route =
          String(
            raw?.route || ''
          )
            .trim()
            .toLowerCase();

        const title =
          String(
            item?.title || ''
          )
            .trim()
            .toLowerCase();

        return !(
          code.includes('USER')
          ||
          code.includes('UTILISATEUR')
          ||
          code.includes('ROLE')
          ||
          route.includes(
            '/el-emar/admin'
          )
          ||
          route.includes(
            '/el-emar/roles-acces'
          )
          ||
          title.includes(
            'utilisateur'
          )
          ||
          title.includes(
            'rôle'
          )
          ||
          title.includes(
            'role'
          )
        );
      }
    );
  }


  private extractHttpError(
    error: any,
    fallback: string
  ): string {

    return (
      error?.error?.message
      ||
      error?.error?.detail
      ||
      error?.error?.error
      ||
      error?.message
      ||
      fallback
    );
  }


  // =====================================================
  // HELPERS
  // =====================================================

  trackByCode(index: number, item: { code?: string | null }): string | number {
    return item.code || index;
  }

  trackByAction(
    index: number,
    item: DashboardQuickActionResponse,
  ): string | number {
    return item.moduleCode || item.code || index;
  }

  trackByIntervenant(
    index: number,
    item: DashboardIntervenantResponse,
  ): string {
    return `${item.candidatureId}-${item.lotId || 0}-${item.applicationCandidatureId || index}`;
  }

  trackByActivity(
    index: number,
    item: DashboardActivityResponse,
  ): string | number {
    return item.id || `${item.action}-${index}`;
  }

  trackByZone(index: number, item: DashboardZoneResponse): number {
    return item.zoneId || index;
  }

  private positiveNumber(value?: number | null): number | null {
    const result = Number(value);
    return Number.isInteger(result) && result > 0 ? result : null;
  }

  private percent(value: number, total: number): number {
    if (total <= 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, Number(((value / total) * 100).toFixed(1))));
  }

  private dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private initialOverview(): DashboardOverviewResponse {
    return {
      intervenantsActifs: 0,
      dossiersActifs: 0,
      evaluationsEnCours: 0,
      decisionsEnAttente: 0,
      classementsEnAttente: 0,
      noteMoyenne: 0,
    };
  }

  private initialIt(): DashboardItStatsResponse {
    return {
      utilisateursActifs: 0,
      rolesActifs: 0,
      modulesActifs: 0,
      utilisateursSansRole: 0,
      rolesSansAcces: 0,
    };
  }

  private initialConfiguration(): DashboardConfigurationStatsResponse {
    return {
      typesActifs: 0,
      lotsActifs: 0,
      categoriesActives: 0,
      grillesActives: 0,
      criteresActifs: 0,
      lotsSansGrille: 0,
      grillesSansCritere: 0,
      grillesTotalInvalide: 0,
      criteresSansCategorie: 0,
    };
  }

  private initialEvaluation(): DashboardEvaluationStatsResponse {
    return {
      dossiersAffectes: 0,
      evaluationsACommencer: 0,
      evaluationsEnCours: 0,
      evaluationsTerminees: 0,
      evaluationsReouvertes: 0,
      criteresAVerifier: 0,
      criteresConformes: 0,
      criteresNonConformes: 0,
      noteMoyenne: 0,
    };
  }

  private initialCommittee(): DashboardCommitteeStatsResponse {
    return {
      dossiersEvalues: 0,
      decisionsEnAttente: 0,
      admis: 0,
      rejetes: 0,
      aCorriger: 0,
      classementsEnAttente: 0,
      dossiersClasses: 0,
    };
  }
}