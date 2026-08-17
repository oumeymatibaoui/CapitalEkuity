import { CommonModule } from '@angular/common';

import {
  Component,
  OnInit
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  CreateUtilisateurRequest,
  TypeUtilisateur,
  TypeUtilisateurInterne,
  UtilisateurAdminResponse,
  UtilisateurAdminService
} from '../../../core/services/utilisateur-admin.service';

import {
  CreateRoleRequest,
  RoleAccess,
  RoleAccessService
} from '../../../core/services/role-access.service';

// =====================================================
// MODÈLES DU FORMULAIRE
// =====================================================

interface DepartmentOption {
  code: TypeUtilisateurInterne;
  label: string;
}

interface QuickUserForm {
  nom: string;
  email: string;
  fonction: string;

  typeUtilisateur: TypeUtilisateurInterne;
  roleId: number | null;

  motDePasse: string;
  createurId: number | null;
}

@Component({
  selector: 'app-administration-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './administration-dashboard.html',
  styleUrl: './administration-dashboard.scss'
})
export class AdministrationDashboard
implements OnInit {

  // =====================================================
  // DONNÉES
  // =====================================================

  utilisateurs: UtilisateurAdminResponse[] = [];
  roles: RoleAccess[] = [];

  loadingUsers = false;
  loadingRoles = false;
  refreshing = false;

  errorMessage = '';
  successMessage = '';

  searchUser = '';
  searchRole = '';

  readonly departmentOptions:
    DepartmentOption[] = [
      {
        code: 'IT',
        label: 'Informatique'
      },
      {
        code: 'ACHAT',
        label: 'Achat'
      },
      {
        code: 'COMITE',
        label: 'Comité'
      },
      {
        code: 'TECHNIQUE',
        label: 'Technique'
      }
    ];

  // =====================================================
  // CRÉATION RAPIDE UTILISATEUR
  // =====================================================

  showQuickUserModal = false;
  savingUser = false;

  quickUserForm: QuickUserForm =
    this.createEmptyUserForm();

  // =====================================================
  // CRÉATION RAPIDE RÔLE
  // =====================================================

  showQuickRoleModal = false;
  savingRole = false;

  quickRoleForm: CreateRoleRequest =
    this.createEmptyRoleForm();

  constructor(
    private readonly utilisateurAdminService:
      UtilisateurAdminService,

    private readonly roleAccessService:
      RoleAccessService,

    private readonly router:
      Router
  ) {}

  ngOnInit(): void {

    /*
     * Cette page est réservée à :
     *
     * roleCode = ADMIN
     * typeUtilisateur = IT
     *
     * ADMIN + ACHAT utilise le dashboard Achat
     * et ne doit jamais charger la gestion utilisateurs/rôles.
     */
    if (!this.isAdminItProfile()) {
      this.router.navigateByUrl(
        '/el-emar/dashboard'
      );
      return;
    }

    this.refreshAll();
  }

  // =====================================================
  // CHARGEMENT
  // =====================================================

  refreshAll(): void {
    this.errorMessage = '';
    this.refreshing = true;

    let finishedRequests = 0;

    const finishRequest = (): void => {
      finishedRequests++;

      if (finishedRequests >= 2) {
        this.refreshing = false;
      }
    };

    this.loadUsers(finishRequest);
    this.loadRoles(finishRequest);
  }

  loadUsers(
    onComplete?: () => void
  ): void {
    this.loadingUsers = true;

    this.utilisateurAdminService
      .getAllUsers()
      .subscribe({
        next: (
          data: UtilisateurAdminResponse[]
        ) => {
          this.utilisateurs = data || [];
          this.loadingUsers = false;
          onComplete?.();
        },

        error: (error: any) => {
          console.error(
            'ERROR LOAD USERS',
            error
          );

          this.loadingUsers = false;

          this.errorMessage =
            error?.error?.message
            || error?.error?.detail
            || 'Erreur lors du chargement des utilisateurs.';

          onComplete?.();
        }
      });
  }

  loadRoles(
    onComplete?: () => void
  ): void {
    this.loadingRoles = true;

    this.roleAccessService
      .getRoles()
      .subscribe({
        next: (
          data: RoleAccess[]
        ) => {
          this.roles = data || [];
          this.loadingRoles = false;
          onComplete?.();
        },

        error: (error: any) => {
          console.error(
            'ERROR LOAD ROLES',
            error
          );

          this.loadingRoles = false;

          this.errorMessage =
            error?.error?.message
            || error?.error?.detail
            || 'Erreur lors du chargement des rôles.';

          onComplete?.();
        }
      });
  }

  // =====================================================
  // RÔLES DISPONIBLES DANS LE FORMULAIRE
  // =====================================================

  get availableInternalRoles(): RoleAccess[] {
    return this.roles.filter(role => {
      const typeRole = String(
        role.typeRole || 'INTERNE'
      )
        .trim()
        .toUpperCase();

      return (
        role.actif !== false
        && typeRole === 'INTERNE'
      );
    });
  }

  // =====================================================
  // INDICATEURS
  // =====================================================

  getTotalUsers(): number {
    return this.utilisateurs.length;
  }

  getActiveUsers(): number {
    return this.utilisateurs.filter(
      user => user.actif === true
    ).length;
  }

  getInactiveUsers(): number {
    return this.utilisateurs.filter(
      user => user.actif !== true
    ).length;
  }

  getUsersWithoutRole(): number {
    return this.utilisateurs.filter(
      user =>
        user.roleId === null
        || user.roleId === undefined
    ).length;
  }

  getTotalRoles(): number {
    return this.roles.filter(
      role => role.actif !== false
    ).length;
  }

  getSystemRoles(): number {
    return this.roles.filter(
      role =>
        role.actif !== false
        && role.roleSysteme === true
    ).length;
  }

  getRolesWithoutAccess(): number {
    return this.roles.filter(
      role =>
        role.actif !== false
        && Number(
          role.modulesAutorises || 0
        ) === 0
    ).length;
  }

  getConfiguredRoles(): number {
    return this.roles.filter(
      role =>
        role.actif !== false
        && Number(
          role.modulesAutorises || 0
        ) > 0
    ).length;
  }

  getActiveUserPercentage(): number {
    const totalUsers = this.getTotalUsers();

    if (totalUsers === 0) {
      return 0;
    }

    return Math.round(
      (
        this.getActiveUsers()
        / totalUsers
      ) * 100
    );
  }

  getAttentionCount(): number {
    return (
      this.getInactiveUsers()
      + this.getUsersWithoutRole()
      + this.getRolesWithoutAccess()
    );
  }

  // =====================================================
  // LISTES FILTRÉES
  // =====================================================

  get filteredUsers():
    UtilisateurAdminResponse[] {
    const term = this.normalizeSearch(
      this.searchUser
    );

    const filtered = !term
      ? this.utilisateurs
      : this.utilisateurs.filter(user => {
          const searchableValue = [
            user.nom,
            user.email,
            user.fonction,
            user.roleCode,
            user.roleNom,
            user.typeUtilisateur
          ]
            .map(value =>
              String(value || '')
                .toLowerCase()
            )
            .join(' ');

          return searchableValue.includes(term);
        });

    return filtered.slice(0, 6);
  }

  get filteredRolesList(): RoleAccess[] {
    const term = this.normalizeSearch(
      this.searchRole
    );

    const activeRoles = this.roles.filter(
      role => role.actif !== false
    );

    const filtered = !term
      ? activeRoles
      : activeRoles.filter(role => {
          const searchableValue = [
            role.nomRole,
            role.codeRole,
            role.typeRole,
            role.description
          ]
            .map(value =>
              String(value || '')
                .toLowerCase()
            )
            .join(' ');

          return searchableValue.includes(term);
        });

    return filtered.slice(0, 6);
  }

  // =====================================================
  // LIBELLÉS
  // =====================================================

  getRoleLabel(
    roleCode?: string | null
  ): string {
    const code = String(
      roleCode || ''
    )
      .trim()
      .toUpperCase();

    const role = this.roles.find(
      item =>
        String(item.codeRole || '')
          .trim()
          .toUpperCase() === code
    );

    return (
      role?.nomRole
      || roleCode
      || 'Sans rôle'
    );
  }

  getDepartmentLabel(
    typeUtilisateur?:
      TypeUtilisateur | string | null
  ): string {
    const code = String(
      typeUtilisateur || ''
    )
      .trim()
      .toUpperCase();

    const department =
      this.departmentOptions.find(
        item => item.code === code
      );

    if (department) {
      return department.label;
    }

    if (code === 'CND') {
      return 'Intervenant';
    }

    return code || 'Non affecté';
  }

  getRoleAccessPercentage(
    role: RoleAccess
  ): number {
    const total = Number(
      role.totalModules || 0
    );

    if (total <= 0) {
      return 0;
    }

    const authorized = Number(
      role.modulesAutorises || 0
    );

    return Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (authorized / total) * 100
        )
      )
    );
  }

  // =====================================================
  // NAVIGATION
  // =====================================================

  goToUsersPage(): void {
    this.router.navigateByUrl(
      '/el-emar/Admin'
    );
  }

  goToRolesPage(): void {
    this.router.navigateByUrl(
      '/el-emar/roles-acces'
    );
  }

  goToWorkflowConfigurationPage(): void {
    this.router.navigateByUrl(
      '/el-emar/workflow-configuration'
    );
  }

  // =====================================================
  // CRÉATION RAPIDE UTILISATEUR
  // =====================================================

  openQuickUserModal(): void {
    this.clearMessages();

    this.quickUserForm =
      this.createEmptyUserForm();

    this.showQuickUserModal = true;
  }

  closeQuickUserModal(): void {
    if (this.savingUser) {
      return;
    }

    this.showQuickUserModal = false;
  }

  saveQuickUser(): void {
    const nom = String(
      this.quickUserForm.nom || ''
    ).trim();

    const email = String(
      this.quickUserForm.email || ''
    )
      .trim()
      .toLowerCase();

    const fonction = String(
      this.quickUserForm.fonction || ''
    ).trim();

    const typeUtilisateur =
      this.normalizeInternalType(
        this.quickUserForm.typeUtilisateur
      );

    const motDePasse = String(
      this.quickUserForm.motDePasse || ''
    ).trim();

    const roleId =
      this.toPositiveNumberOrNull(
        this.quickUserForm.roleId
      );

    if (!nom) {
      this.errorMessage =
        'Le nom est obligatoire.';

      return;
    }

    if (!this.isValidEmail(email)) {
      this.errorMessage =
        'Veuillez saisir une adresse email valide.';

      return;
    }

    if (!typeUtilisateur) {
      this.errorMessage =
        'Le département sélectionné est invalide.';

      return;
    }

    if (roleId === null) {
      this.errorMessage =
        'Le rôle est obligatoire.';

      return;
    }

    if (!motDePasse) {
      this.errorMessage =
        'Le mot de passe temporaire est obligatoire.';

      return;
    }

    if (motDePasse.length < 8) {
      this.errorMessage =
        'Le mot de passe doit contenir au moins 8 caractères.';

      return;
    }

    const request:
      CreateUtilisateurRequest = {
        nom,
        email,
        fonction:
          fonction || undefined,

        typeUtilisateur,
        roleId,
        motDePasse,

        createurId:
          this.getConnectedUserId()
      };

    this.savingUser = true;
    this.clearMessages();

    this.utilisateurAdminService
      .createUser(request)
      .subscribe({
        next: (
          createdUser:
            UtilisateurAdminResponse
        ) => {
          this.savingUser = false;
          this.showQuickUserModal = false;

          this.successMessage =
            `Le compte de ${
              createdUser.nom || nom
            } a été créé.`;

          this.loadUsers();
          this.clearSuccessLater();
        },

        error: (error: any) => {
          console.error(
            'ERROR CREATE USER',
            error
          );

          this.savingUser = false;

          this.errorMessage =
            error?.error?.message
            || error?.error?.detail
            || 'Erreur lors de la création de l’utilisateur.';
        }
      });
  }

  // =====================================================
  // CRÉATION RAPIDE RÔLE
  // =====================================================

  openQuickRoleModal(): void {
    this.clearMessages();

    this.quickRoleForm =
      this.createEmptyRoleForm();

    this.showQuickRoleModal = true;
  }

  closeQuickRoleModal(): void {
    if (this.savingRole) {
      return;
    }

    this.showQuickRoleModal = false;
  }

  saveQuickRole(): void {
    const nomRole = String(
      this.quickRoleForm.nomRole || ''
    ).trim();

    const description = String(
      this.quickRoleForm.description || ''
    ).trim();

    if (!nomRole) {
      this.errorMessage =
        'Le nom du rôle est obligatoire.';

      return;
    }

    const request: CreateRoleRequest = {
      nomRole,
      description:
        description || undefined,
      typeRole: 'INTERNE',
      roleSysteme: false
    };

    this.savingRole = true;
    this.clearMessages();

    this.roleAccessService
      .createRole(request)
      .subscribe({
        next: (
          createdRole: RoleAccess
        ) => {
          this.savingRole = false;
          this.showQuickRoleModal = false;

          this.successMessage =
            `Le rôle "${
              createdRole.nomRole || nomRole
            }" a été créé. Configurez maintenant ses accès.`;

          this.loadRoles();
          this.clearSuccessLater();
        },

        error: (error: any) => {
          console.error(
            'ERROR CREATE ROLE',
            error
          );

          this.savingRole = false;

          this.errorMessage =
            error?.error?.message
            || error?.error?.detail
            || 'Erreur lors de la création du rôle.';
        }
      });
  }

  // =====================================================
  // EXPORT UTILISATEURS
  // =====================================================

  exportUsersToExcel(): void {
    const rows = this.utilisateurs.map(
      user => ({
        Nom: user.nom || '-',
        Email: user.email || '-',
        Fonction: user.fonction || '-',

        Département:
          this.getDepartmentLabel(
            user.typeUtilisateur
          ),

        Rôle:
          this.getRoleLabel(
            user.roleCode
          ),

        Statut:
          user.actif
            ? 'Actif'
            : 'Inactif'
      })
    );

    const worksheet =
      XLSX.utils.json_to_sheet(rows);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Utilisateurs'
    );

    XLSX.writeFile(
      workbook,
      `utilisateurs_${
        this.getDateStamp()
      }.xlsx`
    );
  }

  exportUsersToPdf(): void {
    const document = new jsPDF({
      orientation: 'landscape'
    });

    document.setFontSize(15);

    document.text(
      'Liste des utilisateurs',
      14,
      16
    );

    autoTable(document, {
      startY: 23,

      head: [[
        'Nom',
        'Email',
        'Fonction',
        'Département',
        'Rôle',
        'Statut'
      ]],

      body: this.utilisateurs.map(
        user => [
          user.nom || '-',
          user.email || '-',
          user.fonction || '-',

          this.getDepartmentLabel(
            user.typeUtilisateur
          ),

          this.getRoleLabel(
            user.roleCode
          ),

          user.actif
            ? 'Actif'
            : 'Inactif'
        ]
      )
    });

    document.save(
      `utilisateurs_${
        this.getDateStamp()
      }.pdf`
    );
  }

  // =====================================================
  // EXPORT RÔLES
  // =====================================================

  exportRolesToExcel(): void {
    const rows = this.roles.map(
      role => ({
        Nom: role.nomRole || '-',
        Code: role.codeRole || '-',
        Type: role.typeRole || '-',

        Statut:
          role.actif !== false
            ? 'Actif'
            : 'Inactif',

        'Accès autorisés':
          `${
            role.modulesAutorises || 0
          }/${
            role.totalModules || 0
          }`,

        'Rôle système':
          role.roleSysteme
            ? 'Oui'
            : 'Non'
      })
    );

    const worksheet =
      XLSX.utils.json_to_sheet(rows);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Rôles'
    );

    XLSX.writeFile(
      workbook,
      `roles_${
        this.getDateStamp()
      }.xlsx`
    );
  }

  exportRolesToPdf(): void {
    const document = new jsPDF({
      orientation: 'landscape'
    });

    document.setFontSize(15);

    document.text(
      'Liste des rôles',
      14,
      16
    );

    autoTable(document, {
      startY: 23,

      head: [[
        'Nom',
        'Code',
        'Type',
        'Accès autorisés',
        'Rôle système'
      ]],

      body: this.roles.map(
        role => [
          role.nomRole || '-',
          role.codeRole || '-',
          role.typeRole || '-',

          `${
            role.modulesAutorises || 0
          }/${
            role.totalModules || 0
          }`,

          role.roleSysteme
            ? 'Oui'
            : 'Non'
        ]
      )
    });

    document.save(
      `roles_${
        this.getDateStamp()
      }.pdf`
    );
  }

  // =====================================================
  // TRACK BY
  // =====================================================

  trackByUserId(
    index: number,
    user: UtilisateurAdminResponse
  ): number {
    return user.id || index;
  }

  trackByRoleId(
    index: number,
    role: RoleAccess
  ): number {
    return role.id || index;
  }

  // =====================================================
  // FORMULAIRES VIDES
  // =====================================================

  private createEmptyUserForm():
    QuickUserForm {
    return {
      nom: '',
      email: '',
      fonction: '',

      typeUtilisateur: 'IT',
      roleId: null,

      motDePasse: '',

      createurId:
        this.getConnectedUserId()
    };
  }

  private createEmptyRoleForm():
    CreateRoleRequest {
    return {
      nomRole: '',
      description: '',
      typeRole: 'INTERNE',
      roleSysteme: false
    };
  }

  // =====================================================
  // VALIDATION DU DÉPARTEMENT
  // =====================================================

  private normalizeInternalType(
    value: unknown
  ): TypeUtilisateurInterne | null {
    const normalized = String(
      value || ''
    )
      .trim()
      .toUpperCase();

    const allowedTypes:
      TypeUtilisateurInterne[] = [
        'IT',
        'ACHAT',
        'COMITE',
        'TECHNIQUE'
      ];

    if (
      !allowedTypes.includes(
        normalized as TypeUtilisateurInterne
      )
    ) {
      return null;
    }

    return normalized as TypeUtilisateurInterne;
  }

  // =====================================================
  // SÉCURITÉ PROFIL ADMIN IT
  // =====================================================

  private isAdminItProfile(): boolean {

    const identity =
      this.readAccessIdentity();

    return (
      identity.role === 'ADMIN'
      &&
      identity.department === 'IT'
    );
  }


  private readAccessIdentity(): {
    role: string;
    department: string;
  } {

    const keys = [
      'elEmarUser',
      'connectedUser',
      'currentUser',
      'user'
    ];

    for (const key of keys) {

      const raw =
        localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      try {

        const value =
          JSON.parse(raw);

        const role =
          String(
            value?.roleCode
            ??
            value?.codeRole
            ??
            (
              typeof value?.role === 'string'
                ? value.role
                : value?.role?.codeRole
                  ?? value?.role?.code
            )
            ??
            ''
          )
            .trim()
            .toUpperCase();

        let department =
          String(
            value?.typeUtilisateur
            ??
            value?.departement
            ??
            ''
          )
            .trim()
            .toUpperCase();

        if (
          department === 'DA'
          ||
          department === 'ACHATS'
        ) {
          department = 'ACHAT';
        }

        if (
          role
          ||
          department
        ) {
          return {
            role,
            department
          };
        }

      } catch {
        // Essayer la clé suivante.
      }
    }

    let department =
      String(
        localStorage.getItem(
          'typeUtilisateur'
        )
        ||
        localStorage.getItem(
          'userType'
        )
        ||
        ''
      )
        .trim()
        .toUpperCase();

    if (
      department === 'DA'
      ||
      department === 'ACHATS'
    ) {
      department = 'ACHAT';
    }

    return {
      role:
        String(
          localStorage.getItem(
            'roleCode'
          )
          ||
          localStorage.getItem(
            'userRoleCode'
          )
          ||
          localStorage.getItem(
            'userRole'
          )
          ||
          ''
        )
          .trim()
          .toUpperCase(),

      department
    };
  }


  // =====================================================
  // HELPERS
  // =====================================================

  private getConnectedUserId():
    number | null {
    const value =
      localStorage.getItem('userId');

    return this.toPositiveNumberOrNull(
      value
    );
  }

  private toPositiveNumberOrNull(
    value: unknown
  ): number | null {
    if (
      value === null
      || value === undefined
      || value === ''
    ) {
      return null;
    }

    const numberValue = Number(value);

    if (
      !Number.isFinite(numberValue)
      || numberValue <= 0
    ) {
      return null;
    }

    return numberValue;
  }

  private isValidEmail(
    email: string
  ): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(email);
  }

  private normalizeSearch(
    value: string
  ): string {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private clearSuccessLater(): void {
    window.setTimeout(() => {
      this.successMessage = '';
    }, 3500);
  }

  private getDateStamp(): string {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }
}