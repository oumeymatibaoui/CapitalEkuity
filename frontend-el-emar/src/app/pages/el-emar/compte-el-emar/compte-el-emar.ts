import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize, forkJoin, timeout } from 'rxjs';

import {
  CreateUtilisateurRequest,
  UpdateUtilisateurAdminRequest,
  UtilisateurAdminResponse,
  UtilisateurAdminService
} from '../../../core/services/utilisateur-admin.service';

import {
  ModuleGroup,
  RoleAccess,
  RoleAccessService,
  RoleCategoryAccess
} from '../../../core/services/role-access.service';

export type TypeUtilisateurInterne =
  | 'IT'
  | 'ACHAT'
  | 'COMITE'
  | 'TECHNIQUE';

interface DepartementView {
  code: TypeUtilisateurInterne;
  libelle: string;
  description: string;
  icon: string;
  couleur: string;
}

type InternalUser = UtilisateurAdminResponse & {
  typeUtilisateur: TypeUtilisateurInterne | string;
};

type CreateInternalUserRequest = CreateUtilisateurRequest & {
  typeUtilisateur: TypeUtilisateurInterne;
  roleId: number;
};

type UpdateInternalUserRequest = UpdateUtilisateurAdminRequest & {
  typeUtilisateur: TypeUtilisateurInterne;
  roleId: number;
};

type ModalMode = 'CREATE' | 'EDIT';

@Component({
  selector: 'app-compte-el-emar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './compte-el-emar.html',
  styleUrl: './compte-el-emar.scss'
})
export class CompteElEmar implements OnInit {

  readonly departements: DepartementView[] = [
    {
      code: 'IT',
      libelle: 'Informatique',
      description: 'Administration, sécurité et support de la plateforme',
      icon: 'ti ti-device-desktop-cog',
      couleur: 'violet'
    },
    {
      code: 'ACHAT',
      libelle: 'Achat',
      description: 'Consultations, appels à candidature et achats',
      icon: 'ti ti-shopping-cart',
      couleur: 'bleu'
    },
    {
      code: 'COMITE',
      libelle: 'Comité',
      description: 'Évaluation, validation et prise de décision',
      icon: 'ti ti-users-group',
      couleur: 'orange'
    },
    {
      code: 'TECHNIQUE',
      libelle: 'Technique',
      description: 'Analyse et évaluation technique des dossiers',
      icon: 'ti ti-tool',
      couleur: 'vert'
    }
  ];

  utilisateurs: InternalUser[] = [];
  roles: RoleAccess[] = [];

  selectedDepartment: TypeUtilisateurInterne = 'IT';

  searchTerm = '';
  selectedRoleFilter = 'ALL';
  selectedStatusFilter = 'ALL';

  loading = false;
  loadingRoles = false;
  saving = false;
  savingStep = '';
  deleting = false;

  pageError = '';
  successMessage = '';
  modalError = '';

  showUserModal = false;
  showDeleteModal = false;

  modalMode: ModalMode = 'CREATE';

  editingUser: InternalUser | null = null;
  userToDelete: InternalUser | null = null;

  rolePreviewGroups: ModuleGroup[] = [];
  rolePreviewCategories: RoleCategoryAccess[] = [];

  loadingRolePreview = false;
  rolePreviewError = '';

  private rolePreviewRequestId = 0;

  readonly userForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly utilisateurAdminService: UtilisateurAdminService,
    private readonly roleAccessService: RoleAccessService
  ) {
    this.userForm = this.fb.group({
      nom: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],
      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],
      fonction: [''],
      typeUtilisateur: [
        'IT',
        Validators.required
      ],
      roleId: [
        null,
        Validators.required
      ],
      motDePasse: [
        '',
        [
          Validators.required,
          Validators.minLength(8)
        ]
      ],
      actif: [true]
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  // =====================================================
  // CHARGEMENT
  // =====================================================

  loadInitialData(): void {
    this.loading = true;
    this.loadingRoles = true;

    this.pageError = '';

    forkJoin({
      users: this.utilisateurAdminService
        .getAllUsers()
        .pipe(timeout(10000)),

      roles: this.roleAccessService
        .getRoles()
        .pipe(timeout(10000))
    }).subscribe({
      next: result => {
        this.utilisateurs = (result.users || [])
          // CND et anciennes valeurs sont exclus
          .filter(user =>
            this.isInternalType(user.typeUtilisateur)
          )
          .map(user => user as InternalUser)
          .sort((a, b) => this.compareUsers(a, b));

        this.roles = (result.roles || [])
          .filter(role => role.actif === true)
          .filter(role => {
            const typeRole = String(
              role.typeRole || 'INTERNE'
            ).toUpperCase();

            return typeRole === 'INTERNE';
          })
          .sort((a, b) =>
            String(a.nomRole || '').localeCompare(
              String(b.nomRole || ''),
              'fr',
              { sensitivity: 'base' }
            )
          );

        this.loading = false;
        this.loadingRoles = false;
      },

      error: error => {
        console.error(
          'ERROR LOAD USERS PAGE',
          error
        );

        this.loading = false;
        this.loadingRoles = false;

        this.pageError =
          this.extractErrorMessage(
            error,
            'Impossible de charger les utilisateurs et les rôles.'
          );
      }
    });
  }

  loadUtilisateurs(): void {
    this.loading = true;
    this.pageError = '';

    this.utilisateurAdminService
      .getAllUsers()
      .pipe(timeout(10000))
      .subscribe({
        next: data => {
          this.utilisateurs = (data || [])
            .filter(user =>
              this.isInternalType(user.typeUtilisateur)
            )
            .map(user => user as InternalUser)
            .sort((a, b) => this.compareUsers(a, b));

          this.loading = false;
        },

        error: error => {
          console.error(
            'ERROR LOAD USERS',
            error
          );

          this.loading = false;

          this.pageError =
            this.extractErrorMessage(
              error,
              'Impossible de charger les utilisateurs internes.'
            );
        }
      });
  }

  // =====================================================
  // DÉPARTEMENTS ET FILTRES
  // =====================================================

  selectDepartment(
    code: TypeUtilisateurInterne
  ): void {
    this.selectedDepartment = code;
  }

  get selectedDepartmentView(): DepartementView {
    return this.departements.find(
      item =>
        item.code === this.selectedDepartment
    )!;
  }

  get displayedUsers(): InternalUser[] {
    const term =
      this.searchTerm
        .trim()
        .toLowerCase();

    return this.utilisateurs.filter(user => {
      const userDepartment =
        this.normalizeInternalType(
          user.typeUtilisateur
        );

      if (
        userDepartment !==
        this.selectedDepartment
      ) {
        return false;
      }

      const roleId =
        this.resolveUserRoleId(user);

      const matchesRole =
        this.selectedRoleFilter === 'ALL' ||
        Number(this.selectedRoleFilter) ===
          roleId;

      const matchesStatus =
        this.selectedStatusFilter === 'ALL' ||
        (
          this.selectedStatusFilter === 'ACTIVE' &&
          user.actif === true
        ) ||
        (
          this.selectedStatusFilter === 'INACTIVE' &&
          user.actif !== true
        );

      const searchableText = [
        user.nom,
        user.email,
        user.fonction,
        user.roleNom,
        user.roleCode
      ]
        .map(value =>
          String(value || '').toLowerCase()
        )
        .join(' ');

      const matchesSearch =
        !term ||
        searchableText.includes(term);

      return (
        matchesRole &&
        matchesStatus &&
        matchesSearch
      );
    });
  }

  getDepartmentCount(
    code: TypeUtilisateurInterne
  ): number {
    return this.utilisateurs.filter(
      user =>
        this.normalizeInternalType(
          user.typeUtilisateur
        ) === code
    ).length;
  }

  getDepartmentActiveCount(
    code: TypeUtilisateurInterne
  ): number {
    return this.utilisateurs.filter(
      user =>
        this.normalizeInternalType(
          user.typeUtilisateur
        ) === code &&
        user.actif === true
    ).length;
  }

  get totalActiveUsers(): number {
    return this.utilisateurs.filter(
      user => user.actif === true
    ).length;
  }

  onSearch(event: Event): void {
    this.searchTerm =
      (event.target as HTMLInputElement)
        .value || '';
  }

  onRoleFilter(event: Event): void {
    this.selectedRoleFilter =
      (event.target as HTMLSelectElement)
        .value || 'ALL';
  }

  onStatusFilter(event: Event): void {
    this.selectedStatusFilter =
      (event.target as HTMLSelectElement)
        .value || 'ALL';
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedRoleFilter = 'ALL';
    this.selectedStatusFilter = 'ALL';
  }

  // =====================================================
  // OUVERTURE MODALE
  // =====================================================

  openCreateModal(
    typeUtilisateur:
      TypeUtilisateurInterne =
        this.selectedDepartment
  ): void {
    this.modalMode = 'CREATE';
    this.editingUser = null;

    this.modalError = '';
    this.successMessage = '';

    this.clearRolePreview();

    this.userForm
      .get('motDePasse')
      ?.setValidators([
        Validators.required,
        Validators.minLength(8)
      ]);

    this.userForm.reset({
      nom: '',
      email: '',
      fonction: '',
      typeUtilisateur,
      roleId: null,
      motDePasse: '',
      actif: true
    });

    this.userForm
      .get('motDePasse')
      ?.updateValueAndValidity();

    this.showUserModal = true;
  }

  openEditModal(
    user: InternalUser
  ): void {
    if (!user?.id) {
      this.pageError =
        'Utilisateur introuvable.';
      return;
    }

    this.modalMode = 'EDIT';
    this.editingUser = user;

    this.modalError = '';
    this.successMessage = '';

    this.clearRolePreview();

    // Mot de passe non demandé lors de la modification
    this.userForm
      .get('motDePasse')
      ?.clearValidators();

    this.userForm
      .get('motDePasse')
      ?.updateValueAndValidity();

    const roleId =
      this.resolveUserRoleId(user);

    this.userForm.reset({
      nom: user.nom || '',
      email: user.email || '',
      fonction: user.fonction || '',
      typeUtilisateur:
        this.normalizeInternalType(
          user.typeUtilisateur
        ) || this.selectedDepartment,
      roleId,
      motDePasse: '',
      actif: user.actif === true
    });

    this.showUserModal = true;

    if (roleId) {
      this.loadRolePreview(roleId);
    }
  }

  closeUserModal(): void {
    if (this.saving) {
      return;
    }

    this.showUserModal = false;
    this.editingUser = null;
    this.modalError = '';

    this.clearRolePreview();
  }

  // =====================================================
  // CRÉATION ET MODIFICATION
  // =====================================================

  saveUser(): void {
    this.modalError = '';

    this.userForm.markAllAsTouched();

    if (this.userForm.invalid) {
      this.modalError =
        'Veuillez corriger les champs obligatoires.';
      return;
    }

    const typeUtilisateur =
      this.normalizeInternalType(
        this.userForm
          .get('typeUtilisateur')
          ?.value
      );

    const roleId = Number(
      this.userForm
        .get('roleId')
        ?.value
    );

    if (!typeUtilisateur) {
      this.modalError =
        'Le département sélectionné est invalide.';
      return;
    }

    const selectedRole =
      this.roles.find(
        role =>
          Number(role.id) === roleId
      );

    if (!selectedRole) {
      this.modalError =
        'Le rôle sélectionné est invalide ou inactif.';
      return;
    }

    if (this.modalMode === 'CREATE') {
      this.createUser(
        typeUtilisateur,
        roleId
      );
    } else {
      this.updateUser(
        typeUtilisateur,
        roleId
      );
    }
  }

  private createUser(
    typeUtilisateur: TypeUtilisateurInterne,
    roleId: number
  ): void {
    const request:
      CreateInternalUserRequest = {
        nom: this.cleanControl('nom'),
        email: this
          .cleanControl('email')
          .toLowerCase(),
        fonction:
          this.cleanControl('fonction'),
        motDePasse: String(
          this.userForm
            .get('motDePasse')
            ?.value || ''
        ),
        typeUtilisateur,
        roleId,
        createurId:
          this.getCurrentUserId()
      };

    this.saving = true;
    this.savingStep =
      'Création du compte...';

    this.utilisateurAdminService
      .createUser(request)
      .pipe(
        timeout(20000),
        finalize(() => {
          this.saving = false;
          this.savingStep = '';
        })
      )
      .subscribe({
        next: created => {
          this.showUserModal = false;

          this.selectedDepartment =
            typeUtilisateur;

          this.successMessage =
            `Le compte de ${
              created.nom || request.nom
            } a été créé avec succès.`;

          this.clearRolePreview();
          this.loadUtilisateurs();
        },

        error: error => {
          console.error(
            'ERROR CREATE USER',
            error
          );

          this.modalError =
            error?.name === 'TimeoutError'
              ? 'Le serveur ne répond pas pendant la création du compte. Vérifiez le backend et les verrous de la base de données.'
              : this.extractErrorMessage(
                  error,
                  error?.status === 409
                    ? 'Un compte utilise déjà cette adresse email.'
                    : 'Erreur lors de la création du compte.'
                );
        }
      });
  }

  private updateUser(
    typeUtilisateur: TypeUtilisateurInterne,
    roleId: number
  ): void {
    if (!this.editingUser?.id) {
      this.modalError =
        'Utilisateur à modifier introuvable.';
      return;
    }

    const request:
      UpdateInternalUserRequest = {
        nom: this.cleanControl('nom'),
        email: this
          .cleanControl('email')
          .toLowerCase(),
        fonction:
          this.cleanControl('fonction'),
        typeUtilisateur,
        roleId,
        actif:
          this.userForm
            .get('actif')
            ?.value === true,
        modificateurId:
          this.getCurrentUserId()
      };

    const userId =
      this.editingUser.id;

    this.saving = true;
    this.savingStep =
      'Mise à jour du compte...';

    console.log(
      'START UPDATE USER',
      {
        userId,
        request
      }
    );

    this.utilisateurAdminService
      .updateUser(userId, request)
      .pipe(
        timeout(20000),
        finalize(() => {
          this.saving = false;
          this.savingStep = '';
        })
      )
      .subscribe({
        next: updated => {
          console.log(
            'UPDATE USER SUCCESS',
            updated
          );

          this.showUserModal = false;
          this.editingUser = null;

          this.selectedDepartment =
            typeUtilisateur;

          this.successMessage =
            `Le compte de ${
              updated.nom || request.nom
            } a été modifié avec succès.`;

          this.clearRolePreview();
          this.loadUtilisateurs();
        },

        error: error => {
          console.error(
            'UPDATE USER REQUEST FAILED',
            error
          );

          this.modalError =
            error?.name === 'TimeoutError'
              ? 'Le backend ne répond pas pendant la modification du compte. La requête a été arrêtée après 20 secondes.'
              : this.extractErrorMessage(
                  error,
                  error?.status === 409
                    ? 'Un autre compte utilise déjà cette adresse email.'
                    : 'Erreur lors de la modification du compte.'
                );
        }
      });
  }

  // =====================================================
  // APERÇU DU RÔLE
  // =====================================================

  onRoleChange(): void {
    const roleId = Number(
      this.userForm
        .get('roleId')
        ?.value
    );

    if (!roleId) {
      this.clearRolePreview();
      return;
    }

    this.loadRolePreview(roleId);
  }

  private loadRolePreview(
    roleId: number
  ): void {
    const requestId =
      ++this.rolePreviewRequestId;

    this.loadingRolePreview = true;
    this.rolePreviewError = '';

    this.rolePreviewGroups = [];
    this.rolePreviewCategories = [];

    forkJoin({
      modules:
        this.roleAccessService
          .getModulesByRole(roleId)
          .pipe(
            timeout(15000)
          ),

      categories:
        this.roleAccessService
          .getCategoriesByRole(roleId)
          .pipe(
            timeout(15000)
          )
    })
      .pipe(
        finalize(() => {
          if (
            requestId ===
            this.rolePreviewRequestId
          ) {
            this.loadingRolePreview = false;
          }
        })
      )
      .subscribe({
        next: result => {
          if (
            requestId !==
            this.rolePreviewRequestId
          ) {
            return;
          }

          this.rolePreviewGroups =
            (result.modules || [])
              .map(group => ({
                ...group,
                modules:
                  (group.modules || [])
                    .filter(
                      module =>
                        module.autorise === true
                    )
              }))
              .filter(
                group =>
                  group.modules.length > 0
              );

          this.rolePreviewCategories =
            (result.categories || [])
              .filter(
                category =>
                  category.autorise === true
              );
        },

        error: error => {
          if (
            requestId !==
            this.rolePreviewRequestId
          ) {
            return;
          }

          console.error(
            'ERROR ROLE PREVIEW',
            error
          );

          this.rolePreviewError =
            error?.name === 'TimeoutError'
              ? 'Le chargement des accès dépasse 15 secondes. Vérifiez le backend des modules et catégories.'
              : this.extractErrorMessage(
                  error,
                  'Impossible de charger les accès de ce rôle.'
                );
        }
      });
  }

  private clearRolePreview(): void {
    this.rolePreviewRequestId++;

    this.loadingRolePreview = false;
    this.rolePreviewError = '';

    this.rolePreviewGroups = [];
    this.rolePreviewCategories = [];
  }

  get previewModuleCount(): number {
    return this.rolePreviewGroups.reduce(
      (total, group) =>
        total +
        (group.modules || []).length,
      0
    );
  }

  get selectedRole(): RoleAccess | null {
    const roleId = Number(
      this.userForm
        .get('roleId')
        ?.value
    );

    return this.roles.find(
      role =>
        Number(role.id) === roleId
    ) || null;
  }

  // =====================================================
  // STATUT
  // =====================================================

  toggleActif(
    user: InternalUser
  ): void {
    if (!user?.id) {
      return;
    }

    this.pageError = '';
    this.successMessage = '';

    this.utilisateurAdminService
      .toggleActif(user.id)
      .pipe(
        timeout(15000)
      )
      .subscribe({
        next: updated => {
          user.actif = updated.actif;
          user.updatedAt =
            updated.updatedAt;

          this.successMessage =
            updated.actif
              ? 'Le compte a été activé.'
              : 'Le compte a été désactivé.';
        },

        error: error => {
          console.error(
            'ERROR TOGGLE USER',
            error
          );

          this.pageError =
            error?.name === 'TimeoutError'
              ? 'Le serveur ne répond pas pendant la modification du statut.'
              : this.extractErrorMessage(
                  error,
                  'Impossible de modifier le statut du compte.'
                );
        }
      });
  }

  // =====================================================
  // SUPPRESSION
  // =====================================================

  openDeleteModal(
    user: InternalUser
  ): void {
    if (this.isCurrentUser(user)) {
      this.pageError =
        'Vous ne pouvez pas supprimer votre propre compte.';
      return;
    }

    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.deleting) {
      return;
    }

    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  confirmDelete(): void {
    if (!this.userToDelete?.id) {
      return;
    }

    const userId =
      this.userToDelete.id;

    const userName =
      this.userToDelete.nom ||
      this.userToDelete.email ||
      'Utilisateur';

    this.deleting = true;

    this.utilisateurAdminService
      .deleteUser(
        userId,
        this.getCurrentUserId()
      )
      .pipe(
        timeout(20000),
        finalize(() => {
          this.deleting = false;
        })
      )
      .subscribe({
        next: () => {
          this.showDeleteModal = false;
          this.userToDelete = null;

          this.successMessage =
            `Le compte « ${userName} » a été supprimé.`;

          this.loadUtilisateurs();
        },

        error: error => {
          console.error(
            'ERROR DELETE USER',
            error
          );

          this.pageError =
            error?.name === 'TimeoutError'
              ? 'Le serveur ne répond pas pendant la suppression du compte.'
              : this.extractErrorMessage(
                  error,
                  error?.status === 409
                    ? 'Ce compte est lié à des données. Désactivez-le au lieu de le supprimer.'
                    : 'Impossible de supprimer ce compte.'
                );
        }
      });
  }

  // =====================================================
  // AFFICHAGE
  // =====================================================

  getRoleName(
    user: InternalUser
  ): string {
    if (user.roleNom) {
      return user.roleNom;
    }

    const roleId =
      this.resolveUserRoleId(user);

    return this.roles.find(
      role =>
        Number(role.id) === roleId
    )?.nomRole || '-';
  }

  getDepartmentLabel(
    value?: string | null
  ): string {
    const code =
      this.normalizeInternalType(value);

    return this.departements.find(
      item => item.code === code
    )?.libelle || '-';
  }

  private resolveUserRoleId(
    user: InternalUser
  ): number | null {
    if (
      user.roleId !== null &&
      user.roleId !== undefined
    ) {
      return Number(user.roleId);
    }

    const roleCode = String(
      user.roleCode || ''
    )
      .trim()
      .toUpperCase();

    const role =
      this.roles.find(
        item =>
          String(item.codeRole || '')
            .trim()
            .toUpperCase() === roleCode
      );

    return role
      ? Number(role.id)
      : null;
  }

  private isInternalType(
    value: unknown
  ): boolean {
    return (
      this.normalizeInternalType(value) !==
      null
    );
  }

  private normalizeInternalType(
    value: unknown
  ): TypeUtilisateurInterne | null {
    const code = String(value || '')
      .trim()
      .toUpperCase();

    if (
      code === 'IT' ||
      code === 'ACHAT' ||
      code === 'COMITE' ||
      code === 'TECHNIQUE'
    ) {
      return code;
    }

    // CND, ADMIN, EL_EMAR, DA sont exclus
    return null;
  }

  private cleanControl(
    name: string
  ): string {
    return String(
      this.userForm.get(name)?.value || ''
    ).trim();
  }

  hasError(
    controlName: string,
    errorName: string
  ): boolean {
    const control =
      this.userForm.get(controlName);

    return !!control &&
      control.touched &&
      control.hasError(errorName);
  }

  formatDate(
    value?: string | null
  ): string {
    if (!value) {
      return '-';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return value;
    }

    return date.toLocaleDateString(
      'fr-FR',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );
  }

  isCurrentUser(
    user: InternalUser
  ): boolean {
    const currentId =
      this.getCurrentUserId();

    return currentId !== null &&
      Number(user.id) === currentId;
  }

  trackByDepartment(
    _index: number,
    item: DepartementView
  ): string {
    return item.code;
  }

  trackByUserId(
    _index: number,
    item: InternalUser
  ): number {
    return item.id;
  }

  trackByRoleId(
    _index: number,
    item: RoleAccess
  ): number {
    return item.id;
  }

  trackByModuleId(
    _index: number,
    item: any
  ): number {
    return Number(
      item.moduleId ||
      item.id ||
      0
    );
  }

  trackByCategoryId(
    _index: number,
    item: RoleCategoryAccess
  ): number {
    return Number(
      item.categorieId || 0
    );
  }

  private compareUsers(
    a: InternalUser,
    b: InternalUser
  ): number {
    return String(
      a.nom || a.email || ''
    ).localeCompare(
      String(
        b.nom || b.email || ''
      ),
      'fr',
      { sensitivity: 'base' }
    );
  }

  private extractErrorMessage(
    error: any,
    fallback: string
  ): string {
    return (
      error?.error?.message ||
      error?.error?.detail ||
      fallback
    );
  }

  private getCurrentUserId(): number | null {
    const directId =
      localStorage.getItem('userId');

    if (
      directId &&
      !Number.isNaN(Number(directId))
    ) {
      return Number(directId);
    }

    const keys = [
      'connectedUser',
      'currentUser',
      'user',
      'authUser'
    ];

    for (const key of keys) {
      const value =
        localStorage.getItem(key);

      if (!value) {
        continue;
      }

      try {
        const parsed =
          JSON.parse(value);

        const id =
          parsed?.id ??
          parsed?.userId ??
          parsed?.utilisateurId;

        if (
          id !== null &&
          id !== undefined &&
          !Number.isNaN(Number(id))
        ) {
          return Number(id);
        }
      } catch {
        continue;
      }
    }

    return null;
  }
}