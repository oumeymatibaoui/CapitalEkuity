import {
  Component,
  EventEmitter,
  NgZone,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  NavigationEnd,
  Router,
  RouterModule
} from '@angular/router';

import {
  filter,
  finalize,
  Subscription
} from 'rxjs';

import {
  NAV_ITEMS
} from '../../core/services/nav.config';

import {
  AuthService
} from '../../core/services/auth.service';

import {
  ModuleAccess,
  RoleAccessService
} from '../../core/services/role-access.service';

interface SidebarNavItem {
  moduleId?: number;
  code: string;
  group: string;
  label: string;
  description?: string | null;
  route: string;
  icon: string;
  ordreGroupe: number;
  ordreModule: number;
}

type ElEmarSidebarGroup =
  | 'Intervenants & évaluations'
  | 'Configuration'
  | 'Administration';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar implements OnInit, OnDestroy {

  @Output()
  collapsedChange =
    new EventEmitter<boolean>();

  navItems: SidebarNavItem[] = [];
  openedGroups = new Set<string>();

  sidebarCollapsed = false;
  loadingNavigation = false;
  navigationError = '';

  private routerSub?: Subscription;
  private navigationRefreshSub?: Subscription;

  private readonly groupsStorageKey =
    'sidebarOpenedGroups';

  private readonly collapsedStorageKey =
    'sidebarCollapsed';

  /*
   * Regroupement validé :
   * 1. Intervenants & évaluations
   * 2. Configuration
   * 3. Administration
   *
   * Le tableau de bord reste séparé en haut.
   */
  private readonly sidebarGroupOrder:
    readonly ElEmarSidebarGroup[] = [
      'Intervenants & évaluations',
      'Configuration',
      'Administration'
    ];

  private readonly configurationCodes =
    new Set<string>([
      'TYPES_INTERVENANT',
      'TYPES_INTERVENANTS',
      'TYPE_INTERVENANT',

      'LOTS',
      'DOMAINES',
      'DOMAINES_INTERVENTION',

      'ZONES',
      'ZONES_CLASSEMENT',

      'DOCUMENTS',
      'DOCUMENTS_DEMANDES',
      'PIECES_JUSTIFICATIVES',

      'CHAMPS_APPRECIATION',
      'INFORMATIONS_DEMANDEES',

      'GRILLE_EVALUATION',
      'GRILLES_EVALUATION',
      'CONFIGURATION_EVALUATION',

      'CRITERES',
      'CRITERES_EVALUATION',
      'CATEGORIES_EVALUATION'
    ]);

  private readonly administrationCodes =
    new Set<string>([
      'UTILISATEURS',
      'UTILISATEURS_EL_EMAR',
      'COMPTES_UTILISATEURS',

      'ROLES_ACCES',
      'ROLES',
      'GESTION_ROLES',

      'NOTIFICATIONS',
      'HISTORIQUE',
      'HISTORIQUE_ACTIONS',

      'CANDIDATURES_ACCES',
      'GESTION_ACCES_CND',
      'ACCES_INTERVENANTS',

      'ADMINISTRATION',
      'ADMIN',
      'COMPTE'
    ]);

  /*
   * Ces groupes représentent des permissions techniques.
   * Ils ne sont jamais affichés dans la sidebar.
   */
  private readonly technicalGroups =
    new Set<string>([
      'EVALUATION_ACTIONS',
      'EVALUATION_SECTIONS',
      'WORKFLOW',
      'ACTIONS',
      'SECTIONS_TECHNIQUES',
      'PERMISSIONS'
    ]);

  constructor(
    private readonly authService: AuthService,
    private readonly roleAccessService: RoleAccessService,
    private readonly router: Router,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadSidebarState();
    this.loadOpenedGroups();
    this.loadNavigation();

    /*
     * Recharger la navigation après une modification
     * des accès du rôle.
     */
    this.navigationRefreshSub =
      this.roleAccessService.navigationChanged$
        .subscribe(() => {
          this.loadNavigation();
        });

    this.routerSub = this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd
        )
      )
      .subscribe(() => {
        setTimeout(() => {
          this.openActiveGroup();
        });
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.navigationRefreshSub?.unsubscribe();
  }

  // =====================================================
  // UTILISATEUR
  // =====================================================

  get userRole(): string {
    return String(
      this.authService.getUserRole() || ''
    )
      .trim()
      .toUpperCase();
  }

  get userName(): string {
    return this.authService.getUserName();
  }

  get isCandidat(): boolean {
    return this.authService.isCandidat();
  }

  get isAdmin(): boolean {
    return [
      'ADMIN',
      'IT'
    ].includes(this.userRole);
  }

  get sidebarSubtitle(): string {
    if (this.isCandidat) {
      return 'Espace intervenant';
    }

    const roleName =
      this.authService.getUserRoleName();

    return roleName || 'Espace interne';
  }

  get roleLabel(): string {
    const dynamicRoleName =
      this.authService.getUserRoleName();

    if (dynamicRoleName) {
      return dynamicRoleName;
    }

    const labels: Record<string, string> = {
      ADMIN: 'Administrateur',
      IT: 'Administrateur système',
      EVALUATEUR: 'Évaluateur',
      DECIDEUR: 'Décideur',
      ACHAT: 'Service achat',
      COMITE: 'Comité',
      TECHNIQUE: 'Service technique',
      CND: 'Intervenant'
    };

    return labels[this.userRole] || 'Utilisateur';
  }

  get roleBadgeIcon(): string {
    return this.isAdmin
      ? 'ti-shield-lock'
      : 'ti-user';
  }

  // =====================================================
  // CHARGEMENT DE LA NAVIGATION
  // =====================================================

  loadNavigation(): void {
    this.navigationError = '';

    if (this.isCandidat) {
      this.loadCandidateNavigation();
      return;
    }

    if (!this.userRole) {
      this.navItems = [];
      this.navigationError =
        'Aucun rôle n’est associé au compte connecté.';
      return;
    }

    this.loadingNavigation = true;

    this.roleAccessService
      .getNavigationByRoleCode(this.userRole)
      .pipe(
        finalize(() => {
          this.loadingNavigation = false;
        })
      )
      .subscribe({
        next: modules => {
          const items = (modules || [])
            /*
             * Garder uniquement les vraies pages.
             * Les actions et sections techniques sont exclues.
             */
            .filter(module =>
              this.isSidebarPageModule(module)
            )
            .map(module =>
              this.mapDatabaseModule(module)
            )
            .sort(
              (a, b) =>
                a.ordreGroupe - b.ordreGroupe
                || a.ordreModule - b.ordreModule
                || a.label.localeCompare(
                  b.label,
                  'fr'
                )
            );

          /*
           * Éviter les doublons lorsqu'une même route
           * est retournée plusieurs fois par le backend.
           */
          this.navItems =
            this.deduplicateNavigationItems(items);

          this.cleanOpenedGroups();
          this.initializeOpenedGroup();
        },

        error: error => {
          console.error(
            'ERROR LOAD SIDEBAR NAVIGATION',
            error
          );

          this.navItems = [];

          this.navigationError =
            error?.error?.message
            || error?.error?.detail
            || 'Impossible de charger la navigation.';
        }
      });
  }

  private isSidebarPageModule(
    module: ModuleAccess
  ): boolean {
    const code = String(
      module.codeModule || ''
    )
      .trim()
      .toUpperCase();

    const group = String(
      module.groupe || ''
    )
      .trim()
      .toUpperCase();

    const route = String(
      module.routeFront || ''
    ).trim();

    if (!route) {
      return false;
    }

    if (this.technicalGroups.has(group)) {
      return false;
    }

    if (
      code.startsWith('EVAL_ACTION_')
      || code.startsWith('EVAL_SECTION_')
      || code.startsWith('WORKFLOW_')
      || code.startsWith('PERMISSION_')
    ) {
      return false;
    }

    return true;
  }

  private loadCandidateNavigation(): void {
    this.navItems = (NAV_ITEMS || [])
      .filter(item =>
        String(item.route || '')
          .startsWith('/cnd')
      )
      .map((item: any, index: number) => ({
        code:
          item.code
          || item.codeModule
          || `CND_${index + 1}`,

        group:
          item.group
          || 'Mon dossier',

        label:
          item.label
          || 'Navigation',

        description:
          item.description
          || null,

        route:
          this.normalizeRoute(
            item.route || '/cnd/dashboard'
          ),

        icon:
          item.icon
          || 'ti ti-circle',

        ordreGroupe:
          Number(item.ordreGroupe || 1),

        ordreModule:
          Number(item.ordreModule || index + 1)
      }));

    this.cleanOpenedGroups();
    this.initializeOpenedGroup();
  }

  private mapDatabaseModule(
    module: ModuleAccess
  ): SidebarNavItem {
    const code = String(
      module.codeModule || ''
    )
      .trim()
      .toUpperCase();

    const route = this.normalizeRoute(
      String(module.routeFront || '')
    );

    const group =
      this.resolveSidebarGroup(
        code,
        route
      );

    return {
      moduleId: module.moduleId,

      code,

      group,

      label:
        String(module.libelle || 'Page')
          .trim(),

      description:
        module.description || null,

      route,

      icon:
        String(
          module.icone || 'ti ti-circle'
        ).trim(),

      ordreGroupe:
        this.getSidebarGroupOrder(group),

      ordreModule:
        Number(module.ordreModule || 999)
    };
  }

  private resolveSidebarGroup(
    code: string,
    route: string
  ): ElEmarSidebarGroup {
    const normalizedCode =
      String(code || '')
        .trim()
        .toUpperCase();

    const normalizedRoute =
      String(route || '')
        .trim()
        .toLowerCase();

    /*
     * CONFIGURATION
     */
    if (
      this.configurationCodes.has(
        normalizedCode
      )
      || normalizedRoute.includes(
        '/configuration/'
      )
      || normalizedRoute.includes(
        '/types-intervenant'
      )
      || normalizedRoute.includes(
        '/domaines'
      )
      || normalizedRoute.includes(
        '/lots'
      )
      || normalizedRoute.includes(
        '/zones'
      )
      || normalizedRoute.includes(
        '/documents-demandes'
      )
      || normalizedRoute.includes(
        '/champs-appreciation'
      )
      || normalizedRoute.includes(
        '/criteres'
      )
      || normalizedRoute.includes(
        '/categories-evaluation'
      )
    ) {
      return 'Configuration';
    }

    /*
     * ADMINISTRATION
     */
    if (
      this.administrationCodes.has(
        normalizedCode
      )
      || normalizedRoute.includes(
        '/roles-acces'
      )
      || normalizedRoute.includes(
        '/utilisateurs'
      )
      || normalizedRoute.includes(
        '/historique'
      )
      || normalizedRoute.includes(
        '/notifications'
      )
      || normalizedRoute.includes(
        '/candidatures-acces'
      )
      || normalizedRoute.includes(
        '/acces-intervenants'
      )
      || normalizedRoute.endsWith(
        '/compte'
      )
    ) {
      return 'Administration';
    }

    /*
     * Toutes les pages métier restantes :
     * intervenants, classement, évaluations,
     * décisions et qualification.
     */
    return 'Intervenants & évaluations';
  }

  private getSidebarGroupOrder(
    group: ElEmarSidebarGroup
  ): number {
    const index =
      this.sidebarGroupOrder.indexOf(group);

    return index >= 0
      ? index + 1
      : 99;
  }

  private deduplicateNavigationItems(
    items: SidebarNavItem[]
  ): SidebarNavItem[] {
    const seenRoutes =
      new Set<string>();

    const seenCodes =
      new Set<string>();

    return items.filter(item => {
      const route =
        this.normalizeRoute(item.route);

      const code =
        String(item.code || '')
          .trim()
          .toUpperCase();

      if (
        seenRoutes.has(route)
        || (
          !!code
          && seenCodes.has(code)
        )
      ) {
        return false;
      }

      seenRoutes.add(route);

      if (code) {
        seenCodes.add(code);
      }

      return true;
    });
  }

  private normalizeRoute(
    route: string
  ): string {
    const value =
      String(route || '').trim();

    if (!value) {
      return '';
    }

    if (value === '/') {
      return value;
    }

    return value.replace(/\/+$/, '');
  }

  // =====================================================
  // TABLEAU DE BORD
  // =====================================================

  getDashboardItem(): SidebarNavItem | null {
    return this.navItems.find(item =>
      item.code === 'DASHBOARD'
      || item.route === '/el-emar/dashboard'
      || item.route === '/cnd/dashboard'
    ) || null;
  }

  private isDashboardItem(
    item: SidebarNavItem
  ): boolean {
    return (
      item.code === 'DASHBOARD'
      || item.route === '/el-emar/dashboard'
      || item.route === '/cnd/dashboard'
    );
  }

  // =====================================================
  // GROUPES
  // =====================================================

  getGroups(): string[] {
    /*
     * La navigation candidat garde ses groupes propres.
     */
    if (this.isCandidat) {
      return [
        ...new Set(
          this.navItems
            .filter(item =>
              !this.isDashboardItem(item)
            )
            .map(item => item.group)
        )
      ];
    }

    /*
     * Pour El Emar, seuls les trois groupes validés
     * peuvent être retournés.
     */
    return this.sidebarGroupOrder
      .filter(group =>
        this.getItemsByGroup(group)
          .length > 0
      );
  }

  getItemsByGroup(
    group: string
  ): SidebarNavItem[] {
    return this.navItems
      .filter(item =>
        !this.isDashboardItem(item)
        && item.group === group
      )
      .sort(
        (a, b) =>
          a.ordreModule - b.ordreModule
          || a.label.localeCompare(
            b.label,
            'fr'
          )
      );
  }

  getGroupCount(
    group: string
  ): number {
    return this.getItemsByGroup(group)
      .length;
  }

  getGroupIcon(
    group: string
  ): string {
    switch (group) {
      case 'Intervenants & évaluations':
        return 'ti ti-clipboard-check';

      case 'Configuration':
        return 'ti ti-settings';

      case 'Administration':
        return 'ti ti-shield';

      case 'Mon dossier':
        return 'ti ti-folder';

      default:
        return 'ti ti-layout-list';
    }
  }

  toggleGroup(group: string): void {
    /*
     * En mode réduit, ouvrir la sidebar
     * puis ouvrir le groupe sélectionné.
     */
    if (this.sidebarCollapsed) {
      this.sidebarCollapsed = false;

      this.openedGroups.add(group);

      this.saveSidebarState();
      this.saveOpenedGroups();

      this.collapsedChange.emit(false);
      return;
    }

    /*
     * En mode normal, ouvrir ou fermer le groupe.
     */
    if (this.openedGroups.has(group)) {
      this.openedGroups.delete(group);
    } else {
      this.openedGroups.add(group);
    }

    this.saveOpenedGroups();
  }

  isGroupOpen(
    group: string
  ): boolean {
    return this.openedGroups.has(group);
  }

  isGroupActive(
    group: string
  ): boolean {
    const currentUrl =
      this.getCleanUrl();

    return this.getItemsByGroup(group)
      .some(item =>
        currentUrl === item.route
        || currentUrl.startsWith(
          `${item.route}/`
        )
      );
  }

  private initializeOpenedGroup(): void {
    setTimeout(() => {
      this.openActiveGroup();

      if (
        this.openedGroups.size === 0
        && this.getGroups().length > 0
      ) {
        this.openedGroups.add(
          this.getGroups()[0]
        );

        this.saveOpenedGroups();
      }
    });
  }

  private openActiveGroup(): void {
    const activeGroup =
      this.getGroups().find(group =>
        this.getItemsByGroup(group)
          .some(item =>
            this.isActive(item.route)
          )
      );

    if (activeGroup) {
      this.openedGroups.add(activeGroup);
      this.saveOpenedGroups();
    }
  }

  // =====================================================
  // OUVERTURE / FERMETURE SIDEBAR
  // =====================================================

  toggleSidebar(): void {
    this.sidebarCollapsed =
      !this.sidebarCollapsed;

    this.saveSidebarState();

    this.collapsedChange.emit(
      this.sidebarCollapsed
    );

    if (!this.sidebarCollapsed) {
      setTimeout(() => {
        this.openActiveGroup();
      });
    }
  }

  private saveSidebarState(): void {
    localStorage.setItem(
      this.collapsedStorageKey,
      String(this.sidebarCollapsed)
    );
  }

  private loadSidebarState(): void {
    this.sidebarCollapsed =
      localStorage.getItem(
        this.collapsedStorageKey
      ) === 'true';

    this.collapsedChange.emit(
      this.sidebarCollapsed
    );
  }

  // =====================================================
  // NAVIGATION
  // =====================================================

  isActive(
    route: string
  ): boolean {
    if (!route) {
      return false;
    }

    const normalizedRoute =
      this.normalizeRoute(route);

    const currentUrl =
      this.getCleanUrl();

    return (
      currentUrl === normalizedRoute
      || currentUrl.startsWith(
        `${normalizedRoute}/`
      )
    );
  }

  goTo(
    route: string
  ): void {
    if (!route) {
      return;
    }

    const normalizedRoute =
      this.normalizeRoute(route);

    this.ngZone.run(() => {
      this.router.navigateByUrl(
        normalizedRoute
      )
        .then(() => {
          setTimeout(() => {
            this.openActiveGroup();
          });

          if (window.innerWidth <= 900) {
            this.sidebarCollapsed = true;
            this.saveSidebarState();

            this.collapsedChange.emit(true);
          }
        });
    });
  }

  private getCleanUrl(): string {
    const url = this.router.url
      .split('?')[0]
      .split('#')[0];

    return this.normalizeRoute(url);
  }

  // =====================================================
  // COMPTE
  // =====================================================

  getConnectedUserEmail(): string {
    const user =
      this.authService.getConnectedUser() as any;

    return String(
      user?.email
      || localStorage.getItem('userEmail')
      || 'Utilisateur'
    );
  }

  getConnectedUserRole(): string {
    return (
      this.authService.getUserRoleName()
      || this.userRole
      || '-'
    );
  }

  getConnectedUserInitial(): string {
    const source =
      this.userName
      || this.getConnectedUserEmail()
      || 'U';

    return source
      .trim()
      .charAt(0)
      .toUpperCase();
  }

  getCompteRoute(): string {
    return this.isCandidat
      ? '/cnd/compte'
      : '/el-emar/compte';
  }

  logout(): void {
    this.authService.logout();

    this.ngZone.run(() => {
      this.router.navigate(['/home']);
    });
  }

  trackByItem(
    index: number,
    item: SidebarNavItem
  ): string {
    return (
      item.code
      || item.route
      || String(index)
    );
  }

  trackByGroup(
    index: number,
    group: string
  ): string {
    return group || String(index);
  }

  // =====================================================
  // STOCKAGE DES GROUPES
  // =====================================================

  private saveOpenedGroups(): void {
    this.cleanOpenedGroups();

    localStorage.setItem(
      this.groupsStorageKey,
      JSON.stringify(
        [...this.openedGroups]
      )
    );
  }

  private loadOpenedGroups(): void {
    const data = localStorage.getItem(
      this.groupsStorageKey
    );

    if (!data) {
      return;
    }

    try {
      const groups = JSON.parse(data);

      this.openedGroups =
        Array.isArray(groups)
          ? new Set<string>(
              groups
                .map(group =>
                  String(group || '').trim()
                )
                .filter(Boolean)
            )
          : new Set<string>();

      this.cleanOpenedGroups();

    } catch {
      this.openedGroups =
        new Set<string>();
    }
  }

  /*
   * Retirer les anciens groupes stockés dans le navigateur.
   * Ainsi, un ancien quatrième groupe ne peut pas revenir.
   */
  private cleanOpenedGroups(): void {
    const allowedGroups =
      new Set<string>(
        this.getGroups()
      );

    this.openedGroups =
      new Set<string>(
        [...this.openedGroups]
          .filter(group =>
            allowedGroups.has(group)
          )
      );
  }
}