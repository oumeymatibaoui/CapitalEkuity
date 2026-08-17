import { ChangeDetectorRef, Component, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { catchError, finalize, of, Subscription, timeout } from "rxjs";

import { NotificationService } from "../../../core/services/notification.service";

import {
  ClassementZoneResponse,
  ClassementZoneService,
  SaveReferenceZoneRequest,
} from "../../../core/services/classement-zone.service";

type SaveReferenceZoneWithUserRequest = SaveReferenceZoneRequest & {
  utilisateurId: number;
};

import {
  ElEmarCandidatureDetail,
  ElEmarCandidatureListItem,
  ElEmarCritereEvaluation,
  ElEmarEvaluationService,
  ElEmarLotEvaluation,
  ElEmarPieceEvaluation,
  ElEmarReferenceProjet,
  SaveEvaluationRequest,
  SaveEvaluationResponse,
  SaveSolvabiliteResponse,
  SolvabiliteStatut,
  StatutEvaluation,
} from "../../../core/services/l-emar-evaluation.service";

import {
  Zone,
  ZoneService,
} from "../../../core/services/zone.service";

import {
  RoleAccessService,
} from "../../../core/services/role-access.service";

import {
  WorkflowDossier,
} from "../workflow-dossier/workflow-dossier";

import {
  WORKFLOW_STEP_CODES,
  WorkflowExecutionState,
} from "../../../core/services/workflow-el-emar.service";


@Component({
  selector: "app-evaluation-candidatures",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    WorkflowDossier,
  ],
  templateUrl: "./evaluation-candidatures.html",
  styleUrl: "./evaluation-candidatures.scss",
})
export class EvaluationCandidatures
  implements OnInit, OnDestroy
{
  // =====================================================
  // AUTORISATIONS DYNAMIQUES
  // =====================================================


  permissionsLoading = false;
  permissionsLoaded = false;

  private authorizedPermissionCodes =
    new Set<string>();

  private authorizedCategoryIds =
    new Set<number>();

  private permissionsRefreshSub?: Subscription;
  private permissionsRequestId = 0;

  /*
   * Contrôle métier du workflow.
   *
   * true uniquement si l'étape active :
   * - appartient à l'utilisateur connecté ;
   * - est EN_COURS ;
   * - est modifiable.
   */
  workflowEditable = false;
  workflowTermine = false;
  activeWorkflowStepCode: string | null = null;
  activeWorkflowStepStatus: string | null = null;

  savingDocuments = false;
  documentsDirty = false;
  documentsLocked = false;

  candidatureRef = "";
  candidatureId: number | null = null;

  detail: ElEmarCandidatureDetail | null = null;
  selectedLot: ElEmarLotEvaluation | null = null;

  zones: Zone[] = [];

  // Contrôle privé de solvabilité El Emar
  solvabiliteStatut: SolvabiliteStatut =
    "A_VERIFIER";

  solvabiliteCommentaire = "";
  savingSolvabilite = false;
  solvabiliteSaved = false;
  solvabiliteDirty = false;

  // Clé = referenceProjetId
  referenceZoneSelection:
    Record<number, number | null> = {};

  referenceZoneCommentaire:
    Record<number, string> = {};

  referenceZoneDirty:
    Record<number, boolean> = {};

  savingZoneReferenceId: number | null = null;

  // Clé = reponseCritereId
  savingCritereById:
    Record<number, boolean> = {};

  savedCritereById:
    Record<number, boolean> = {};

  /*
   * Un critère reste visible après enregistrement.
   * dirty = modification locale non encore enregistrée.
   */
  dirtyCritereById:
    Record<number, boolean> = {};

  classementsByApplicationId:
    Record<number, ClassementZoneResponse> = {};

  decisionFinaleByLot:
    Record<number, "ADMIS" | "REJETE" | null> = {};

  observationFinaleByLot:
    Record<number, string> = {};

  validatingDecisionByLot:
    Record<number, boolean> = {};

  decisionValidatedByLot:
    Record<number, boolean> = {};

  /**
   * Clé =
   * applicationCandidatureId_reponseCritereId
   */
  commentaireCritereNotification:
    Record<string, string> = {};
    /*
 * État d’envoi de la demande de complément.
 * La clé est :
 * applicationCandidatureId_reponseCritereId
 */
sendingComplementByKey:
  Record<string, boolean> = {};

complementSentByKey:
  Record<string, boolean> = {};

  loading = false;
  loadFinished = false;
  saving = false;
  loadingZones = false;

  pageError = "";
  successMessage = "";
  debugMessage = "";

  pdfModalOpen = false;
  pdfLoading = false;
  pdfError = "";

  selectedPdfUrl: SafeResourceUrl | null = null;
  selectedPdfRawUrl = "";
  selectedPdfTitle = "";

  private currentPdfObjectUrl: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private evaluationService:
      ElEmarEvaluationService,
    private zoneService: ZoneService,
    private classementZoneService:
      ClassementZoneService,
    private cdr: ChangeDetectorRef,
    private notificationService:
      NotificationService,
    private roleAccessService:
      RoleAccessService,
  ) {}

  ngOnInit(): void {
    this.loadCurrentRolePermissions();

    /*
     * Recharge les autorisations immédiatement après leur
     * modification dans la page « Rôles et autorisations ».
     */
    this.permissionsRefreshSub =
      this.roleAccessService.navigationChanged$
        .subscribe(() => {
          this.loadCurrentRolePermissions();
        });

    this.route.paramMap.subscribe((params) => {
      const rawRef = String(
        params.get("candidatureRef") || "",
      ).trim();

      if (!rawRef) {
        this.pageError =
          "Référence intervenant invalide.";

        this.loading = false;
        this.loadFinished = true;
        return;
      }

      /*
       * Nouvelle URL sécurisée :
       * /el-emar/evaluations/v1.CANDIDATURE....
       */
      if (
        rawRef.startsWith(
          "v1.CANDIDATURE.",
        )
      ) {
        this.candidatureRef = rawRef;

        this.loadDetail();
        this.loadZones();
        return;
      }

      /*
       * Compatibilité temporaire avec les anciens liens :
       * /el-emar/evaluations/17
       *
       * On récupère la candidature dans la liste,
       * retrouve candidatureRef puis remplace l'URL
       * sans envoyer "17" au nouveau endpoint détail.
       */
      if (/^\d+$/.test(rawRef)) {
        const legacyId = Number(rawRef);

        if (
          legacyId > 0 &&
          !Number.isNaN(legacyId)
        ) {
          this.resolveLegacyCandidatureId(
            legacyId,
          );
          return;
        }
      }

      this.pageError =
        "Référence intervenant invalide.";

      this.loading = false;
      this.loadFinished = true;
    });
  }

  ngOnDestroy(): void {
    this.permissionsRefreshSub?.unsubscribe();
    this.closePdfObjectUrlOnly();
  }

  /**
   * Compatibilité temporaire :
   * transforme une ancienne URL numérique
   * /evaluations/17
   * vers
   * /evaluations/v1.CANDIDATURE....
   *
   * Le détail candidature n'est jamais appelé avec l'ID numérique.
   */
  private resolveLegacyCandidatureId(
    legacyId: number,
  ): void {
    this.loading = true;
    this.loadFinished = false;
    this.pageError = "";

    this.evaluationService
      .getCandidatures()
      .pipe(
        timeout(10000),

        catchError((error: unknown) => {
          console.error(
            "ERROR RESOLVE LEGACY CANDIDATURE ID",
            error,
          );

          this.pageError =
            "Impossible de convertir l’ancienne URL de l’intervenant.";

          return of(
            [] as ElEmarCandidatureListItem[],
          );
        }),

        finalize(() => {
          this.loading = false;
          this.loadFinished = true;
          this.cdr.detectChanges();
        }),
      )
      .subscribe(
        (
          candidatures:
            ElEmarCandidatureListItem[],
        ) => {
          const candidature =
            (candidatures || []).find(
              (item) =>
                Number(
                  item.candidatureId,
                ) === legacyId,
            );

          const candidatureRef =
            String(
              candidature
                ?.candidatureRef || "",
            ).trim();

          if (!candidatureRef) {
            this.pageError =
              "Intervenant introuvable ou référence sécurisée absente.";

            this.cdr.detectChanges();
            return;
          }

          /*
           * replaceUrl évite de garder /17
           * dans l'historique du navigateur.
           *
           * Le changement de route relance paramMap
           * et loadDetail() avec la référence sécurisée.
           */
          this.router.navigate(
            [
              "/el-emar/evaluations",
              candidatureRef,
            ],
            {
              replaceUrl: true,
            },
          );
        },
      );
  }

  // =====================================================
  // WORKFLOW
  // =====================================================

  onWorkflowStateChange(
    state: WorkflowExecutionState,
  ): void {
    this.workflowEditable =
      state.editable === true;

    this.workflowTermine =
      state.workflowTermine === true;

    this.activeWorkflowStepCode =
      state.activeStepCode
        ? String(state.activeStepCode)
            .trim()
            .toUpperCase()
        : null;

    this.activeWorkflowStepStatus =
      state.activeStepStatus || null;

    this.cdr.detectChanges();
  }

  isRecevabiliteStep(): boolean {
    return (
      this.activeWorkflowStepCode ===
      WORKFLOW_STEP_CODES
        .RECEVABILITE_ADMINISTRATIVE
    );
  }

  isTechnicalStep(): boolean {
    return (
      this.activeWorkflowStepCode ===
      WORKFLOW_STEP_CODES
        .EVALUATION_TECHNIQUE
    );
  }

  isDecisionStep(): boolean {
    return (
      this.activeWorkflowStepCode ===
      WORKFLOW_STEP_CODES
        .DECISION_FINALE
    );
  }

  isClassementStep(): boolean {
    return (
      this.activeWorkflowStepCode ===
      WORKFLOW_STEP_CODES
        .CLASSEMENT_ZONE
    );
  }

  // =====================================================
  // AUTORISATIONS DYNAMIQUES
  // =====================================================


  private loadCurrentRolePermissions(): void {
    const requestId = ++this.permissionsRequestId;

    this.permissionsLoading = true;
    this.permissionsLoaded = false;

    this.authorizedPermissionCodes.clear();
    this.authorizedCategoryIds.clear();

    /*
     * Source de vérité unique :
     * GET /api/el-emar/access/me
     *
     * Le backend déduit l'utilisateur et son rôle depuis le JWT,
     * puis relit utilisateur.role_id dans PostgreSQL.
     */
    this.roleAccessService
      .getMyAccess()
      .pipe(
        timeout(10000),
        finalize(() => {
          if (requestId !== this.permissionsRequestId) {
            return;
          }

          this.permissionsLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          if (requestId !== this.permissionsRequestId) {
            return;
          }

          /*
           * /api/el-emar/access/me retourne déjà uniquement les
           * modules actifs réellement autorisés au rôle connecté.
           *
           * Ne pas refaire ici un test strict `autorise === true` :
           * selon la sérialisation du DTO, la valeur peut être absente,
           * "true" ou 1 alors que le module est bien autorisé.
           */
          for (const module of result.modules || []) {
            const code = String(
              module.codeModule || "",
            )
              .trim()
              .toUpperCase();

            if (code) {
              this.authorizedPermissionCodes.add(code);
            }
          }

          /*
           * Même principe pour les catégories : l'endpoint /me
           * retourne uniquement les catégories accordées au rôle.
           */
          for (const category of result.categories || []) {
            const categoryId = Number(
              category.categorieId,
            );

            if (categoryId > 0) {
              this.authorizedCategoryIds.add(
                categoryId,
              );
            }
          }

          this.permissionsLoaded = true;

          console.log(
            "CURRENT EVALUATION ACCESS LOADED",
            {
              utilisateurId: result.utilisateurId,
              roleId: result.roleId,
              roleCode: result.roleCode,
              permissions: [
                ...this.authorizedPermissionCodes,
              ],
              categoryIds: [
                ...this.authorizedCategoryIds,
              ],
            },
          );

          if (
            this.pageError ===
            "Impossible de charger les autorisations du rôle."
          ) {
            this.pageError = "";
          }
        },

        error: (error: any) => {
          if (requestId !== this.permissionsRequestId) {
            return;
          }

          console.error(
            "ERROR LOAD CURRENT ACCESS",
            error,
          );

          this.permissionsLoaded = false;
          this.authorizedPermissionCodes.clear();
          this.authorizedCategoryIds.clear();

          this.pageError =
            error?.name === "TimeoutError"
              ? "Le chargement des autorisations a pris trop de temps."
              : error?.error?.message ||
                "Impossible de charger les autorisations du rôle.";
        },
      });
  }

  hasPermission(code: string): boolean {
    const normalizedCode = String(code || "")
      .trim()
      .toUpperCase();

    if (!normalizedCode || !this.permissionsLoaded) {
      return false;
    }

    return this.authorizedPermissionCodes.has(normalizedCode);
  }

  /* Niveau 1 : accès à la page complète. */
  canAccessEvaluationPage(): boolean {
    return this.hasPermission("EVALUATIONS");
  }

  /* Niveau 2 : visibilité d'une section. */
  canViewSection(code: string): boolean {
    return (
      this.canAccessEvaluationPage() &&
      this.hasPermission(code)
    );
  }

  /* Niveau 3 : droit d'exécuter une action. */
  canExecuteAction(code: string): boolean {
    return (
      this.canAccessEvaluationPage() &&
      this.hasPermission(code)
    );
  }

  // Compatibilité avec les anciens appels du composant.
  canEditAction(code: string): boolean {
    return this.canExecuteAction(code);
  }
 canViewNotes(): boolean {
    return this.hasPermission(
      'EVAL_ACTION_VOIR_NOTE'
    );
  }
  canEditSection(sectionCode: string): boolean {
    return this.canViewSection(sectionCode);
  }

  canAccessSolvabiliteSection(): boolean {
    return this.canViewSection("EVAL_SECTION_SOLVABILITE");
  }

  canAccessDocumentsSection(): boolean {
    return this.canViewSection("EVAL_SECTION_DOCUMENTS_ADMIN");
  }

  /**
   * La grille est pilotée automatiquement par les catégories.
   * Dès qu'une catégorie est autorisée pour le rôle, tous ses
   * critères actifs présents dans la réponse de l'intervenant
   * deviennent visibles. Aucun accès de section supplémentaire
   * n'est demandé pour la grille.
   */
  canAccessTechnicalGridSection(): boolean {
    return (
      this.canAccessEvaluationPage() &&
      this.authorizedCategoryIds.size > 0
    );
  }

  canAccessZonesSection(): boolean {
    return this.canViewSection("EVAL_SECTION_ZONES");
  }

  canAccessDecisionSection(): boolean {
    return this.canViewSection("EVAL_SECTION_DECISION_FINALE");
  }

  hasAnyAuthorizedSection(): boolean {
    const hasStandardSection = [
      "EVAL_SECTION_IDENTIFICATION",
      "EVAL_SECTION_SOLVABILITE",
      "EVAL_SECTION_DOCUMENTS_ADMIN",
      "EVAL_SECTION_LOTS",
      "EVAL_SECTION_REFERENCES",
      "EVAL_SECTION_ZONES",
      "EVAL_SECTION_DECISION_FINALE",
    ].some((code) => this.canViewSection(code));

    return (
      hasStandardSection ||
      this.canAccessTechnicalGridSection()
    );
  }

  canEditSolvabilite(): boolean {
    return (
      this.workflowEditable &&
      this.isRecevabiliteStep() &&
      this.canAccessSolvabiliteSection() &&
      this.canExecuteAction(
        "EVAL_ACTION_VALIDER_SOLVABILITE",
      ) &&
      !this.solvabiliteSaved
    );
  }

  canEditDocuments(): boolean {
    return (
      this.workflowEditable &&
      this.isRecevabiliteStep() &&
      this.canAccessDocumentsSection() &&
      this.canExecuteAction(
        "EVAL_ACTION_MODIFIER_RNE_CNSS",
      ) &&
      !this.documentsLocked
    );
  }

  canScoreCritere(
    critere: ElEmarCritereEvaluation,
  ): boolean {
    return (
      this.workflowEditable &&
      this.isTechnicalStep() &&
      this.canAccessTechnicalGridSection() &&
      this.canExecuteAction(
        "EVAL_ACTION_NOTER_CRITERE",
      ) &&
      this.canViewCritere(critere) &&
      !this.isCritereSaved(critere)
    );
  }

  canEditCritere(
    critere: ElEmarCritereEvaluation,
  ): boolean {
    return this.canScoreCritere(critere);
  }

  // canRequestComplement(
  //   critere?: ElEmarCritereEvaluation | null,
  // ): boolean {
  //   return (
  //     this.canAccessTechnicalGridSection() &&
  //     this.canExecuteAction(
  //       "EVAL_ACTION_DEMANDER_COMPLEMENT",
  //     ) &&
  //     (
  //       !critere ||
  //       (
  //         this.canViewCritere(critere) &&
  //         !this.isCritereSaved(critere)
  //       )
  //     )
  //   );
  // }
/*
 * Contrôle seulement la visibilité de la colonne.
 * La colonne reste affichée même lorsque le domaine est verrouillé.
 */
canViewComplementColumn(): boolean {
  return (
    this.canAccessTechnicalGridSection() &&
    this.canExecuteAction(
      "EVAL_ACTION_DEMANDER_COMPLEMENT",
    )
  );
}

/*
 * Contrôle la possibilité d’écrire et d’envoyer.
 *
 * Un critère déjà enregistré ne bloque pas la demande.
 * Seule la validation finale du domaine bloque le champ.
 */
canRequestComplement(
  lot: ElEmarLotEvaluation | null,
  critere: ElEmarCritereEvaluation | null,
): boolean {
  return (
    this.workflowEditable &&
    this.isTechnicalStep() &&
    this.canViewComplementColumn() &&
    !!lot &&
    !!critere &&
    this.canViewCritere(critere) &&
    !this.isLotDecisionValidated(lot)
  );
}
isSendingComplement(
  lot: ElEmarLotEvaluation | null,
  critere: ElEmarCritereEvaluation | null,
): boolean {
  const key =
    this.getCritereNotificationKey(
      lot,
      critere,
    );

  return key
    ? this.sendingComplementByKey[key] === true
    : false;
}

isComplementSent(
  lot: ElEmarLotEvaluation | null,
  critere: ElEmarCritereEvaluation | null,
): boolean {
  const key =
    this.getCritereNotificationKey(
      lot,
      critere,
    );

  return key
    ? this.complementSentByKey[key] === true
    : false;
}
  canEditReferenceZone(
    ref: ElEmarReferenceProjet,
  ): boolean {
    return (
      this.workflowEditable &&
      this.isClassementStep() &&
      this.canAccessZonesSection() &&
      this.canExecuteAction(
        "EVAL_ACTION_AFFECTER_ZONE",
      ) &&
      ref.zoneValidee !== true
    );
  }

  canEditDecision(
    lot: ElEmarLotEvaluation | null,
  ): boolean {
    return (
      this.workflowEditable &&
      this.isDecisionStep() &&
      this.canAccessDecisionSection() &&
      this.canExecuteAction(
        "EVAL_ACTION_VALIDER_DECISION",
      ) &&
      !this.isLotDecisionValidated(lot)
    );
  }

  getDecisionReadOnlyLabel(
    lot: ElEmarLotEvaluation | null,
  ): string {
    const key = this.getLotKey(lot);

    const value = String(
      (key ? this.decisionFinaleByLot[key] : null) ||
      lot?.decisionFinale ||
      lot?.statut ||
      "",
    )
      .trim()
      .toUpperCase();

    if (value.includes("ADMIS") || value.includes("ADMISE")) {
      return "Admis";
    }

    if (value.includes("REJETE") || value.includes("REJETÉ")) {
      return "Rejeté";
    }

    return "En attente";
  }

  getDecisionReadOnlyObservation(
    lot: ElEmarLotEvaluation | null,
  ): string {
    const key = this.getLotKey(lot);

    return String(
      (key ? this.observationFinaleByLot[key] : "") ||
      lot?.observationFinale ||
      "",
    ).trim();
  }

  canViewAnyLotSection(): boolean {
    const hasStandardLotSection = [
      "EVAL_SECTION_LOTS",
      "EVAL_SECTION_REFERENCES",
      "EVAL_SECTION_ZONES",
      "EVAL_SECTION_DECISION_FINALE",
    ].some((code) => this.canViewSection(code));

    return (
      hasStandardLotSection ||
      this.canAccessTechnicalGridSection()
    );
  }

  canAccessCategory(
    categorieEvaluationId?: number | null,
  ): boolean {
    if (!this.permissionsLoaded) {
      return false;
    }

    const categorieId = Number(categorieEvaluationId);

    return (
      categorieId > 0 &&
      this.authorizedCategoryIds.has(categorieId)
    );
  }

  canViewCritere(
    critere: ElEmarCritereEvaluation,
  ): boolean {
    if (
      !this.permissionsLoaded ||
      !critere
    ) {
      return false;
    }

    /*
     * Correspondance stricte par identifiant.
     * Aucun fallback par libellé ou par section :
     * plusieurs domaines peuvent utiliser le même libellé.
     */
    const categoryId = Number(
      critere.categorieEvaluationId || 0,
    );

    return (
      categoryId > 0 &&
      this.authorizedCategoryIds.has(categoryId)
    );
  }

  getVisibleCriteres(
    lot: ElEmarLotEvaluation | null,
  ): ElEmarCritereEvaluation[] {
    if (
      !lot ||
      !this.canAccessTechnicalGridSection()
    ) {
      return [];
    }

    /*
     * Les critères autorisés restent toujours visibles.
     * Après enregistrement ils deviennent simplement non modifiables.
     */
    return (lot.criteres || []).filter(
      (critere) =>
        this.canViewCritere(critere),
    );
  }

  hasVisibleCriteres(
    lot: ElEmarLotEvaluation | null,
  ): boolean {
    return this.getVisibleCriteres(lot).length > 0;
  }

  getCandidateResponse(
    critere: ElEmarCritereEvaluation,
  ): string {
    const response: unknown =
      (critere as { reponse?: unknown })?.reponse;

    if (
      response === null ||
      response === undefined ||
      String(response).trim() === ""
    ) {
      return "Aucune réponse";
    }

    if (response === true) {
      return "Oui";
    }

    if (response === false) {
      return "Non";
    }

    return String(response).trim();
  }


  // =====================================================
  // CHARGEMENT DE L’INTERVENANT
  // =====================================================

  loadDetail(): void {
    if (!this.candidatureRef) {
      this.pageError =
        "Aucune référence intervenant trouvée dans l’URL.";

      this.loading = false;
      this.loadFinished = true;
      return;
    }

    this.loading = true;
    this.loadFinished = false;

    this.pageError = "";
    this.successMessage = "";
    this.debugMessage = "";

    this.evaluationService
      .getCandidatureDetail(
        this.candidatureRef,
      )
      .pipe(
        timeout(10000),

        catchError((error: unknown) => {
          console.error(
            "ERROR OR TIMEOUT LOAD DETAIL",
            error,
          );

          this.pageError =
            "Le chargement de l’intervenant a pris trop de temps ou a échoué.";

          return of(null);
        }),

        finalize(() => {
          this.loading = false;
          this.loadFinished = true;
          this.cdr.detectChanges();
        }),
      )
      .subscribe(
        (
          data:
            | ElEmarCandidatureDetail
            | null,
        ) => {
          if (!data) {
            this.detail = null;
            this.selectedLot = null;
            return;
          }

          this.referenceZoneSelection = {};
          this.referenceZoneCommentaire = {};
          this.referenceZoneDirty = {};

          this.savingCritereById = {};
          this.savedCritereById = {};
          this.dirtyCritereById = {};

          this.classementsByApplicationId =
            {};

          this.detail = data;

          /*
           * L'ID numérique reste uniquement pour les traitements
           * internes non encore migrés (workflow, zones, maps locales).
           * Il n'est plus utilisé pour appeler le détail candidature.
           */
          this.candidatureId =
            Number(
              data.candidatureId || 0,
            ) || null;

          /*
           * Le backend retourne aussi la référence publique chiffrée.
           * On la garde comme source de vérité côté frontend.
           */
          if (data.candidatureRef) {
            this.candidatureRef =
              String(
                data.candidatureRef,
              ).trim();
          }

          this.documentsDirty = false;
          this.documentsLocked =
            this.isFinalDocumentStatus(data.rneStatut) &&
            this.isFinalDocumentStatus(data.cnssStatut);

          for (
            const lot of data.lots || []
          ) {
            for (
              const critere of
                lot.criteres || []
            ) {
              const reponseCritereId =
                Number(
                  critere.reponseCritereId,
                );

              if (!reponseCritereId) {
                continue;
              }

              this.savingCritereById[
                reponseCritereId
              ] = false;

              this.dirtyCritereById[
                reponseCritereId
              ] = false;

              this.savedCritereById[
                reponseCritereId
              ] =
                critere.statutEvaluation !==
                  "A_VERIFIER" ||
                Number(
                  critere.noteObtenue || 0,
                ) > 0 ||
                Boolean(
                  critere
                    .commentaireEvaluateur
                    ?.trim(),
                );
            }
          }

          this.solvabiliteStatut =
            data.solvabiliteStatut ||
            "A_VERIFIER";

          this.solvabiliteCommentaire =
            data.solvabiliteCommentaire ||
            "";

          this.solvabiliteSaved = Boolean(
            data.solvabiliteDateValidation,
          );

          this.solvabiliteDirty = false;

          for (
            const lot of
              this.detail.lots || []
          ) {
            this.initDecisionStateForLot(
              lot,
            );
          }

          if (
            this.detail.lots &&
            this.detail.lots.length > 0
          ) {
            this.selectedLot =
              this.detail.lots[0];

            this.initDecisionStateForLot(
              this.selectedLot,
            );
          } else {
            this.selectedLot = null;

            this.debugMessage =
              "Intervenant chargé, mais aucun lot rempli trouvé.";
          }

          this.initReferenceZoneSelection();

          this.cdr.detectChanges();
        },
      );
  }

  loadZones(): void {
    this.loadingZones = true;

    this.zoneService
      .getAll()
      .pipe(
        timeout(8000),

        catchError((error: unknown) => {
          console.error(
            "ERROR OR TIMEOUT LOAD ZONES",
            error,
          );

          return of([]);
        }),

        finalize(() => {
          this.loadingZones = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe((zones: Zone[]) => {
        this.zones = zones || [];

        this.initReferenceZoneSelection();

        this.cdr.detectChanges();
      });
  }

  // =====================================================
  // ZONES DES RÉFÉRENCES
  // =====================================================

  initReferenceZoneSelection(): void {
    if (!this.detail?.lots) {
      return;
    }

    for (const lot of this.detail.lots) {
      for (
        const ref of lot.references || []
      ) {
        const referenceProjetId =
          Number(ref.id);

        if (!referenceProjetId) {
          continue;
        }

        this.referenceZoneSelection[
          referenceProjetId
        ] =
          ref.zoneElEmarId !== null &&
          ref.zoneElEmarId !== undefined
            ? Number(ref.zoneElEmarId)
            : null;

        this.referenceZoneCommentaire[
          referenceProjetId
        ] =
          ref.zoneElEmarCommentaire || "";

        this.referenceZoneDirty[
          referenceProjetId
        ] = false;
      }
    }
  }

  onReferenceZoneChangeLocal(
    ref: ElEmarReferenceProjet,
    zoneId: number | null,
  ): void {
    if (!this.canEditReferenceZone(ref)) {
      return;
    }

    const referenceProjetId =
      Number(ref.id);

    if (!referenceProjetId) {
      this.pageError =
        "Référence projet introuvable.";

      return;
    }

    this.referenceZoneSelection[
      referenceProjetId
    ] =
      zoneId !== null &&
      zoneId !== undefined
        ? Number(zoneId)
        : null;

    this.referenceZoneDirty[
      referenceProjetId
    ] = true;

    this.pageError = "";

    this.successMessage =
      "Zone sélectionnée. Cliquez sur « Enregistrer la zone ».";

    this.cdr.detectChanges();
  }

  onReferenceZoneCommentChange(
    ref: ElEmarReferenceProjet,
    value: string,
  ): void {
    if (!this.canEditReferenceZone(ref)) {
      return;
    }

    const referenceProjetId =
      Number(ref.id);

    if (!referenceProjetId) {
      return;
    }

    this.referenceZoneCommentaire[
      referenceProjetId
    ] = value || "";

    this.referenceZoneDirty[
      referenceProjetId
    ] = true;
  }

  isReferenceZoneSaving(
    ref: ElEmarReferenceProjet,
  ): boolean {
    return (
      this.savingZoneReferenceId ===
      Number(ref.id)
    );
  }

  validerZoneReference(
    lot: ElEmarLotEvaluation | null,
    ref: ElEmarReferenceProjet,
  ): void {
    if (!this.canEditReferenceZone(ref)) {
      return;
    }

    if (!lot) {
      this.pageError =
        "Aucun lot sélectionné.";

      return;
    }

    const applicationCandidatureId =
      Number(
        lot.applicationCandidatureId,
      );

    const referenceProjetId =
      Number(ref.id);

    const zoneId =
      this.referenceZoneSelection[
        referenceProjetId
      ];

    if (!applicationCandidatureId) {
      this.pageError =
        "Identifiant du lot introuvable.";

      return;
    }

    if (!referenceProjetId) {
      this.pageError =
        "Identifiant de la référence introuvable.";

      return;
    }

    if (!zoneId) {
      this.pageError =
        "Veuillez choisir une zone El Emar.";

      return;
    }

    const motifClassement =
      this.referenceZoneCommentaire[
        referenceProjetId
      ]?.trim() || "";

    if (!motifClassement) {
      this.pageError =
        "Veuillez saisir le motif du classement avant l’enregistrement.";

      return;
    }

    const utilisateurId =
      this.getCurrentUserId();

    if (!utilisateurId) {
      this.pageError =
        "Utilisateur El Emar connecté introuvable.";

      return;
    }

    const request:
      SaveReferenceZoneWithUserRequest = {
        referenceProjetId,
        applicationCandidatureId,
        zoneId,
        commentaire: motifClassement,
        utilisateurId,
      };

    this.savingZoneReferenceId =
      referenceProjetId;

    this.pageError = "";
    this.successMessage = "";

    this.classementZoneService
      .validerReferenceZone(request)
      .subscribe({
        next: (
          response:
            ClassementZoneResponse,
        ) => {
          this.savingZoneReferenceId =
            null;

          const savedReference =
            (lot.references || []).find(
              (item) =>
                Number(item.id) ===
                referenceProjetId,
            );

          if (!savedReference) {
            this.pageError =
              "La référence enregistrée est introuvable dans la liste.";

            this.cdr.detectChanges();
            return;
          }

          const selectedZone =
            this.zones.find(
              (zone) =>
                Number(zone.id) ===
                Number(zoneId),
            );

          savedReference.zoneElEmarId =
            zoneId;

          savedReference.zoneElEmarNom =
            response.nomZone ||
            selectedZone?.nomZone ||
            null;

          savedReference
            .zoneElEmarCommentaire =
            request.commentaire || null;

          savedReference.zoneValidee =
            true;

          this.referenceZoneDirty[
            referenceProjetId
          ] = false;

          this.classementsByApplicationId[
            applicationCandidatureId
          ] = response;

          this.successMessage =
            `La zone de « ${
              savedReference.nomProjet ||
              "la référence"
            } » est enregistrée.`;

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error(
            "ERROR SAVE REFERENCE ZONE",
            error,
          );

          this.savingZoneReferenceId =
            null;

          this.pageError =
            error?.error?.message ||
            error?.error?.detail ||
            "Erreur lors de l’enregistrement de la zone.";

          this.cdr.detectChanges();
        },
      });
  }

  getReferenceZoneLabel(
    ref: ElEmarReferenceProjet,
  ): string {
    const referenceProjetId =
      Number(ref.id);

    const selectedZoneId =
      this.referenceZoneSelection[
        referenceProjetId
      ];

    if (selectedZoneId) {
      const selectedZone =
        this.zones.find(
          (zone) =>
            Number(zone.id) ===
            Number(selectedZoneId),
        );

      if (selectedZone) {
        return selectedZone.nomZone;
      }
    }

    return (
      String(
        ref.zoneElEmarNom ||
          ref.zone ||
          "",
      ).trim() || "-"
    );
  }

  getReferenceZoneAdresse(
    ref: ElEmarReferenceProjet,
  ): string {
    const referenceProjetId =
      Number(ref.id);

    const selectedZoneId =
      this.referenceZoneSelection[
        referenceProjetId
      ];

    if (!selectedZoneId) {
      return "";
    }

    const selectedZone =
      this.zones.find(
        (zone) =>
          Number(zone.id) ===
          Number(selectedZoneId),
      );

    return selectedZone?.adresse || "";
  }

  /**
   * Retourne la zone réellement sélectionnée pour la référence.
   * La sélection locale est prioritaire sur la valeur relue du backend.
   */
  getSelectedZoneForReference(
    ref: ElEmarReferenceProjet,
  ): Zone | null {
    const referenceProjetId = Number(ref.id);

    if (!referenceProjetId) {
      return null;
    }

    const selectedZoneId =
      this.referenceZoneSelection[referenceProjetId] ??
      ref.zoneElEmarId ??
      null;

    if (!selectedZoneId) {
      return null;
    }

    return (
      this.zones.find(
        (zone) =>
          Number(zone.id) === Number(selectedZoneId),
      ) || null
    );
  }

  /**
   * Description métier configurée sur la zone.
   * Elle explique la logique générale du classement.
   */
  getSelectedZoneDescription(
    ref: ElEmarReferenceProjet,
  ): string {
    const selectedZone =
      this.getSelectedZoneForReference(ref);

    if (!selectedZone) {
      return "";
    }

    const directDescription = String(
      selectedZone.description || "",
    ).trim();

    if (directDescription) {
      return directDescription;
    }

    /*
     * Sécurité pour les anciennes données :
     * si plusieurs lieux portent le même nom de zone et que la ligne
     * sélectionnée n'a pas de description, on cherche la description
     * sur une autre ligne du même groupe.
     */
    const zoneName = String(
      selectedZone.nomZone || "",
    )
      .trim()
      .toLocaleLowerCase("fr");

    if (!zoneName) {
      return "";
    }

    const zoneWithDescription =
      (this.zones || []).find(
        (zone) =>
          String(zone.nomZone || "")
            .trim()
            .toLocaleLowerCase("fr") === zoneName &&
          String(zone.description || "").trim().length > 0,
      );

    return String(
      zoneWithDescription?.description || "",
    ).trim();
  }

  hasReferenceZoneMotif(
    ref: ElEmarReferenceProjet,
  ): boolean {
    const referenceProjetId = Number(ref.id);

    if (!referenceProjetId) {
      return false;
    }

    return (
      String(
        this.referenceZoneCommentaire[referenceProjetId] || "",
      ).trim().length > 0
    );
  }

  // =====================================================
  // SOLVABILITÉ PRIVÉE EL EMAR
  // =====================================================

  setSolvabiliteStatut(
    statut: SolvabiliteStatut,
  ): void {
    if (!this.canEditSolvabilite()) {
      return;
    }

    this.solvabiliteStatut = statut;
    this.solvabiliteDirty = true;
    this.solvabiliteSaved = false;

    this.pageError = "";
    this.successMessage = "";
  }

  onSolvabiliteCommentChange(
    value: string,
  ): void {
    if (!this.canEditSolvabilite()) {
      return;
    }

    this.solvabiliteCommentaire =
      value || "";

    this.solvabiliteDirty = true;
    this.solvabiliteSaved = false;
  }

  saveSolvabilite(): void {
    if (!this.canEditSolvabilite()) {
      return;
    }

    if (
      !this.candidatureRef ||
      !this.detail
    ) {
      this.pageError =
        "Intervenant introuvable.";

      return;
    }

    const evaluateurId =
      this.getCurrentUserId();

    if (!evaluateurId) {
      this.pageError =
        "Utilisateur El Emar connecté introuvable.";

      return;
    }

    this.savingSolvabilite = true;

    this.pageError = "";
    this.successMessage = "";

    this.evaluationService
      .saveSolvabilite(
        this.candidatureRef,
        {
          statut:
            this.solvabiliteStatut,

          commentaire:
            this.solvabiliteCommentaire
              .trim() || null,

          evaluateurId,
        },
      )
      .subscribe({
        next: (
          response:
            SaveSolvabiliteResponse,
        ) => {
          this.savingSolvabilite =
            false;

          this.solvabiliteSaved = true;
          this.solvabiliteDirty = false;

          this.solvabiliteStatut =
            response.statut;

          this.solvabiliteCommentaire =
            response.commentaire || "";

          this.detail!.solvabiliteStatut =
            response.statut;

          this.detail!
            .solvabiliteCommentaire =
            response.commentaire || null;

          this.detail!
            .solvabiliteEvaluateurId =
            response.evaluateurId || null;

          this.detail!
            .solvabiliteDateValidation =
            response.dateValidation || null;

          this.successMessage =
            "Le contrôle privé de solvabilité a été enregistré.";

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error(
            "ERROR SAVE SOLVABILITE",
            error,
          );

          this.savingSolvabilite =
            false;

          this.pageError =
            error?.error?.message ||
            error?.error?.detail ||
            "Erreur lors de l’enregistrement de la solvabilité.";

          this.cdr.detectChanges();
        },
      });
  }

  // =====================================================
  // DOCUMENTS GÉNÉRAUX
  // =====================================================

  get zonesUniques(): Zone[] {
    const zonesParNom =
      new Map<string, Zone>();

    for (
      const zone of this.zones || []
    ) {
      const nomOriginal = String(
        zone.nomZone || "",
      ).trim();

      if (!nomOriginal) {
        continue;
      }

      if ((zone as any).actif === false) {
        continue;
      }

      const cleNom =
        nomOriginal.toLowerCase();

      if (!zonesParNom.has(cleNom)) {
        zonesParNom.set(
          cleNom,
          zone,
        );
      }
    }

    return Array.from(
      zonesParNom.values(),
    ).sort((zoneA, zoneB) =>
      String(
        zoneA.nomZone || "",
      ).localeCompare(
        String(zoneB.nomZone || ""),
        "fr",
        {
          numeric: true,
          sensitivity: "base",
        },
      ),
    );
  }

  onDocumentGeneralStatutChange(
    typeDocument: "RNE" | "CNSS",
    statut: StatutEvaluation,
  ): void {
    if (!this.canEditDocuments()) {
      return;
    }

    if (!this.detail || !this.candidatureRef) {
      return;
    }

    if (typeDocument === "RNE") {
      this.detail.rneStatut = statut;
    }

    if (typeDocument === "CNSS") {
      this.detail.cnssStatut = statut;
    }

    this.documentsDirty = true;
    this.pageError = "";
    this.successMessage = "";
  }

  saveDocuments(): void {
    if (!this.canEditDocuments()) {
      return;
    }

    if (!this.detail || !this.candidatureRef) {
      this.pageError = "Intervenant introuvable.";
      return;
    }

    const rneStatut =
      this.detail.rneStatut || "A_VERIFIER";

    const cnssStatut =
      this.detail.cnssStatut || "A_VERIFIER";

    if (
      !this.isFinalDocumentStatus(rneStatut) ||
      !this.isFinalDocumentStatus(cnssStatut)
    ) {
      this.pageError =
        "Veuillez contrôler le RNE et la CNSS avant l’enregistrement définitif.";
      return;
    }

    const evaluateurId =
      this.getCurrentUserId();

    if (!evaluateurId) {
      this.pageError =
        "Utilisateur connecté introuvable.";
      return;
    }

    this.savingDocuments = true;
    this.pageError = "";
    this.successMessage = "";

    this.evaluationService
      .saveDocumentsStatut(
        this.candidatureRef,
        {
          rneStatut,
          cnssStatut,
          evaluateurId,
        },
      )
      .subscribe({
        next: (response) => {
          this.savingDocuments = false;

          this.detail!.rneStatut =
            response.rneStatut;

          this.detail!.cnssStatut =
            response.cnssStatut;

          this.detail!.dossierRecevable =
            response.dossierRecevable;

          this.detail!.motifNonRecevable =
            response.motifNonRecevable || null;

          this.documentsDirty = false;
          this.documentsLocked = true;

          this.successMessage =
            "Le contrôle administratif est enregistré.";

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error(
            "ERROR SAVE DOCUMENT STATUS",
            error,
          );

          this.savingDocuments = false;

          this.pageError =
            error?.error?.message ||
            error?.error?.detail ||
            "Erreur lors de l’enregistrement du contrôle administratif.";

          this.cdr.detectChanges();
        },
      });
  }

  private isFinalDocumentStatus(
    statut?: StatutEvaluation | null,
  ): boolean {
    return (
      statut === "CONFORME" ||
      statut === "NON_CONFORME"
    );
  }

  isIntervenantNonRecevable(): boolean {
    const rne =
      this.detail?.rneStatut ||
      "A_VERIFIER";

    const cnss =
      this.detail?.cnssStatut ||
      "A_VERIFIER";

    return (
      rne === "NON_CONFORME" ||
      cnss === "NON_CONFORME"
    );
  }

  // =====================================================
  // NOTES
  // =====================================================

  getDisplayedGlobalNote(): number {
    if (
      this.isIntervenantNonRecevable()
    ) {
      return 0;
    }

    return Number(
      this.detail?.noteGlobale || 0,
    );
  }

  getDisplayedLotNote(
    lot: ElEmarLotEvaluation,
  ): number {
    if (
      this.isIntervenantNonRecevable()
    ) {
      return 0;
    }

    return Number(
      lot.noteLot || 0,
    );
  }

  getDisplayedCritereNote(
    critere: ElEmarCritereEvaluation,
  ): number {
    if (
      this.isIntervenantNonRecevable()
    ) {
      return 0;
    }

    return Number(
      critere.noteObtenue || 0,
    );
  }

  getNoteClass(
    note?: number | null,
  ): string {
    const value =
      Number(note || 0);

    if (value >= 70) {
      return "score-good";
    }

    if (value >= 40) {
      return "score-medium";
    }

    return "score-low";
  }

  // =====================================================
  // LOTS ET CRITÈRES
  // =====================================================

  selectLot(
    lot: ElEmarLotEvaluation,
  ): void {
    this.selectedLot = lot;

    this.initDecisionStateForLot(lot);

    this.cdr.detectChanges();
  }

  getSections(
    lot: ElEmarLotEvaluation | null,
  ): string[] {
    const sections =
      this.getVisibleCriteres(lot).map(
        (critere) =>
          critere.section ||
          "Critères",
      );

    return Array.from(
      new Set(sections),
    );
  }

  getCriteresBySection(
    lot: ElEmarLotEvaluation | null,
    section: string,
  ): ElEmarCritereEvaluation[] {
    return this
      .getVisibleCriteres(lot)
      .filter(
        (critere) =>
          (
            critere.section ||
            "Critères"
          ) === section,
      );
  }

  isCritereSaving(
    critere: ElEmarCritereEvaluation,
  ): boolean {
    return (
      this.savingCritereById[
        Number(
          critere.reponseCritereId,
        )
      ] === true
    );
  }

  isCritereSaved(
    critere: ElEmarCritereEvaluation,
  ): boolean {
    return (
      this.savedCritereById[
        Number(
          critere.reponseCritereId,
        )
      ] === true
    );
  }

  isCritereDirty(
    critere: ElEmarCritereEvaluation,
  ): boolean {
    return (
      this.dirtyCritereById[
        Number(
          critere.reponseCritereId,
        )
      ] === true
    );
  }

  onStatutEvaluationChange(
    lot: ElEmarLotEvaluation | null,
    critere: ElEmarCritereEvaluation,
    nouveauStatut: StatutEvaluation,
  ): void {
    if (!this.canEditCritere(critere)) {
      return;
    }

    if (!this.canViewCritere(critere)) {
      return;
    }

    if (!lot) {
      this.pageError = "Lot introuvable.";
      return;
    }

    if (this.isIntervenantNonRecevable()) {
      this.pageError =
        "L’intervenant est non recevable : RNE ou CNSS non conforme.";
      return;
    }

    const reponseCritereId =
      Number(critere.reponseCritereId);

    if (!reponseCritereId) {
      this.pageError =
        "Identifiant de la réponse critère introuvable.";
      return;
    }

    /*
     * Modification locale seulement.
     * L'API sera appelée uniquement après clic sur « Enregistrer ».
     */
    critere.statutEvaluation =
      nouveauStatut;

    critere.conforme =
      nouveauStatut === "CONFORME";

    critere.noteObtenue =
      nouveauStatut === "CONFORME"
        ? Number(critere.noteMax || 0)
        : 0;

    this.dirtyCritereById[
      reponseCritereId
    ] = true;

    this.recalculateLotLocal(lot);

    this.pageError = "";
    this.successMessage =
      `Le critère « ${critere.libelle} » a été modifié. Cliquez sur « Enregistrer ».`;

    this.cdr.detectChanges();
  }

  onCritereCommentChange(
    critere: ElEmarCritereEvaluation,
    value: string,
  ): void {
    if (!this.canEditCritere(critere)) {
      return;
    }

    const reponseCritereId =
      Number(critere.reponseCritereId);

    if (!reponseCritereId) {
      return;
    }

    critere.commentaireEvaluateur =
      value || "";

    this.dirtyCritereById[
      reponseCritereId
    ] = true;

    this.pageError = "";
  }

  canSaveCritere(
    critere: ElEmarCritereEvaluation,
  ): boolean {
    return (
      this.canEditCritere(critere) &&
      this.isCritereDirty(critere) &&
      !this.isCritereSaving(critere)
    );
  }

  saveCritereEvaluation(
    lot: ElEmarLotEvaluation | null,
    critere: ElEmarCritereEvaluation,
  ): void {
    if (!lot || !this.canSaveCritere(critere)) {
      return;
    }

    if (this.isIntervenantNonRecevable()) {
      this.pageError =
        "L’intervenant est non recevable : RNE ou CNSS non conforme.";
      return;
    }

    const applicationCandidatureId =
      Number(lot.applicationCandidatureId);

    const reponseCritereId =
      Number(critere.reponseCritereId);

    if (!applicationCandidatureId) {
      this.pageError =
        "Identifiant du lot introuvable.";
      return;
    }

    if (!reponseCritereId) {
      this.pageError =
        "Identifiant de la réponse critère introuvable.";
      return;
    }

    const request: SaveEvaluationRequest = {
      statut:
        critere.statutEvaluation ||
        "A_VERIFIER",

      commentaireEvaluateur:
        critere.commentaireEvaluateur
          ?.trim() || null,

      /*
       * Conservé pour compatibilité avec le DTO actuel.
       * Le backend doit utiliser l'utilisateur du JWT.
       */
      evaluateurId:
        this.getCurrentUserId(),
    };

    this.savingCritereById[
      reponseCritereId
    ] = true;

    this.pageError = "";
    this.successMessage = "";

    this.evaluationService
      .saveCritereEvaluation(
        applicationCandidatureId,
        reponseCritereId,
        request,
      )
      .subscribe({
        next: (
          response:
            SaveEvaluationResponse,
        ) => {
          if (
            Number(
              response.reponseCritereId,
            ) !== reponseCritereId ||
            Number(
              response
                .applicationCandidatureId,
            ) !==
              applicationCandidatureId
          ) {
            this.savingCritereById[
              reponseCritereId
            ] = false;

            this.dirtyCritereById[
              reponseCritereId
            ] = true;

            this.pageError =
              "Le backend a retourné des identifiants différents de ceux envoyés.";

            this.cdr.detectChanges();
            return;
          }

          critere.statutEvaluation =
            response.statutEvaluation;

          critere.conforme =
            response.conforme;
          if (this.canViewNotes()) {
            critere.noteObtenue =
              response.noteObtenue ?? null;

            lot.noteLot =
              response.noteLot ?? null;

            if (this.detail) {
              this.detail.noteGlobale =
                response.noteGlobale ?? null;
            }
          }
          // critere.noteObtenue =
          //   Number(
          //     response.noteObtenue || 0,
          //   );

          critere.commentaireEvaluateur =
            response
              .commentaireEvaluateur ||
            null;

          // lot.noteLot =
          //   Number(
          //     response.noteLot || 0,
          //   );

          // if (this.detail) {
          //   this.detail.noteGlobale =
          //     Number(
          //       response.noteGlobale || 0,
          //     );
          // }

          this.savingCritereById[
            reponseCritereId
          ] = false;

          this.dirtyCritereById[
            reponseCritereId
          ] = false;

          this.savedCritereById[
            reponseCritereId
          ] = true;

          this.successMessage =
            `Le critère « ${critere.libelle} » est enregistré. Il reste visible en lecture seule.`;

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error(
            "ERROR SAVE CRITERE",
            error,
          );

          this.savingCritereById[
            reponseCritereId
          ] = false;

          /*
           * On conserve la saisie locale afin que l'utilisateur puisse
           * corriger puis réessayer sans perdre son travail.
           */
          this.dirtyCritereById[
            reponseCritereId
          ] = true;

          this.pageError =
            error?.error?.message ||
            error?.error?.detail ||
            error?.message ||
            `Erreur lors de l’enregistrement du critère « ${critere.libelle} ».`;

          this.cdr.detectChanges();
        },
      });
  }

  recalculateLotLocal(
    lot: ElEmarLotEvaluation,
  ): void {
      if (!this.canViewNotes()) {
      return;
    }
    const totalMax =
      (lot.criteres || []).reduce(
        (
          sum: number,
          critere:
            ElEmarCritereEvaluation,
        ) =>
          sum +
          Number(
            critere.noteMax || 0,
          ),
        0,
      );

    const totalObtenu =
      (lot.criteres || []).reduce(
        (
          sum: number,
          critere:
            ElEmarCritereEvaluation,
        ) =>
          sum +
          Number(
            critere.noteObtenue || 0,
          ),
        0,
      );

    lot.noteLot =
      totalMax > 0
        ? Number(
            (
              (totalObtenu /
                totalMax) *
              100
            ).toFixed(2),
          )
        : 0;

    this.recalculateGlobalLocal();
  }

  recalculateGlobalLocal(): void {
     if (!this.canViewNotes()) {
      return;
    }
    if (!this.detail) {
      return;
    }

    const allCriteres:
      ElEmarCritereEvaluation[] =
      (
        this.detail.lots || []
      ).flatMap(
        (
          lot:
            ElEmarLotEvaluation,
        ) => lot.criteres || [],
      );

    const totalMax =
      allCriteres.reduce(
        (
          sum: number,
          critere:
            ElEmarCritereEvaluation,
        ) =>
          sum +
          Number(
            critere.noteMax || 0,
          ),
        0,
      );

    const totalObtenu =
      allCriteres.reduce(
        (
          sum: number,
          critere:
            ElEmarCritereEvaluation,
        ) =>
          sum +
          Number(
            critere.noteObtenue || 0,
          ),
        0,
      );

    this.detail.noteGlobale =
      totalMax > 0
        ? Number(
            (
              (totalObtenu /
                totalMax) *
              100
            ).toFixed(2),
          )
        : 0;
  }

  // =====================================================
  // NOTIFICATION PAR CRITÈRE
  // =====================================================

  getCritereNotificationKey(
    lot:
      ElEmarLotEvaluation | null,
    critere:
      ElEmarCritereEvaluation | null,
  ): string {
    if (!lot || !critere) {
      return "";
    }

    const applicationCandidatureId =
      Number(
        lot.applicationCandidatureId,
      );

    const reponseCritereId =
      Number(
        critere.reponseCritereId,
      );

    if (
      !applicationCandidatureId ||
      !reponseCritereId
    ) {
      return "";
    }

    return (
      `${applicationCandidatureId}` +
      `_${reponseCritereId}`
    );
  }

  getCritereCommentaire(
    lot:
      ElEmarLotEvaluation | null,
    critere:
      ElEmarCritereEvaluation | null,
  ): string {
    const key =
      this.getCritereNotificationKey(
        lot,
        critere,
      );

    if (!key) {
      return "";
    }

    return (
      this
        .commentaireCritereNotification[
        key
      ] || ""
    );
  }

 setCritereCommentaire(
  lot: ElEmarLotEvaluation | null,
  critere: ElEmarCritereEvaluation | null,
  value: string,
): void {
  if (
    !lot ||
    !critere ||
    !this.canRequestComplement(
      lot,
      critere,
    )
  ) {
    return;
  }

  const key =
    this.getCritereNotificationKey(
      lot,
      critere,
    );

  if (!key) {
    return;
  }

  this.commentaireCritereNotification[
    key
  ] = value || "";

  /*
   * Si l’utilisateur modifie le texte après un envoi,
   * le bouton redevient un bouton d’envoi.
   */
  this.complementSentByKey[
    key
  ] = false;

  this.pageError = "";
}

  hasCritereCommentaire(
    lot:
      ElEmarLotEvaluation | null,
    critere:
      ElEmarCritereEvaluation | null,
  ): boolean {
    return (
      this.getCritereCommentaire(
        lot,
        critere,
      )
        .trim()
        .length > 0
    );
  }

envoyerCommentaireCritereAuCandidat(
  lot: ElEmarLotEvaluation | null,
  critere: ElEmarCritereEvaluation | null,
): void {
  if (!lot || !critere) {
    this.pageError =
      "Domaine ou critère introuvable.";
    return;
  }

  if (
    !this.canRequestComplement(
      lot,
      critere,
    )
  ) {
    this.pageError =
      this.isLotDecisionValidated(lot)
        ? "L’évaluation de ce domaine est définitivement enregistrée."
        : "La demande de complément n’est pas autorisée pour votre rôle.";

    return;
  }

  const applicationCandidatureId =
    Number(
      lot.applicationCandidatureId,
    );

  const reponseCritereId =
    Number(
      critere.reponseCritereId,
    );

  if (
    !applicationCandidatureId ||
    !reponseCritereId
  ) {
    this.pageError =
      "Application ou critère introuvable.";
    return;
  }

  const key =
    this.getCritereNotificationKey(
      lot,
      critere,
    );

  if (!key) {
    this.pageError =
      "Clé de demande de complément introuvable.";
    return;
  }

  const message =
    this.getCritereCommentaire(
      lot,
      critere,
    ).trim();

  if (!message) {
    this.pageError =
      "Veuillez préciser le complément attendu.";
    return;
  }

  const expediteurId =
    this.getCurrentUserId();

  if (!expediteurId) {
    this.pageError =
      "Utilisateur El Emar connecté introuvable.";
    return;
  }

  const destinataireId =
    Number(
      (lot as any).candidatUserId ||
      (lot as any).utilisateurId ||
      (this.detail as any)
        ?.candidatUserId ||
      (this.detail as any)
        ?.utilisateurId ||
      (this.detail as any)
        ?.candidatId ||
      0,
    ) || null;

  this.sendingComplementByKey[
    key
  ] = true;

  this.complementSentByKey[
    key
  ] = false;

  this.pageError = "";
  this.successMessage = "";

  this.notificationService
    .envoyerCommentaireCritereElEmar(
      applicationCandidatureId,
      reponseCritereId,
      {
        expediteurId,
        destinataireId,

        candidatureId:
          this.candidatureId,

        applicationCandidatureId,
        reponseCritereId,

        critereEvaluationId:
          critere.critereEvaluationId,

        codeCritere:
          critere.codeCritere || null,

        libelleCritere:
          critere.libelle || null,

        message,
      },
    )
    .subscribe({
      next: () => {
        this.sendingComplementByKey[
          key
        ] = false;

        this.complementSentByKey[
          key
        ] = true;

        this.successMessage =
          `Demande de complément envoyée pour le critère : ${
            critere.libelle ||
            critere.codeCritere ||
            ""
          }`;

        /*
         * Ne pas vider la valeur.
         * Elle reste affichée après l’envoi.
         */
        this.commentaireCritereNotification[
          key
        ] = message;

        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error(
          "ERROR SEND COMPLEMENT REQUEST",
          error,
        );

        this.sendingComplementByKey[
          key
        ] = false;

        this.complementSentByKey[
          key
        ] = false;

        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          "Erreur lors de l’envoi de la demande de complément.";

        this.cdr.detectChanges();
      },
    });
}

  get zonesAffichees(): Zone[] {
    const zonesById =
      new Map<number, Zone>();

    for (
      const zone of this.zones || []
    ) {
      const zoneId =
        Number(zone.id);

      if (
        !zoneId ||
        (zone as any).actif === false
      ) {
        continue;
      }

      zonesById.set(
        zoneId,
        zone,
      );
    }

    return Array.from(
      zonesById.values(),
    ).sort((zoneA, zoneB) =>
      String(
        zoneA.nomZone || "",
      ).localeCompare(
        String(
          zoneB.nomZone || "",
        ),
        "fr",
        {
          numeric: true,
          sensitivity: "base",
        },
      ),
    );
  }

  // =====================================================
  // DÉCISION FINALE PAR LOT
  // =====================================================

  getLotKey(
    lot:
      ElEmarLotEvaluation | null,
  ): number | null {
    if (
      !lot?.applicationCandidatureId
    ) {
      return null;
    }

    return Number(
      lot.applicationCandidatureId,
    );
  }

  initDecisionStateForLot(
    lot:
      ElEmarLotEvaluation | null,
  ): void {
    const lotKey =
      this.getLotKey(lot);

    if (!lotKey || !lot) {
      return;
    }

    if (
      !(
        lotKey in
        this.decisionFinaleByLot
      )
    ) {
      const rawDecision =
        String(
          (lot as any)
            .decisionFinale ||
            (lot as any).decision ||
            lot.statut ||
            "",
        ).toUpperCase();

      if (
        rawDecision.includes(
          "ADMIS",
        ) ||
        rawDecision.includes(
          "ADMISE",
        ) ||
        rawDecision.includes(
          "ACCEPTE",
        ) ||
        rawDecision.includes(
          "ACCEPTEE",
        )
      ) {
        this.decisionFinaleByLot[
          lotKey
        ] = "ADMIS";
      } else if (
        rawDecision.includes(
          "REJETE",
        ) ||
        rawDecision.includes(
          "REJETEE",
        ) ||
        rawDecision.includes(
          "REFUSE",
        ) ||
        rawDecision.includes(
          "REFUSEE",
        )
      ) {
        this.decisionFinaleByLot[
          lotKey
        ] = "REJETE";
      } else {
        this.decisionFinaleByLot[
          lotKey
        ] = null;
      }
    }

    if (
      !(
        lotKey in
        this.observationFinaleByLot
      )
    ) {
      this.observationFinaleByLot[
        lotKey
      ] =
        (lot as any)
          .observationFinale ||
        (lot as any).observation ||
        "";
    }

    if (
      !(
        lotKey in
        this.validatingDecisionByLot
      )
    ) {
      this.validatingDecisionByLot[
        lotKey
      ] = false;
    }

    if (
      !(
        lotKey in
        this.decisionValidatedByLot
      )
    ) {
      this.decisionValidatedByLot[
        lotKey
      ] =
        this.decisionFinaleByLot[lotKey] !== null;
    }
  }

  getFinalScoreForLot(
    lot:
      ElEmarLotEvaluation | null,
  ): number {
    if (!lot) {
      return 0;
    }

    return this.getDisplayedLotNote(
      lot,
    );
  }

  canAdmettreLot(
    lot:
      ElEmarLotEvaluation | null,
  ): boolean {
    if (!lot) {
      return false;
    }

    return (
      this.getFinalScoreForLot(
        lot,
      ) >= 80 &&
      !this.isIntervenantNonRecevable()
    );
  }

  selectDecisionForLot(
    lot:
      ElEmarLotEvaluation | null,
    decision:
      "ADMIS" | "REJETE",
  ): void {
    if (!this.canEditDecision(lot)) {
      return;
    }

    const lotKey =
      this.getLotKey(lot);

    if (!lotKey) {
      this.pageError =
        "Lot introuvable.";
      return;
    }

    if (
      decision === "ADMIS" &&
      !this.canAdmettreLot(lot)
    ) {
      this.pageError =
        "Admission impossible : la note doit être supérieure ou égale à 80/100 et l’intervenant doit être recevable.";
      return;
    }

    this.decisionFinaleByLot[
      lotKey
    ] = decision;

    this.pageError = "";
    this.successMessage = "";

    this.cdr.detectChanges();
  }

  getDecisionButtonClassForLot(
    lot:
      ElEmarLotEvaluation | null,
    decision:
      "ADMIS" | "REJETE",
  ): string {
    const lotKey =
      this.getLotKey(lot);

    if (!lotKey) {
      return "";
    }

    return (
      this.decisionFinaleByLot[
        lotKey
      ] === decision
        ? "decision-selected"
        : ""
    );
  }

  isLotValidating(
    lot:
      ElEmarLotEvaluation | null,
  ): boolean {
    const lotKey =
      this.getLotKey(lot);

    if (!lotKey) {
      return false;
    }

    return (
      this.validatingDecisionByLot[
        lotKey
      ] === true
    );
  }

  isLotDecisionValidated(
    lot:
      ElEmarLotEvaluation | null,
  ): boolean {
    const lotKey =
      this.getLotKey(lot);

    if (!lotKey) {
      return false;
    }

    return (
      this.decisionValidatedByLot[
        lotKey
      ] === true
    );
  }

  getSelectedZoneRequestsForLot(
    lot:
      ElEmarLotEvaluation | null,
  ): SaveReferenceZoneWithUserRequest[] {
    if (!lot) {
      return [];
    }

    const utilisateurId =
      this.getCurrentUserId();

    if (!utilisateurId) {
      return [];
    }

    const requests:
      SaveReferenceZoneWithUserRequest[] =
      [];

    for (
      const ref of
        lot.references || []
    ) {
      const referenceProjetId =
        Number(ref.id);

      const selectedZoneId =
        this.referenceZoneSelection[
          referenceProjetId
        ];

      if (!selectedZoneId) {
        continue;
      }

      const mustSave =
        this.referenceZoneDirty[
          referenceProjetId
        ] === true ||
        ref.zoneValidee !== true;

      if (!mustSave) {
        continue;
      }

      requests.push({
        referenceProjetId,

        applicationCandidatureId:
          Number(
            lot.applicationCandidatureId,
          ),

        zoneId:
          Number(selectedZoneId),

        commentaire:
          this.referenceZoneCommentaire[
            referenceProjetId
          ]?.trim() || null,

        utilisateurId,
      });
    }

    return requests;
  }

  hasAtLeastOneZoneSelectedForLot(
    lot:
      ElEmarLotEvaluation | null,
  ): boolean {
    if (!lot) {
      return false;
    }

    return (
      lot.references || []
    ).some((ref) => {
      const selectedZoneId =
        this.referenceZoneSelection[
          Number(ref.id)
        ];

      return (
        Boolean(selectedZoneId) ||
        ref.zoneValidee === true
      );
    });
  }

  validerDecisionFinaleLot(
    lot:
      ElEmarLotEvaluation | null,
  ): void {
    if (!this.canEditDecision(lot)) {
      return;
    }

    const lotKey =
      this.getLotKey(lot);

    if (!lot || !lotKey) {
      this.pageError =
        "Lot sélectionné introuvable.";
      return;
    }

    const decision =
      this.decisionFinaleByLot[
        lotKey
      ];

    if (!decision) {
      this.pageError =
        "Veuillez choisir une décision : Admettre ou Rejeter.";
      return;
    }

    if (
      decision === "ADMIS" &&
      !this.canAdmettreLot(lot)
    ) {
      this.pageError =
        "Admission impossible : la note doit être supérieure ou égale à 80/100 et l’intervenant doit être recevable.";
      return;
    }

    const evaluateurId =
      this.getCurrentUserId();

    if (!evaluateurId) {
      this.pageError =
        "Utilisateur connecté introuvable.";
      return;
    }

    this.validatingDecisionByLot[
      lotKey
    ] = true;

    this.pageError = "";
    this.successMessage = "";

    /*
     * IMPORTANT : la décision est désormais totalement séparée
     * du classement par zone.
     *
     * Étape 3 DECISION_FINALE : on enregistre uniquement ADMIS / REJETE.
     * Étape 4 CLASSEMENT_ZONE : le Gestionnaire Achat affecte les zones.
     */
    this.saveFinalDecisionLotOnly(
      lot,
      {
        decision,
        observation:
          this.observationFinaleByLot[
            lotKey
          ]?.trim() || null,
        evaluateurId,
      },
    );
  }

  private saveFinalDecisionLotOnly(
    lot: ElEmarLotEvaluation,
    request: {
      decision:
        "ADMIS" | "REJETE";
      observation:
        string | null;
      evaluateurId: number;
    },
  ): void {
    const lotKey =
      this.getLotKey(lot);

    if (!lotKey) {
      return;
    }

    this.evaluationService
      .saveDecisionFinaleLot(
        lotKey,
        request,
      )
      .subscribe({
        next: (response) => {
          this.validatingDecisionByLot[
            lotKey
          ] = false;

          this.decisionValidatedByLot[
            lotKey
          ] = true;

          lot.decisionFinale =
            response.decisionFinale;

          lot.observationFinale =
            response.observationFinale ||
            null;

          lot.statut =
            response.statutLot ||
            response.decisionFinale ||
            lot.statut;

          lot.noteLot =
            response.noteLot ??
            lot.noteLot;

          if (this.detail) {
            this.detail.noteGlobale =
              response.noteGlobale;
          }

          this.successMessage =
            response.decisionFinale ===
            "ADMIS"
              ? `Décision validée pour le lot ${lot.nomLot} : admis. Lorsque toutes vos décisions sont terminées, terminez et transmettez l’étape workflow.`
              : `Décision validée pour le lot ${lot.nomLot} : rejeté. Lorsque toutes vos décisions sont terminées, terminez et transmettez l’étape workflow.`;

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error(
            "ERROR SAVE LOT DECISION FINALE",
            error,
          );

          this.validatingDecisionByLot[
            lotKey
          ] = false;

          this.pageError =
            error?.error?.message ||
            error?.error?.detail ||
            "Erreur lors de la validation de la décision finale.";

          this.cdr.detectChanges();
        },
      });
  }

  getClassementForLot(
    lot:
      ElEmarLotEvaluation | null,
  ): ClassementZoneResponse | null {
    const lotKey =
      this.getLotKey(lot);

    if (!lotKey) {
      return null;
    }

    return (
      this.classementsByApplicationId[
        lotKey
      ] || null
    );
  }

  getCategorieClass(
    categorie?: string | null,
  ): string {
    const value =
      String(
        categorie || "",
      ).toUpperCase();

    if (value === "A") {
      return "categorie-a";
    }

    if (value === "B") {
      return "categorie-b";
    }

    if (value === "C") {
      return "categorie-c";
    }

    if (
      value === "NON_QUALIFIE"
    ) {
      return "categorie-non-qualifie";
    }

    return "categorie-attente";
  }

  // =====================================================
  // PDF
  // =====================================================

  openPdfModal(
    url?: string | null,
    title?: string | null,
  ): void {
    if (!url) {
      this.pageError =
        "Aucun fichier PDF disponible.";
      return;
    }

    this.closePdfObjectUrlOnly();

    this.pdfModalOpen = true;
    this.pdfLoading = true;
    this.pdfError = "";

    this.selectedPdfUrl = null;
    this.selectedPdfRawUrl = "";

    this.selectedPdfTitle =
      title ||
      "Consultation du document";

    this.cdr.detectChanges();

    this.evaluationService
      .getPdfBlob(url)
      .pipe(
        timeout(15000),

        catchError(
          (error: unknown) => {
            console.error(
              "ERROR OR TIMEOUT LOAD PDF",
              error,
            );

            this.pdfError =
              "Impossible d’afficher le PDF. Vérifiez que le backend répond.";

            return of(null);
          },
        ),

        finalize(() => {
          this.pdfLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe(
        (blob: Blob | null) => {
          if (
            !blob ||
            blob.size === 0
          ) {
            this.pdfError =
              "Le fichier PDF est vide ou introuvable.";

            this.cdr.detectChanges();
            return;
          }

          const pdfBlob =
            new Blob(
              [blob],
              {
                type:
                  "application/pdf",
              },
            );

          this.currentPdfObjectUrl =
            URL.createObjectURL(
              pdfBlob,
            );

          this.selectedPdfUrl =
            this.sanitizer
              .bypassSecurityTrustResourceUrl(
                this.currentPdfObjectUrl,
              );

          this.selectedPdfRawUrl =
            this.currentPdfObjectUrl;

          this.cdr.detectChanges();
        },
      );
  }

  closePdfModal(): void {
    this.pdfModalOpen = false;
    this.pdfLoading = false;
    this.pdfError = "";

    this.selectedPdfUrl = null;
    this.selectedPdfTitle = "";
    this.selectedPdfRawUrl = "";

    this.closePdfObjectUrlOnly();
    this.cdr.detectChanges();
  }

  private closePdfObjectUrlOnly(): void {
    if (
      this.currentPdfObjectUrl
    ) {
      URL.revokeObjectURL(
        this.currentPdfObjectUrl,
      );

      this.currentPdfObjectUrl =
        null;
    }
  }

  // =====================================================
  // HELPERS D’AFFICHAGE
  // =====================================================

  goBack(): void {
    this.router.navigate([
      "/el-emar/evaluations",
    ]);
  }

  getPieceButtonLabel(
    piece: ElEmarPieceEvaluation,
  ): string {
    if (!piece.deposee) {
      return "Non déposé";
    }

    return (
      piece.nomPiece ||
      piece.codePiece ||
      "Voir PDF"
    );
  }

  getReferenceP11Title(): string {
    return (
      "Références similaires " +
      "dans le même métier"
    );
  }

  getReferenceP12Title(): string {
    return (
      "Attestation du maître " +
      "d’ouvrage"
    );
  }

  getStatusClass(
    statut?:
      | StatutEvaluation
      | string
      | null,
  ): string {
    const value =
      String(
        statut || "",
      ).toUpperCase();

    if (value === "CONFORME") {
      return "status-conforme";
    }

    if (
      value === "NON_CONFORME"
    ) {
      return "status-non-conforme";
    }

    return "status-verifier";
  }

  formatBoolean(
    value?: boolean | null,
  ): string {
    if (value === true) {
      return "Oui";
    }

    if (value === false) {
      return "Non";
    }

    return "-";
  }

  formatDate(
    value?: string | null,
  ): string {
    if (!value) {
      return "-";
    }

    const date =
      new Date(value);

    if (
      isNaN(date.getTime())
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "fr-FR",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    );
  }

  // =====================================================
  // UTILISATEUR CONNECTÉ ET RÔLE
  // =====================================================

  private getCurrentRoleId():
    number | null {
    /*
     * Toujours privilégier l’objet utilisateur de la connexion.
     * Les anciennes clés directes peuvent conserver un ancien rôle.
     */
    const userKeys = [
      "connectedUser",
      "currentUser",
      "user",
      "authUser",
      "elEmarUser",
      "elEmarConnectedUser",
    ];

    for (const key of userKeys) {
      const raw = localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      try {
        const user = JSON.parse(raw);

        const parsedRoleId = Number(
          user?.roleId ??
          user?.role?.id ??
          0,
        );

        if (
          parsedRoleId > 0 &&
          !Number.isNaN(parsedRoleId)
        ) {
          return parsedRoleId;
        }
      } catch {
        continue;
      }
    }

    const directKeys = [
      "userRoleId",
      "roleId",
    ];

    for (const key of directKeys) {
      const raw = localStorage.getItem(key);
      const parsed = Number(raw);

      if (
        raw &&
        parsed > 0 &&
        !Number.isNaN(parsed)
      ) {
        return parsed;
      }
    }

    return null;
  }

  private getCurrentRoleCode():
    string {
    const direct =
      localStorage.getItem(
        "userRoleCode",
      ) ||
      localStorage.getItem(
        "roleCode",
      ) ||
      localStorage.getItem(
        "userRole",
      ) ||
      "";

    if (direct) {
      return direct
        .trim()
        .toUpperCase();
    }

    const userKeys = [
      "connectedUser",
      "currentUser",
      "user",
      "authUser",
      "elEmarUser",
      "elEmarConnectedUser",
    ];

    for (
      const key of userKeys
    ) {
      const raw =
        localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      try {
        const user =
          JSON.parse(raw);

        const roleCode =
          user?.roleCode ??
          user?.role?.codeRole ??
          user?.role?.code ??
          user?.typeUtilisateur ??
          "";

        if (roleCode) {
          return String(roleCode)
            .trim()
            .toUpperCase();
        }
      } catch {
        continue;
      }
    }

    return "";
  }

  /**
   * Seul le rôle ADMIN possède un accès global.
   * Les autres rôles, y compris IT, suivent les autorisations
   * configurées dans la page « Rôles et autorisations ».
   */
  private isCurrentUserAdmin():
    boolean {
    const roleCode =
      this.getCurrentRoleCode();

    return (
      roleCode === "ADMIN" ||
      roleCode === "ROLE_ADMIN"
    );
  }

  private getCurrentUserId():
    number | null {
    const directKeys = [
      "userId",
      "utilisateurId",
    ];

    for (
      const key of directKeys
    ) {
      const raw =
        localStorage.getItem(key);

      const parsed =
        Number(raw);

      if (
        raw &&
        parsed > 0 &&
        !Number.isNaN(parsed)
      ) {
        return parsed;
      }
    }

    const possibleKeys = [
      "connectedUser",
      "currentUser",
      "user",
      "authUser",
      "elEmarUser",
      "elEmarConnectedUser",
    ];

    for (
      const key of possibleKeys
    ) {
      const value =
        localStorage.getItem(key);

      if (!value) {
        continue;
      }

      try {
        const parsed =
          JSON.parse(value);

        const utilisateurId =
          Number(
            parsed?.id ??
            parsed?.userId ??
            parsed?.utilisateurId ??
            0,
          );

        if (
          utilisateurId > 0 &&
          !Number.isNaN(
            utilisateurId,
          )
        ) {
          return utilisateurId;
        }
      } catch {
        continue;
      }
    }

    return null;
  }
}