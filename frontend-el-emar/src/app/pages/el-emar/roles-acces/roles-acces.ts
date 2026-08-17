import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { finalize, forkJoin, of, switchMap, timeout } from "rxjs";

import {
  CreateRoleRequest,
  ModuleAccess,
  ModuleGroup,
  RoleAccess,
  RoleAccessService,
  RoleCategoryAccess,
  UpdateRoleRequest,
} from "../../../core/services/role-access.service";

type AccessTab =
  | "PAGES"
  | "SECTIONS"
  | "ACTIONS"
  | "WORKFLOW"
  | "CATEGORIES"
  | "RESUME";

interface AccessTabDefinition {
  id: AccessTab;
  label: string;
  description: string;
  icon: string;
}

interface CategoryScopeGroup {
  scopeName: string;
  categories: RoleCategoryAccess[];
}

interface CategoryTypeGroup {
  typeName: string;
  scopes: CategoryScopeGroup[];
}

@Component({
  selector: "app-roles-acces",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./roles-acces.html",
  styleUrl: "./roles-acces.scss",
})
export class RolesAcces implements OnInit {
  roles: RoleAccess[] = [];
  filteredRoles: RoleAccess[] = [];

  selectedRole: RoleAccess | null = null;

  moduleGroups: ModuleGroup[] = [];
  categoryAccesses: RoleCategoryAccess[] = [];
  categoryTree: CategoryTypeGroup[] = [];

  searchRole = "";
  categorySearch = "";

  activeTab: AccessTab = "PAGES";

  readonly tabs: AccessTabDefinition[] = [
    {
      id: "PAGES",
      label: "Pages du système",
      description: "Navigation et sidebar",
      icon: "ti ti-layout-dashboard",
    },
    {
      id: "SECTIONS",
      label: "Sections d’évaluation",
      description: "Parties visibles de la page",
      icon: "ti ti-layout-list",
    },
    {
      id: "ACTIONS",
      label: "Actions autorisées",
      description: "Opérations réalisables",
      icon: "ti ti-adjustments-check",
    },
    {
      id: "WORKFLOW",
      label: "Workflow",
      description: "Consultation et pilotage",
      icon: "ti ti-route",
    },
    {
      id: "CATEGORIES",
      label: "Catégories",
      description: "Périmètre d’évaluation",
      icon: "ti ti-category",
    },
    {
      id: "RESUME",
      label: "Résumé",
      description: "Vue finale du rôle",
      icon: "ti ti-eye",
    },
  ];

  loading = false;
  loadingModules = false;
  savingRole = false;
  savingAccess = false;
  deletingRole = false;

  successMessage = "";
  errorMessage = "";

  showRoleModal = false;
  editRoleMode = false;
  editingRoleId: number | null = null;
  roleModalError = "";

  grantAllAccessOnCreate = true;

  roleForm: CreateRoleRequest = {
    nomRole: "",
    description: "",
    typeRole: "INTERNE",
    roleSysteme: false,
  };

  showDeleteRoleModal = false;
  roleToDelete: RoleAccess | null = null;
  deleteModalError = "";

  private readonly accessSnapshot = new Map<number, boolean>();
  private readonly categorySnapshot = new Map<number, boolean>();

  /*
   * NIVEAU 1 : pages accessibles depuis les routes et la sidebar.
   * NIVEAU 2 : sections visibles dans la page d’évaluation.
   * NIVEAU 3 : actions exécutables dans une section visible.
   * NIVEAU 4 : catégories/critères visibles.
   */
  private readonly sectionGroups = new Set<string>([
    "EVALUATION_SECTIONS",
  ]);

  private readonly actionGroups = new Set<string>([
    "EVALUATION_ACTIONS",
  ]);

  /*
   * La grille technique est pilotée automatiquement par
   * les catégories et les actions de grille.
   */
  private readonly automaticTechnicalGridSectionCode =
    "EVAL_SECTION_GRILLE_TECHNIQUE";

  /*
   * Aucun groupe n’est exclu. Les permissions WORKFLOW_*
   * sont configurées comme les autres autorisations.
   */
  private readonly excludedGroups = new Set<string>();

  /*
   * La sidebar métier conserve toujours trois groupes simples.
   * Le tableau de bord peut être rendu séparément par le composant Sidebar,
   * mais il reste configurable dans le groupe métier ci-dessous.
   */
  private readonly navigationGroupDefinitions = [
    {
      code: "INTERVENANTS_EVALUATIONS",
      label: "Intervenants & évaluations",
      ordre: 1,
    },
    {
      code: "CONFIGURATION",
      label: "Configuration",
      ordre: 2,
    },
    {
      code: "ADMINISTRATION",
      label: "Administration",
      ordre: 3,
    },
  ] as const;

  private readonly configurationModuleCodes = new Set<string>([
    "TYPES_INTERVENANT",
    "TYPES_INTERVENANTS",
    "LOTS",
    "DOMAINES",
    "ZONES",
    "DOCUMENTS",
    "DOCUMENTS_DEMANDES",
    "GRILLE_EVALUATION",
    "GRILLES_EVALUATION",
    "CONFIGURATION_EVALUATION",
    "CRITERES",
  ]);

  private readonly administrationModuleCodes = new Set<string>([
    "UTILISATEURS",
    "ROLES_ACCES",
    "ROLES",
    "NOTIFICATIONS",
    "HISTORIQUE",
    "ADMINISTRATION",
    "ADMIN",
    "COMPTE",
    "WORKFLOW_CONFIGURATION",
  ]);

  constructor(
    private readonly roleAccessService: RoleAccessService,
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  // =====================================================
  // CHARGEMENT DES RÔLES
  // =====================================================

  loadRoles(preferredRoleId?: number | null): void {
    this.loading = true;
    this.errorMessage = "";

    const selectedId =
      preferredRoleId ?? this.selectedRole?.id ?? null;

    this.roleAccessService.getRoles().subscribe({
      next: (roles) => {
        this.roles = (roles || [])
          .filter((role) => role.actif !== false)
          .sort((a, b) =>
            String(a.nomRole || "").localeCompare(
              String(b.nomRole || ""),
              "fr",
              { sensitivity: "base" },
            ),
          );

        this.filterRoles();

        const roleToSelect =
          selectedId !== null
            ? (
                this.roles.find(
                  (role) =>
                    Number(role.id) === Number(selectedId),
                ) ?? this.roles[0]
              )
            : this.roles[0];

        if (roleToSelect) {
          this.selectRole(roleToSelect, true);
        } else {
          this.clearSelectedRole();
        }

        this.loading = false;
      },

      error: (error) => {
        console.error("ERROR LOAD ROLES", error);

        this.roles = [];
        this.filteredRoles = [];
        this.clearSelectedRole();
        this.loading = false;

        this.errorMessage = this.extractErrorMessage(
          error,
          "Impossible de charger les rôles.",
        );
      },
    });
  }

  selectRole(role: RoleAccess, force = false): void {
    if (!role) {
      return;
    }

    const changingRole =
      this.selectedRole !== null &&
      Number(this.selectedRole.id) !== Number(role.id);

    if (!force && changingRole && this.hasUnsavedChanges()) {
      const confirmed = window.confirm(
        "Des changements ne sont pas enregistrés. Changer de rôle et les annuler ?",
      );

      if (!confirmed) {
        return;
      }
    }

    this.selectedRole = role;
    this.activeTab = "PAGES";
    this.categorySearch = "";

    this.loadRoleAccess(role.id);
  }

  filterRoles(): void {
    const term = String(this.searchRole || "")
      .trim()
      .toLowerCase();

    if (!term) {
      this.filteredRoles = [...this.roles];
      return;
    }

    this.filteredRoles = this.roles.filter((role) => {
      const searchableText = [
        role.nomRole,
        role.codeRole,
        role.description,
        role.typeRole,
      ]
        .map((value) =>
          String(value || "").toLowerCase(),
        )
        .join(" ");

      return searchableText.includes(term);
    });
  }

  clearRoleSearch(): void {
    this.searchRole = "";
    this.filterRoles();
  }

  private clearSelectedRole(): void {
    this.selectedRole = null;
    this.moduleGroups = [];
    this.categoryAccesses = [];
    this.categoryTree = [];

    this.accessSnapshot.clear();
    this.categorySnapshot.clear();
  }

  // =====================================================
  // CHARGEMENT DES ACCÈS
  // =====================================================

  loadRoleAccess(roleId: number): void {
    if (!roleId) {
      this.moduleGroups = [];
      this.categoryAccesses = [];
      this.categoryTree = [];
      return;
    }

    this.loadingModules = true;
    this.errorMessage = "";

    forkJoin({
      modules:
        this.roleAccessService.getModulesByRole(roleId),

      categories:
        this.roleAccessService.getCategoriesByRole(roleId),
    })
      .pipe(
        timeout(12000),

        finalize(() => {
          this.loadingModules = false;
        }),
      )
      .subscribe({
        next: (result) => {
          this.moduleGroups = this.normalizeGroups(
            result.modules || [],
          );

          this.categoryAccesses = this.normalizeCategories(
            result.categories || [],
          );

          this.createSnapshots();
          this.buildCategoryTree();
          this.updateSelectedRoleCounters();
        },

        error: (error) => {
          console.error(
            "ERROR LOAD ROLE ACCESS",
            error,
          );

          this.moduleGroups = [];
          this.categoryAccesses = [];
          this.categoryTree = [];

          this.accessSnapshot.clear();
          this.categorySnapshot.clear();

          this.errorMessage =
            error?.name === "TimeoutError"
              ? "Le chargement des accès a pris trop de temps."
              : this.extractErrorMessage(
                  error,
                  "Impossible de charger les accès du rôle.",
                );
        },
      });
  }

  loadModulesForRole(roleId: number): void {
    this.loadRoleAccess(roleId);
  }

  private normalizeGroups(
    groups: ModuleGroup[],
  ): ModuleGroup[] {
    return (groups || [])
      .map((group) => {
        const modules = (group.modules || [])
          .map((module) => ({
            ...module,
            groupe:
              module.groupe ||
              group.groupe ||
              "AUTRES",
            autorise: module.autorise === true,
          }))
          .sort(
            (a, b) =>
              Number(a.ordreModule || 0) -
              Number(b.ordreModule || 0),
          );

        return {
          ...group,
          groupe: group.groupe || "AUTRES",
          modules,
          totalModules: modules.length,
          modulesAutorises: modules.filter(
            (module) => module.autorise === true,
          ).length,
        };
      })
      .sort(
        (a, b) =>
          Number(a.ordreGroupe || 0) -
          Number(b.ordreGroupe || 0),
      );
  }

  private normalizeCategories(
    categories: RoleCategoryAccess[],
  ): RoleCategoryAccess[] {
    return (categories || []).map((category) => ({
      ...category,

      typeIntervenantLibelle: String(
        category.typeIntervenantLibelle ||
          "Type non renseigné",
      ).trim(),

      lotNom: String(
        category.lotNom ||
          (
            category.lotId == null
              ? "Catégories communes"
              : "Lot non renseigné"
          ),
      ).trim(),

      code: String(category.code || "").trim(),
      libelle: String(category.libelle || "").trim(),
      autorise: category.autorise === true,
    }));
  }

  // =====================================================
  // SÉPARATION DES GROUPES
  // =====================================================

  get allModules(): ModuleAccess[] {
    return this.moduleGroups
      .filter(
        (group) =>
          !this.excludedGroups.has(
            this.normalizeGroup(group.groupe),
          ),
      )
      .flatMap((group) => group.modules || []);
  }

  getNavigationGroups(): ModuleGroup[] {
    const uniqueModules = new Map<number, ModuleAccess>();

    for (const group of this.moduleGroups || []) {
      const rawGroupCode = this.normalizeGroup(group.groupe);

      if (
        this.sectionGroups.has(rawGroupCode) ||
        this.actionGroups.has(rawGroupCode) ||
        this.excludedGroups.has(rawGroupCode)
      ) {
        continue;
      }

      for (const module of group.modules || []) {
        if (!this.isSidebarPageModule(module)) {
          continue;
        }

        const moduleId = Number(module.moduleId);

        if (moduleId > 0) {
          uniqueModules.set(moduleId, module);
        }
      }
    }

    const pageModules = [...uniqueModules.values()];

    return this.navigationGroupDefinitions
      .map((definition): ModuleGroup => {
        const modules = pageModules
          .filter(
            (module) =>
              this.resolveNavigationGroup(module) ===
              definition.code,
          )
          .sort(
            (a, b) =>
              Number(a.ordreModule || 999) -
                Number(b.ordreModule || 999) ||
              String(a.libelle || "").localeCompare(
                String(b.libelle || ""),
                "fr",
                { sensitivity: "base" },
              ),
          );

        return {
          groupe: definition.code,
          libelleGroupe: definition.label,
          ordreGroupe: definition.ordre,
          totalModules: modules.length,
          modulesAutorises: modules.filter(
            (module) => module.autorise === true,
          ).length,
          modules,
        };
      })
      .filter((group) => group.modules.length > 0);
  }

  private isSidebarPageModule(
    module: ModuleAccess,
  ): boolean {
    const code = String(module.codeModule || "")
      .trim()
      .toUpperCase();

    const group = this.normalizeGroup(module.groupe);
    const route = String(module.routeFront || "").trim();

    if (!route) {
      return false;
    }

    if (
      code.startsWith("EVAL_SECTION_") ||
      code.startsWith("EVAL_ACTION_") ||
      (
        code.startsWith("WORKFLOW_") &&
        code !== "WORKFLOW_CONFIGURATION"
      ) ||
      this.sectionGroups.has(group) ||
      this.actionGroups.has(group) ||
      this.excludedGroups.has(group)
    ) {
      return false;
    }

    return ![
      "SESSIONS_QUALIFICATION",
      "DOSSIERS_QUALIFICATION",
      "CHAMPS_APPRECIATION",
      "VERIFICATION_DOCUMENTS",
      "WORKFLOW_DOSSIER",
    ].includes(code);
  }

  private resolveNavigationGroup(
    module: ModuleAccess,
  ): "INTERVENANTS_EVALUATIONS" |
    "CONFIGURATION" |
    "ADMINISTRATION" {
    const code = String(module.codeModule || "")
      .trim()
      .toUpperCase();

    const route = String(module.routeFront || "")
      .trim()
      .toLowerCase();

    if (
      this.configurationModuleCodes.has(code) ||
      route.includes("/configuration/") ||
      route.endsWith("/types-intervenant") ||
      route.endsWith("/lots") ||
      route.endsWith("/zones") ||
      route.endsWith("/documents-demandes") ||
      route.endsWith("/criteres")
    ) {
      return "CONFIGURATION";
    }

    if (
      this.administrationModuleCodes.has(code) ||
      route.includes("/roles-acces") ||
      route.includes("/utilisateurs") ||
      route.includes("/historique") ||
      route.includes("/notifications") ||
      route.endsWith("/compte")
    ) {
      return "ADMINISTRATION";
    }

    return "INTERVENANTS_EVALUATIONS";
  }

  /*
   * Les sections et les actions sont reconnues par leur code métier,
   * et non plus uniquement par la valeur de module_navbar.groupe.
   *
   * Ainsi un EVAL_ACTION_* reste une action même si une ancienne
   * donnée possède encore le groupe ACTIONS, EVALUATION ou AUTRES.
   */
  getSectionGroups(): ModuleGroup[] {
    const modules = this.getPermissionModulesByPrefix(
      "EVAL_SECTION_",
    ).filter(
      (module) =>
        !this.isAutomaticTechnicalGridModule(module),
    );

    return this.buildPermissionGroup(
      "EVALUATION_SECTIONS",
      "Sections de la page d’évaluation",
      modules,
      90,
    );
  }

  getActionGroups(): ModuleGroup[] {
    const modules = this.getPermissionModulesByPrefix(
      "EVAL_ACTION_",
    );

    return this.buildPermissionGroup(
      "EVALUATION_ACTIONS",
      "Actions autorisées dans l’évaluation",
      modules,
      91,
    );
  }

  getWorkflowGroups(): ModuleGroup[] {
    const modules = this.getPermissionModulesByPrefix(
      "WORKFLOW_",
    ).filter(
      (module) =>
        String(module.codeModule || "")
          .trim()
          .toUpperCase() !==
        "WORKFLOW_CONFIGURATION",
    );

    return this.buildPermissionGroup(
      "WORKFLOW",
      "Pilotage du workflow",
      modules,
      92,
    );
  }

  private getPermissionModulesByPrefix(
    prefix: string,
  ): ModuleAccess[] {
    const normalizedPrefix = String(prefix || "")
      .trim()
      .toUpperCase();

    const uniqueModules = new Map<number, ModuleAccess>();

    for (const group of this.moduleGroups || []) {
      if (
        this.excludedGroups.has(
          this.normalizeGroup(group.groupe),
        )
      ) {
        continue;
      }

      for (const module of group.modules || []) {
        const moduleId = Number(module.moduleId);
        const code = String(module.codeModule || "")
          .trim()
          .toUpperCase();

        if (
          moduleId > 0 &&
          code.startsWith(normalizedPrefix)
        ) {
          uniqueModules.set(moduleId, module);
        }
      }
    }

    return [...uniqueModules.values()].sort(
      (a, b) =>
        Number(a.ordreModule || 999) -
          Number(b.ordreModule || 999) ||
        String(a.libelle || "").localeCompare(
          String(b.libelle || ""),
          "fr",
          { sensitivity: "base" },
        ),
    );
  }

  private buildPermissionGroup(
    groupe: string,
    libelleGroupe: string,
    modules: ModuleAccess[],
    ordreGroupe: number,
  ): ModuleGroup[] {
    if (!modules.length) {
      return [];
    }

    return [
      {
        groupe,
        libelleGroupe,
        ordreGroupe,
        totalModules: modules.length,
        modulesAutorises: modules.filter(
          (module) => module.autorise === true,
        ).length,
        modules,
      },
    ];
  }

  /*
   * Compatibilité avec les anciennes méthodes du template.
   */
  getFunctionGroups(): ModuleGroup[] {
    return [
      ...this.getSectionGroups(),
      ...this.getActionGroups(),
      ...this.getWorkflowGroups(),
    ];
  }

  getConfigurableModules(): ModuleAccess[] {
    return this.allModules.filter(
      (module) =>
        !this.isAutomaticTechnicalGridModule(
          module,
        ),
    );
  }

  private isAutomaticTechnicalGridModule(
    module: ModuleAccess,
  ): boolean {
    return (
      String(module.codeModule || "")
        .trim()
        .toUpperCase() ===
      this.automaticTechnicalGridSectionCode
    );
  }

  // =====================================================
  // MODIFICATION LOCALE
  // =====================================================

  toggleModule(module: ModuleAccess): void {
    module.autorise = module.autorise !== true;
    this.refreshGroupCounts();
  }

  toggleCategory(
    category: RoleCategoryAccess,
  ): void {
    category.autorise = category.autorise !== true;
    this.buildCategoryTree();
  }

  setAllSystemAccess(autorise: boolean): void {
    this.getConfigurableModules().forEach((module) => {
      module.autorise = autorise;
    });

    this.categoryAccesses.forEach((category) => {
      category.autorise = autorise;
    });

    this.refreshGroupCounts();
    this.buildCategoryTree();

    this.successMessage = "";
    this.errorMessage = "";
  }

  hasFullSystemAccess(): boolean {
    const configurableModules =
      this.getConfigurableModules();

    const total =
      configurableModules.length +
      this.categoryAccesses.length;

    return (
      total > 0 &&
      configurableModules.every(
        (module) => module.autorise === true,
      ) &&
      this.categoryAccesses.every(
        (category) => category.autorise === true,
      )
    );
  }

  setCurrentTabState(autorise: boolean): void {
    if (this.activeTab === "CATEGORIES") {
      this.categoryAccesses.forEach((category) => {
        category.autorise = autorise;
      });

      this.buildCategoryTree();
      return;
    }

    if (this.activeTab === "PAGES") {
      this.getNavigationGroups()
        .flatMap((group) => group.modules || [])
        .forEach((module) => {
          module.autorise = autorise;
        });

      this.refreshGroupCounts();
      return;
    }

    if (this.activeTab === "SECTIONS") {
      this.getSectionGroups()
        .flatMap((group) => group.modules || [])
        .forEach((module) => {
          module.autorise = autorise;
        });

      this.refreshGroupCounts();
      return;
    }

    if (this.activeTab === "ACTIONS") {
      this.getActionGroups()
        .flatMap((group) => group.modules || [])
        .forEach((module) => {
          module.autorise = autorise;
        });

      this.refreshGroupCounts();
      return;
    }

    if (this.activeTab === "WORKFLOW") {
      this.getWorkflowGroups()
        .flatMap((group) => group.modules || [])
        .forEach((module) => {
          module.autorise = autorise;
        });

      this.refreshGroupCounts();
    }
  }

  resetAccessChanges(): void {
    this.allModules.forEach((module) => {
      const initialValue =
        this.accessSnapshot.get(module.moduleId);

      if (initialValue !== undefined) {
        module.autorise = initialValue;
      }
    });

    this.categoryAccesses.forEach((category) => {
      const initialValue =
        this.categorySnapshot.get(
          category.categorieId,
        );

      if (initialValue !== undefined) {
        category.autorise = initialValue;
      }
    });

    this.refreshGroupCounts();
    this.buildCategoryTree();

    this.successMessage = "";
    this.errorMessage = "";
  }

  // =====================================================
  // ENREGISTREMENT DES ACCÈS
  // =====================================================

  saveAccess(): void {
    if (!this.selectedRole) {
      this.errorMessage = "Sélectionnez un rôle.";
      return;
    }

    if (!this.hasUnsavedChanges()) {
      this.successMessage =
        "Les accès sont déjà à jour.";

      this.clearSuccessMessageLater();
      return;
    }

    const roleId = Number(this.selectedRole.id);

    /*
     * Envoyer l’état COMPLET de tous les niveaux.
     * Cela évite une sauvegarde locale partielle.
     */
    const modulesPayload =
      this.getConfigurableModules()
        .filter((module) =>
          Number(module.moduleId) > 0,
        )
        .map((module) => ({
          moduleId: Number(module.moduleId),
          autorise: module.autorise === true,
        }));

    const authorizedCategoryIds =
      Array.from(
        new Set(
          this.categoryAccesses
            .filter(
              (category) =>
                category.autorise === true,
            )
            .map((category) =>
              Number(category.categorieId),
            )
            .filter((categoryId) =>
              categoryId > 0,
            ),
        ),
      );

    this.savingAccess = true;
    this.errorMessage = "";
    this.successMessage = "";

    forkJoin({
      modules:
        this.roleAccessService.updateRoleModules(
          roleId,
          {
            modules: modulesPayload,
          },
        ),

      categories:
        this.roleAccessService.updateRoleCategories(
          roleId,
          {
            categorieIds:
              authorizedCategoryIds,
          },
        ),
    })
      .pipe(
        timeout(15000),

        /*
         * Relire la vérité depuis PostgreSQL.
         */
        switchMap(() =>
          forkJoin({
            modules:
              this.roleAccessService
                .getModulesByRole(roleId),

            categories:
              this.roleAccessService
                .getCategoriesByRole(roleId),
          }),
        ),

        timeout(15000),

        finalize(() => {
          this.savingAccess = false;
        }),
      )
      .subscribe({
        next: (result) => {
          this.moduleGroups =
            this.normalizeGroups(
              result.modules || [],
            );

          this.categoryAccesses =
            this.normalizeCategories(
              result.categories || [],
            );

          this.createSnapshots();
          this.buildCategoryTree();
          this.updateSelectedRoleCounters();

          this.roleAccessService
            .notifyNavigationChanged();

          this.successMessage =
            `Les pages, sections, actions et catégories du rôle « ${this.selectedRole?.nomRole} » ont été enregistrées.`;

          this.clearSuccessMessageLater();
        },

        error: (error) => {
          console.error(
            "ERROR SAVE ROLE ACCESS",
            error,
          );

          this.errorMessage =
            error?.name === "TimeoutError"
              ? "L’enregistrement a pris trop de temps. Vérifiez le backend puis réessayez."
              : this.extractErrorMessage(
                  error,
                  "Impossible d’enregistrer les accès.",
                );
        },
      });
  }

  private getChangedModulesPayload(): Array<{
    moduleId: number;
    autorise: boolean;
  }> {
    return this.getConfigurableModules()
      .filter(
        (module) =>
          this.accessSnapshot.get(module.moduleId) !==
          (module.autorise === true),
      )
      .map((module) => ({
        moduleId: module.moduleId,
        autorise: module.autorise === true,
      }));
  }

  private createSnapshots(): void {
    this.accessSnapshot.clear();
    this.categorySnapshot.clear();

    this.allModules.forEach((module) => {
      this.accessSnapshot.set(
        module.moduleId,
        module.autorise === true,
      );
    });

    this.categoryAccesses.forEach((category) => {
      this.categorySnapshot.set(
        category.categorieId,
        category.autorise === true,
      );
    });
  }

  private hasModuleChanges(): boolean {
    return this.getConfigurableModules().some(
      (module) =>
        this.accessSnapshot.get(module.moduleId) !==
        (module.autorise === true),
    );
  }

  private hasCategoryChanges(): boolean {
    return this.categoryAccesses.some(
      (category) =>
        this.categorySnapshot.get(
          category.categorieId,
        ) !==
        (category.autorise === true),
    );
  }

  hasUnsavedChanges(): boolean {
    return (
      this.hasModuleChanges() ||
      this.hasCategoryChanges()
    );
  }

  getChangedCount(): number {
    const moduleChanges =
      this.getConfigurableModules().filter(
        (module) =>
          this.accessSnapshot.get(module.moduleId) !==
          (module.autorise === true),
      ).length;

    const categoryChanges =
      this.categoryAccesses.filter(
        (category) =>
          this.categorySnapshot.get(
            category.categorieId,
          ) !==
          (category.autorise === true),
      ).length;

    return moduleChanges + categoryChanges;
  }

  private refreshGroupCounts(): void {
    this.moduleGroups = this.moduleGroups.map(
      (group) => ({
        ...group,
        totalModules: group.modules.length,
        modulesAutorises: group.modules.filter(
          (module) => module.autorise === true,
        ).length,
      }),
    );
  }

  private updateSelectedRoleCounters(): void {
    if (!this.selectedRole) {
      return;
    }

    const configurableModules =
      this.getConfigurableModules();

    const authorizedModules =
      configurableModules.filter(
        (module) => module.autorise === true,
      ).length;

    this.selectedRole.totalModules =
      configurableModules.length;

    this.selectedRole.modulesAutorises =
      authorizedModules;

    const roleInList = this.roles.find(
      (role) =>
        Number(role.id) ===
        Number(this.selectedRole?.id),
    );

    if (roleInList) {
      roleInList.totalModules =
        configurableModules.length;

      roleInList.modulesAutorises =
        authorizedModules;
    }
  }

  // =====================================================
  // ONGLETS ET COMPTEURS
  // =====================================================

  setActiveTab(tab: AccessTab): void {
    this.activeTab = tab;
  }

  getModulesForTab(
    tab: AccessTab,
  ): ModuleAccess[] {
    if (tab === "PAGES") {
      return this.getNavigationGroups().flatMap(
        (group) => group.modules || [],
      );
    }

    if (tab === "SECTIONS") {
      return this.getSectionGroups().flatMap(
        (group) => group.modules || [],
      );
    }

    if (tab === "ACTIONS") {
      return this.getActionGroups().flatMap(
        (group) => group.modules || [],
      );
    }

    if (tab === "WORKFLOW") {
      return this.getWorkflowGroups().flatMap(
        (group) => group.modules || [],
      );
    }

    return [];
  }

  getTabCount(tab: AccessTab): number {
    if (tab === "CATEGORIES") {
      return this.categoryAccesses.length;
    }

    if (tab === "RESUME") {
      return (
        this.getConfigurableModules().length +
        this.categoryAccesses.length
      );
    }

    return this.getModulesForTab(tab).length;
  }

  getTabAuthorizedCount(
    tab: AccessTab,
  ): number {
    if (tab === "CATEGORIES") {
      return this.categoryAccesses.filter(
        (category) => category.autorise === true,
      ).length;
    }

    if (tab === "RESUME") {
      return (
        this.getConfigurableModules().filter(
          (module) => module.autorise === true,
        ).length +
        this.categoryAccesses.filter(
          (category) => category.autorise === true,
        ).length
      );
    }

    return this.getModulesForTab(tab).filter(
      (module) => module.autorise === true,
    ).length;
  }

  // =====================================================
  // CATÉGORIES PAR TYPE ET PAR LOT
  // =====================================================

  private buildCategoryTree(): void {
    const tree = new Map<
      string,
      Map<string, RoleCategoryAccess[]>
    >();

    for (const category of this.categoryAccesses) {
      const typeName = String(
        category.typeIntervenantLibelle ||
          "Type non renseigné",
      ).trim();

      const scopeName =
        category.lotId == null
          ? "Catégories communes"
          : String(
              category.lotNom ||
                "Lot non renseigné",
            ).trim();

      if (!tree.has(typeName)) {
        tree.set(typeName, new Map());
      }

      const scopes = tree.get(typeName)!;

      if (!scopes.has(scopeName)) {
        scopes.set(scopeName, []);
      }

      scopes.get(scopeName)!.push(category);
    }

    this.categoryTree = Array.from(
      tree.entries(),
    )
      .map(([typeName, scopes]) => ({
        typeName,

        scopes: Array.from(scopes.entries())
          .map(([scopeName, categories]) => ({
            scopeName,

            categories: [...categories].sort(
              (a, b) => {
                const orderDifference =
                  Number(a.ordreAffichage || 0) -
                  Number(b.ordreAffichage || 0);

                if (orderDifference !== 0) {
                  return orderDifference;
                }

                return String(
                  a.libelle || "",
                ).localeCompare(
                  String(b.libelle || ""),
                  "fr",
                  { sensitivity: "base" },
                );
              },
            ),
          }))
          .sort((a, b) => {
            const commonA = this.isCommonScope(
              a.scopeName,
            );

            const commonB = this.isCommonScope(
              b.scopeName,
            );

            if (commonA !== commonB) {
              return commonA ? -1 : 1;
            }

            return a.scopeName.localeCompare(
              b.scopeName,
              "fr",
              { sensitivity: "base" },
            );
          }),
      }))
      .sort((a, b) =>
        a.typeName.localeCompare(
          b.typeName,
          "fr",
          { sensitivity: "base" },
        ),
      );
  }

  getFilteredCategoryTree(): CategoryTypeGroup[] {
    const term = String(this.categorySearch || "")
      .trim()
      .toLowerCase();

    if (!term) {
      return this.categoryTree;
    }

    return this.categoryTree
      .map((type) => ({
        ...type,

        scopes: type.scopes
          .map((scope) => ({
            ...scope,

            categories: scope.categories.filter(
              (category) => {
                const searchable = [
                  type.typeName,
                  scope.scopeName,
                  category.code,
                  category.libelle,
                  category.description,
                ]
                  .map((value) =>
                    String(
                      value || "",
                    ).toLowerCase(),
                  )
                  .join(" ");

                return searchable.includes(term);
              },
            ),
          }))
          .filter(
            (scope) =>
              scope.categories.length > 0,
          ),
      }))
      .filter(
        (type) => type.scopes.length > 0,
      );
  }

  isCommonScope(scopeName: string): boolean {
    const value = String(scopeName || "")
      .trim()
      .toUpperCase();

    return (
      value.includes("COMMUNE") ||
      value.includes("GÉNÉRALE") ||
      value.includes("GENERALE")
    );
  }

  // =====================================================
  // LIBELLÉS
  // =====================================================

  getGroupLabel(groupCode: string): string {
    const code = this.normalizeGroup(groupCode);

    switch (code) {
      case "WORKFLOW":
        return "Pilotage du workflow";

      case "EVALUATION_SECTIONS":
        return "Sections de la page d’évaluation";

      case "EVALUATION_ACTIONS":
        return "Actions autorisées dans l’évaluation";

      case "INTERVENANTS_EVALUATIONS":
      case "EVALUATION":
        return "Intervenants & évaluations";

      case "CONFIGURATION":
        return "Configuration";

      case "ADMINISTRATION":
        return "Administration";

      case "NAVIGATION":
        return "Navigation";

      default:
        return String(
          groupCode || "Autres accès",
        )
          .replaceAll("_", " ")
          .toLowerCase()
          .replace(
            /^./,
            (value) => value.toUpperCase(),
          );
    }
  }

  getGroupHelp(groupCode: string): string {
    const code = this.normalizeGroup(groupCode);

    switch (code) {
      case "WORKFLOW":
        return "Consultation, réaffectation et réouverture des étapes.";

      case "EVALUATION_SECTIONS":
        return "Chaque partie autorisée est visible et modifiable jusqu’à son premier enregistrement.";

      case "EVALUATION_ACTIONS":
        return "Actions que ce rôle peut exécuter dans les sections visibles.";

      case "INTERVENANTS_EVALUATIONS":
      case "EVALUATION":
        return "Intervenants, évaluations, décisions et classement.";

      case "CONFIGURATION":
        return "Référentiels, domaines, documents, zones et critères.";

      case "ADMINISTRATION":
        return "Utilisateurs, rôles, notifications et historique.";

      default:
        return "Pages accessibles depuis le menu de l’application.";
    }
  }

  getModuleIcon(module: ModuleAccess): string {
    return module.icone || "ti ti-circle-check";
  }

  getModuleDescription(
    module: ModuleAccess,
  ): string {
    return (
      module.description ||
      "Accès disponible pour ce rôle."
    );
  }

  getCategoryDescription(
    category: RoleCategoryAccess,
  ): string {
    const parts = [
      category.code,
      category.description,
    ]
      .map((value) =>
        String(value || "").trim(),
      )
      .filter(Boolean);

    return parts.length > 0
      ? parts.join(" — ")
      : "Catégorie d’évaluation";
  }

  private normalizeGroup(value: string): string {
    return String(value || "")
      .trim()
      .toUpperCase();
  }

  // =====================================================
  // RÉSUMÉ
  // =====================================================

  getAuthorizedNavigationPreview(): ModuleGroup[] {
    return this.getNavigationGroups()
      .map((group) => ({
        ...group,

        modules: group.modules.filter(
          (module) => module.autorise === true,
        ),
      }))
      .filter(
        (group) => group.modules.length > 0,
      );
  }

  getAuthorizedSectionModules(): ModuleAccess[] {
    return this.getSectionGroups()
      .flatMap((group) => group.modules || [])
      .filter((module) => module.autorise === true);
  }

  getAuthorizedActionModules(): ModuleAccess[] {
    return this.getActionGroups()
      .flatMap((group) => group.modules || [])
      .filter((module) => module.autorise === true);
  }

  getAuthorizedWorkflowModules(): ModuleAccess[] {
    return this.getWorkflowGroups()
      .flatMap((group) => group.modules || [])
      .filter((module) => module.autorise === true);
  }

  // Compatibilité avec les anciens appels éventuels.
  getAuthorizedFunctionModules(): ModuleAccess[] {
    return [
      ...this.getAuthorizedSectionModules(),
      ...this.getAuthorizedActionModules(),
      ...this.getAuthorizedWorkflowModules(),
    ];
  }

  getAuthorizedCategoryAccesses():
    RoleCategoryAccess[] {
    return this.categoryAccesses.filter(
      (category) => category.autorise === true,
    );
  }

  getRoleProgress(role: RoleAccess): number {
    const total = Number(
      role.totalModules || 0,
    );

    if (total <= 0) {
      return 0;
    }

    return Math.round(
      (
        Number(role.modulesAutorises || 0) /
        total
      ) * 100,
    );
  }

  // =====================================================
  // CRÉATION / MODIFICATION DU RÔLE
  // =====================================================

  openCreateRoleModal(): void {
    this.editRoleMode = false;
    this.editingRoleId = null;
    this.roleModalError = "";

    this.grantAllAccessOnCreate = true;

    this.roleForm = {
      nomRole: "",
      description: "",
      typeRole: "INTERNE",
      roleSysteme: false,
    };

    this.showRoleModal = true;
  }

  openEditRoleModal(): void {
    if (!this.selectedRole) {
      return;
    }

    this.editRoleMode = true;
    this.editingRoleId = this.selectedRole.id;
    this.roleModalError = "";

    this.roleForm = {
      nomRole:
        this.selectedRole.nomRole || "",

      description:
        this.selectedRole.description || "",

      typeRole:
        this.selectedRole.typeRole ||
        "INTERNE",

      roleSysteme:
        this.selectedRole.roleSysteme === true,
    };

    this.showRoleModal = true;
  }

  closeRoleModal(): void {
    if (this.savingRole) {
      return;
    }

    this.showRoleModal = false;
    this.editRoleMode = false;
    this.editingRoleId = null;
    this.roleModalError = "";
  }

  saveRole(): void {
    this.roleModalError = "";

    const nomRole = String(
      this.roleForm.nomRole || "",
    ).trim();

    const description = String(
      this.roleForm.description || "",
    ).trim();

    const typeRole = String(
      this.roleForm.typeRole || "INTERNE",
    )
      .trim()
      .toUpperCase();

    if (!nomRole) {
      this.roleModalError =
        "Saisissez le nom du rôle.";
      return;
    }

    this.savingRole = true;

    if (
      this.editRoleMode &&
      this.editingRoleId !== null
    ) {
      const request: UpdateRoleRequest = {
        nomRole,
        description,
        typeRole,

        roleSysteme:
          this.roleForm.roleSysteme === true,

        actif:
          this.selectedRole?.actif !== false,
      };

      this.roleAccessService
        .updateRole(
          this.editingRoleId,
          request,
        )
        .subscribe({
          next: (role) => {
            this.savingRole = false;
            this.closeRoleModal();

            this.successMessage =
              `Le rôle « ${role.nomRole} » a été modifié.`;

            this.loadRoles(role.id);
            this.clearSuccessMessageLater();
          },

          error: (error) => {
            this.savingRole = false;

            this.roleModalError =
              this.extractErrorMessage(
                error,
                "Impossible de modifier le rôle.",
              );
          },
        });

      return;
    }

    const request: CreateRoleRequest = {
      nomRole,
      description,
      typeRole,

      roleSysteme:
        this.roleForm.roleSysteme === true,
    };

    this.roleAccessService
      .createRole(request)
      .subscribe({
        next: (role) => {
          if (this.grantAllAccessOnCreate) {
            this.grantAllSystemAccessToCreatedRole(
              role,
            );
            return;
          }

          this.savingRole = false;
          this.closeRoleModal();

          this.successMessage =
            `Le rôle « ${role.nomRole} » a été créé.`;

          this.loadRoles(role.id);
          this.clearSuccessMessageLater();
        },

        error: (error) => {
          this.savingRole = false;

          this.roleModalError =
            this.extractErrorMessage(
              error,
              "Impossible de créer le rôle.",
            );
        },
      });
  }

  private grantAllSystemAccessToCreatedRole(
    role: RoleAccess,
  ): void {
    forkJoin({
      modules:
        this.roleAccessService.getModulesByRole(
          role.id,
        ),

      categories:
        this.roleAccessService.getCategoriesByRole(
          role.id,
        ),
    })
      .pipe(
        switchMap((result) => {
          const modules = this.normalizeGroups(
            result.modules || [],
          )
            .filter(
              (group) =>
                !this.excludedGroups.has(
                  this.normalizeGroup(
                    group.groupe,
                  ),
                ),
            )
            .flatMap(
              (group) => group.modules || [],
            )
            .filter(
              (module) =>
                Number(module.moduleId) > 0 &&
                !this.isAutomaticTechnicalGridModule(
                  module,
                ),
            )
            .map((module) => ({
              moduleId: Number(module.moduleId),
              autorise: true,
            }));

          const uniqueModules = Array.from(
            new Map(
              modules.map((module) => [
                module.moduleId,
                module,
              ]),
            ).values(),
          );

          const categorieIds = Array.from(
            new Set(
              (result.categories || [])
                .map((category) =>
                  Number(category.categorieId),
                )
                .filter((id) => id > 0),
            ),
          );

          const modulesRequest$ =
            uniqueModules.length > 0
              ? this.roleAccessService
                  .updateRoleModules(
                    role.id,
                    {
                      modules: uniqueModules,
                    },
                  )
              : of(result.modules || []);

          const categoriesRequest$ =
            categorieIds.length > 0
              ? this.roleAccessService
                  .updateRoleCategories(
                    role.id,
                    { categorieIds },
                  )
              : of(result.categories || []);

          return forkJoin({
            modules: modulesRequest$,
            categories: categoriesRequest$,
          });
        }),
      )
      .subscribe({
        next: () => {
          this.savingRole = false;
          this.closeRoleModal();

          this.successMessage =
            `Le rôle « ${role.nomRole} » a été créé avec tous les accès.`;

          this.loadRoles(role.id);
          this.clearSuccessMessageLater();
        },

        error: (error) => {
          console.error(
            "ERROR GRANT ALL ROLE ACCESS",
            error,
          );

          this.savingRole = false;
          this.closeRoleModal();
          this.loadRoles(role.id);

          this.errorMessage =
            `Le rôle « ${role.nomRole} » a été créé, mais certains accès n’ont pas pu être attribués. Sélectionnez-le, cliquez sur « Tout autoriser », puis enregistrez.`;
        },
      });
  }

  // =====================================================
  // SUPPRESSION
  // =====================================================

  openDeleteRoleModal(): void {
    if (!this.selectedRole) {
      return;
    }

    if (
      this.selectedRole.roleSysteme === true
    ) {
      this.errorMessage =
        "Ce rôle est protégé et ne peut pas être supprimé.";
      return;
    }

    this.roleToDelete = this.selectedRole;
    this.deleteModalError = "";
    this.showDeleteRoleModal = true;
  }

  closeDeleteRoleModal(): void {
    if (this.deletingRole) {
      return;
    }

    this.showDeleteRoleModal = false;
    this.roleToDelete = null;
    this.deleteModalError = "";
  }

  confirmDeleteRole(): void {
    if (!this.roleToDelete) {
      return;
    }

    const roleId = this.roleToDelete.id;
    const roleName =
      this.roleToDelete.nomRole;

    this.deletingRole = true;
    this.deleteModalError = "";

    this.roleAccessService
      .deleteRole(roleId)
      .subscribe({
        next: () => {
          this.deletingRole = false;
          this.closeDeleteRoleModal();
          this.clearSelectedRole();

          this.successMessage =
            `Le rôle « ${roleName} » a été supprimé.`;

          this.loadRoles();
          this.clearSuccessMessageLater();
        },

        error: (error) => {
          this.deletingRole = false;

          this.deleteModalError =
            this.extractErrorMessage(
              error,
              error?.status === 409
                ? "Ce rôle est encore attribué à un utilisateur."
                : "Impossible de supprimer le rôle.",
            );
        },
      });
  }

  // =====================================================
  // TRACK BY
  // =====================================================

  trackByRoleId(
    _index: number,
    role: RoleAccess,
  ): number {
    return role.id;
  }

  trackByModuleId(
    _index: number,
    module: ModuleAccess,
  ): number {
    return module.moduleId;
  }

  trackByCategoryId(
    _index: number,
    category: RoleCategoryAccess,
  ): number {
    return category.categorieId;
  }

  trackByType(
    _index: number,
    type: CategoryTypeGroup,
  ): string {
    return type.typeName;
  }

  trackByScope(
    _index: number,
    scope: CategoryScopeGroup,
  ): string {
    return scope.scopeName;
  }

  // =====================================================
  // HELPERS
  // =====================================================

  getRoleIcon(role: RoleAccess): string {
    const code = String(role.codeRole || "")
      .trim()
      .toUpperCase();

    if (
      code.includes("ADMIN") ||
      code.includes("IT")
    ) {
      return "ti ti-shield-lock";
    }

    if (
      code.includes("ACHAT") ||
      code === "DA"
    ) {
      return "ti ti-shopping-cart";
    }

    if (
      code.includes("TECH") ||
      code.includes("EVALUATEUR")
    ) {
      return "ti ti-clipboard-check";
    }

    if (
      code.includes("COMITE") ||
      code.includes("DECIDEUR")
    ) {
      return "ti ti-gavel";
    }

    return "ti ti-user-cog";
  }

  private extractErrorMessage(
    error: any,
    fallback: string,
  ): string {
    const backendMessage =
      error?.error?.message ||
      error?.error?.detail ||
      (
        typeof error?.error === "string"
          ? error.error
          : null
      );

    return (
      backendMessage ||
      error?.message ||
      fallback
    );
  }

  private clearSuccessMessageLater(): void {
    window.setTimeout(() => {
      this.successMessage = "";
    }, 3000);
  }
}