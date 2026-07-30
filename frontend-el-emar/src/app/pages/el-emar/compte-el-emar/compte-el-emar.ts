import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';

import {
  interval,
  Subscription,
  timeout
} from 'rxjs';

import {
  CreateUtilisateurRequest,
  UpdateUtilisateurAdminRequest,
  UtilisateurAdminResponse,
  UtilisateurAdminService
} from '../../../core/services/utilisateur-admin.service';
import {
  RoleAccess,
  RoleAccessService
} from '../../../core/services/role-access.service';

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
export class CompteElEmar implements OnInit, OnDestroy {

  utilisateurs: UtilisateurAdminResponse[] = [];
  filteredUtilisateurs: UtilisateurAdminResponse[] = [];

  /**
   * Rôles dynamiques récupérés depuis role_acces.
   */
  roles: RoleAccess[] = [];

  createForm: FormGroup;
// editForm: FormGroup;
editForm: FormGroup;

showEditModal = false;
showDeleteModal = false;

editingUser: UtilisateurAdminResponse | null = null;
userToDelete: UtilisateurAdminResponse | null = null;

savingEdit = false;
deletingUser = false;
  loading = false;
  loadingRoles = false;
  creating = false;

  pageError = '';
  successMessage = '';

  createSuccessMessage = '';
  createErrorMessage = '';

  searchTerm = '';
  selectedRoleFilter = 'ALL';

  private autoRefreshSub?: Subscription;

  /**
   * Cette déclaration doit rester sur une seule ligne.
   */
  private readonly AUTO_REFRESH_INTERVAL_MS = 15000;

constructor(
  private fb: FormBuilder,
  private utilisateurAdminService: UtilisateurAdminService,
  private roleAccessService: RoleAccessService
) {
  this.createForm = this.fb.group({
    nom: [''],
    email: [''],
    fonction: [''],
    roleId: [null],
    motDePasse: ['']
  });

  this.editForm = this.fb.group({
    nom: [''],
    email: [''],
    fonction: [''],
    roleId: [null],
    actif: [true]
  });
}

  ngOnInit(): void {
    this.loadRoles();
    this.loadUtilisateurs();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  // =====================================================
  // CHARGEMENT DES RÔLES
  // =====================================================

  loadRoles(): void {
    this.loadingRoles = true;
    this.pageError = '';

    this.roleAccessService.getRoles().subscribe({
      next: (data: RoleAccess[]) => {
        this.roles = (data || [])
          .filter((role: RoleAccess) => {
            const typeRole = String(
              role.typeRole || 'INTERNE'
            ).toUpperCase();

            return role.actif === true && typeRole === 'INTERNE';
          })
          .sort((a: RoleAccess, b: RoleAccess) =>
            String(a.nomRole || '').localeCompare(
              String(b.nomRole || ''),
              'fr'
            )
          );

        this.loadingRoles = false;
      },

      error: (error: any) => {
        console.error('ERROR LOAD ROLES', error);

        this.roles = [];
        this.loadingRoles = false;

        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors du chargement des rôles.';
      }
    });
  }

  // =====================================================
  // CHARGEMENT DES UTILISATEURS
  // =====================================================

  loadUtilisateurs(): void {
    this.loading = true;
    this.pageError = '';
    this.successMessage = '';

    this.utilisateurAdminService
      .getAllUsers()
      .pipe(timeout(10000))
      .subscribe({
        next: (data: UtilisateurAdminResponse[]) => {
          this.utilisateurs = data || [];
          this.applyFilters();
          this.loading = false;
        },

        error: (error: any) => {
          console.error('ERROR LOAD USERS', error);

          this.loading = false;

          this.pageError =
            error?.name === 'TimeoutError'
              ? 'Le serveur met trop de temps à répondre.'
              : error?.error?.message ||
                error?.error?.detail ||
                'Erreur lors du chargement des utilisateurs internes.';
        }
      });
  }

  // =====================================================
  // ACTUALISATION AUTOMATIQUE
  // =====================================================

  private startAutoRefresh(): void {
    this.stopAutoRefresh();

    this.autoRefreshSub = interval(
      this.AUTO_REFRESH_INTERVAL_MS
    ).subscribe(() => {
      this.refreshUsersSilently();
    });
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshSub) {
      this.autoRefreshSub.unsubscribe();
      this.autoRefreshSub = undefined;
    }
  }

  private refreshUsersSilently(): void {
    this.utilisateurAdminService.getAllUsers().subscribe({
      next: (data: UtilisateurAdminResponse[]) => {
        this.utilisateurs = data || [];
        this.applyFilters();
      },

      error: (error: any) => {
        console.error('ERROR AUTO REFRESH USERS', error);
      }
    });
  }

  // =====================================================
  // CRÉATION D’UN UTILISATEUR
  // =====================================================

  createUtilisateur(): void {
    this.pageError = '';
    this.successMessage = '';
    this.createSuccessMessage = '';
    this.createErrorMessage = '';

    const nom = String(
      this.createForm.get('nom')?.value || ''
    ).trim();

    const email = String(
      this.createForm.get('email')?.value || ''
    )
      .trim()
      .toLowerCase();

    const fonction = String(
      this.createForm.get('fonction')?.value || ''
    ).trim();

    const motDePasse = String(
      this.createForm.get('motDePasse')?.value || ''
    ).trim();

    const rawRoleId = this.createForm.get('roleId')?.value;

    const roleId =
      rawRoleId !== null &&
      rawRoleId !== undefined &&
      rawRoleId !== ''
        ? Number(rawRoleId)
        : null;

    if (!nom) {
      this.createErrorMessage = 'Le nom est obligatoire.';
      return;
    }

    if (!email) {
      this.createErrorMessage = 'L’email est obligatoire.';
      return;
    }

    if (!this.isValidEmail(email)) {
      this.createErrorMessage =
        'Veuillez saisir une adresse email valide.';
      return;
    }

    if (!roleId || isNaN(roleId)) {
      this.createErrorMessage =
        'Veuillez sélectionner un rôle.';
      return;
    }

    if (!motDePasse) {
      this.createErrorMessage =
        'Le mot de passe temporaire est obligatoire.';
      return;
    }

    if (motDePasse.length < 6) {
      this.createErrorMessage =
        'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    const selectedRole = this.roles.find(
      (role: RoleAccess) =>
        Number(role.id) === Number(roleId)
    );

    if (!selectedRole) {
      this.createErrorMessage =
        'Le rôle sélectionné est introuvable ou inactif.';
      return;
    }

    const request: CreateUtilisateurRequest = {
      nom,
      email,
      fonction,
      motDePasse,
      roleId: selectedRole.id,
      createurId: this.getCurrentUserId()
    };

    this.creating = true;

    this.utilisateurAdminService.createUser(request).subscribe({
      next: (createdUser: UtilisateurAdminResponse) => {
        this.creating = false;

        this.createSuccessMessage =
          `Compte interne créé avec succès pour ${
            createdUser.email || email
          }.`;

        this.createErrorMessage = '';

        this.createForm.reset({
          nom: '',
          email: '',
          fonction: '',
          roleId: null,
          motDePasse: ''
        });

        this.loadUtilisateurs();
      },

      error: (error: any) => {
        console.error('ERROR CREATE USER', error);

        this.creating = false;
        this.createSuccessMessage = '';

        if (error?.status === 409) {
          this.createErrorMessage =
            error?.error?.message ||
            'Un compte avec cet email existe déjà.';

          return;
        }

        if (error?.status === 400) {
          this.createErrorMessage =
            error?.error?.message ||
            error?.error?.detail ||
            'Les informations saisies sont invalides.';

          return;
        }

        this.createErrorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          error?.message ||
          'Erreur lors de la création de l’utilisateur.';
      }
    });
  }

  // =====================================================
  // MODIFICATION DU RÔLE
  // =====================================================

  updateRole(
    user: UtilisateurAdminResponse,
    event: Event
  ): void {
    const select = event.target as HTMLSelectElement;
    const newRoleId = Number(select.value);

    if (!user?.id) {
      this.pageError = 'Utilisateur introuvable.';
      return;
    }

    if (!newRoleId || isNaN(newRoleId)) {
      this.pageError = 'Veuillez sélectionner un rôle valide.';
      return;
    }

    const selectedRole = this.roles.find(
      (role: RoleAccess) =>
        Number(role.id) === Number(newRoleId)
    );

    if (!selectedRole) {
      this.pageError =
        'Le rôle sélectionné est introuvable ou inactif.';
      return;
    }

    if (Number(user.roleId) === Number(selectedRole.id)) {
      return;
    }

    this.pageError = '';
    this.successMessage = '';

    this.utilisateurAdminService.updateRole(
      user.id,
      {
        roleId: selectedRole.id,
        modificateurId: this.getCurrentUserId()
      }
    ).subscribe({
      next: (updated: UtilisateurAdminResponse) => {
        user.roleId = updated.roleId;
        user.roleCode = updated.roleCode;
        user.roleNom = updated.roleNom;
        user.typeUtilisateur = updated.typeUtilisateur;
        user.updatedAt = updated.updatedAt;

        this.successMessage =
          `Le rôle de ${user.nom || user.email || 'l’utilisateur'} a été modifié.`;

        this.pageError = '';
        this.applyFilters();
      },

      error: (error: any) => {
        console.error('ERROR UPDATE ROLE', error);

        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors de la modification du rôle.';

        /*
         * Recharge les données pour remettre le select
         * sur la vraie valeur enregistrée dans la base.
         */
        this.loadUtilisateurs();
      }
    });
  }

  // =====================================================
  // ACTIVER / DÉSACTIVER
  // =====================================================

  toggleActif(user: UtilisateurAdminResponse): void {
    if (!user?.id) {
      this.pageError = 'Utilisateur introuvable.';
      return;
    }

    this.pageError = '';
    this.successMessage = '';

    this.utilisateurAdminService.toggleActif(user.id).subscribe({
      next: (updated: UtilisateurAdminResponse) => {
        user.actif = updated.actif;
        user.updatedAt = updated.updatedAt;

        this.successMessage =
          updated.actif === true
            ? 'Compte activé avec succès.'
            : 'Compte désactivé avec succès.';

        this.applyFilters();
      },

      error: (error: any) => {
        console.error('ERROR TOGGLE USER', error);

        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors du changement de statut.';
      }
    });
  }

  // =====================================================
  // FILTRES
  // =====================================================

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchTerm = input.value || '';
    this.applyFilters();
  }

  onRoleFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.selectedRoleFilter =
      String(select.value || 'ALL').toUpperCase();

    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm
      .trim()
      .toLowerCase();

    const selectedRole = String(
      this.selectedRoleFilter || 'ALL'
    ).toUpperCase();

    this.filteredUtilisateurs = this.utilisateurs.filter(
      (user: UtilisateurAdminResponse) => {
        const nom = String(user.nom || '').toLowerCase();
        const email = String(user.email || '').toLowerCase();
        const fonction = String(user.fonction || '').toLowerCase();

        const matchText =
          !term ||
          nom.includes(term) ||
          email.includes(term) ||
          fonction.includes(term);

        const currentRole = String(
          user.roleCode ||
          user.typeUtilisateur ||
          ''
        ).toUpperCase();

        const matchRole =
          selectedRole === 'ALL' ||
          currentRole === selectedRole;

        return matchText && matchRole;
      }
    );
  }

  // =====================================================
  // INFORMATIONS D’AFFICHAGE
  // =====================================================

  getActiveCount(): number {
    return this.utilisateurs.filter(
      (user: UtilisateurAdminResponse) =>
        user.actif === true
    ).length;
  }

  getInactiveCount(): number {
    return this.utilisateurs.filter(
      (user: UtilisateurAdminResponse) =>
        user.actif !== true
    ).length;
  }

  getRoleLabel(roleCode?: string | null): string {
    const code = String(roleCode || '')
      .trim()
      .toUpperCase();

    const dynamicRole = this.roles.find(
      (role: RoleAccess) =>
        String(role.codeRole || '')
          .trim()
          .toUpperCase() === code
    );

    if (dynamicRole?.nomRole) {
      return dynamicRole.nomRole;
    }

    switch (code) {
      case 'EL_EMAR':
        return 'Utilisateur El Emar';

      case 'DA':
        return 'Direction des achats';

      case 'IT':
        return 'IT';

      case 'ADMIN':
        return 'Administrateur';

      case 'CND':
        return 'Candidat';

      default:
        return roleCode || '-';
    }
  }

  getRoleClass(roleCode?: string | null): string {
    const value = String(roleCode || '')
      .trim()
      .toUpperCase();

    switch (value) {
      case 'EL_EMAR':
        return 'role-el-emar';

      case 'DA':
        return 'role-da';

      case 'IT':
        return 'role-it';

      case 'ADMIN':
        return 'role-admin';

      default:
        return 'role-default';
    }
  }

  getRoleSelectionValue(
    user: UtilisateurAdminResponse
  ): number | null {
    if (
      user.roleId !== null &&
      user.roleId !== undefined
    ) {
      return Number(user.roleId);
    }

    /*
     * Compatibilité avec les anciens utilisateurs
     * qui possèdent seulement typeUtilisateur.
     */
    const code = String(
      user.roleCode ||
      user.typeUtilisateur ||
      ''
    )
      .trim()
      .toUpperCase();

    const role = this.roles.find(
      (item: RoleAccess) =>
        String(item.codeRole || '')
          .trim()
          .toUpperCase() === code
    );

    return role ? Number(role.id) : null;
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  trackByUserId(
    _index: number,
    user: UtilisateurAdminResponse
  ): number {
    return user.id;
  }

  // =====================================================
  // HELPERS
  // =====================================================

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getCurrentUserId(): number | null {
    const directUserId = localStorage.getItem('userId');

    if (
      directUserId &&
      !isNaN(Number(directUserId))
    ) {
      return Number(directUserId);
    }

    const keys = [
      'connectedUser',
      'currentUser',
      'user',
      'authUser',
      'elEmarUser',
      'elEmarConnectedUser'
    ];

    for (const key of keys) {
      const value = localStorage.getItem(key);

      if (!value) {
        continue;
      }

      try {
        const parsed = JSON.parse(value);

        const parsedId =
          parsed?.id ??
          parsed?.userId ??
          parsed?.utilisateurId ??
          null;

        if (
          parsedId !== null &&
          parsedId !== undefined &&
          !isNaN(Number(parsedId))
        ) {
          return Number(parsedId);
        }
      } catch {
        continue;
      }
    }

    return null;
  }
  // =====================================================
// MODIFICATION COMPLÈTE D’UN UTILISATEUR
// =====================================================
isCurrentUser(
  user: UtilisateurAdminResponse
): boolean {
  const currentUserId =
    this.getCurrentUserId();

  return (
    currentUserId !== null &&
    Number(currentUserId) === Number(user.id)
  );
}
openEditUser(
  user: UtilisateurAdminResponse
): void {
  if (!user?.id) {
    this.pageError =
      'Utilisateur introuvable.';
    return;
  }

  this.pageError = '';
  this.successMessage = '';

  this.editingUser = user;

  this.editForm.reset({
    nom: user.nom || '',
    email: user.email || '',
    fonction: user.fonction || '',
    roleId: this.getRoleSelectionValue(user),
    actif: user.actif === true
  });

  this.stopAutoRefresh();
  this.showEditModal = true;
}

closeEditModal(): void {
  if (this.savingEdit) {
    return;
  }

  this.showEditModal = false;
  this.editingUser = null;

  this.editForm.reset({
    nom: '',
    email: '',
    fonction: '',
    roleId: null,
    actif: true
  });

  this.startAutoRefresh();
}

saveEditedUser(): void {
  if (!this.editingUser?.id) {
    this.pageError =
      'Utilisateur à modifier introuvable.';
    return;
  }

  const nom = String(
    this.editForm.get('nom')?.value || ''
  ).trim();

  const email = String(
    this.editForm.get('email')?.value || ''
  )
    .trim()
    .toLowerCase();

  const fonction = String(
    this.editForm.get('fonction')?.value || ''
  ).trim();

  const rawRoleId =
    this.editForm.get('roleId')?.value;

  const roleId =
    rawRoleId !== null &&
    rawRoleId !== undefined &&
    rawRoleId !== ''
      ? Number(rawRoleId)
      : null;

  const actif =
    this.editForm.get('actif')?.value === true;

  if (!nom) {
    this.pageError =
      'Le nom est obligatoire.';
    return;
  }

  if (!email) {
    this.pageError =
      'L’email est obligatoire.';
    return;
  }

  if (!this.isValidEmail(email)) {
    this.pageError =
      'Veuillez saisir une adresse email valide.';
    return;
  }

  if (!roleId || isNaN(roleId)) {
    this.pageError =
      'Veuillez sélectionner un rôle.';
    return;
  }

  const selectedRole = this.roles.find(
    role => Number(role.id) === Number(roleId)
  );

  if (!selectedRole) {
    this.pageError =
      'Le rôle sélectionné est introuvable ou inactif.';
    return;
  }

  const request: UpdateUtilisateurAdminRequest = {
    nom,
    email,
    fonction,
    roleId: selectedRole.id,
    actif,
    modificateurId: this.getCurrentUserId()
  };

  const utilisateurId = this.editingUser.id;

  this.pageError = '';
  this.successMessage = '';
  this.savingEdit = true;

  this.utilisateurAdminService
    .updateUser(utilisateurId, request)
    .subscribe({
      next: (
        updatedUser: UtilisateurAdminResponse
      ) => {
        this.savingEdit = false;
        this.showEditModal = false;
        this.editingUser = null;

        this.editForm.reset({
          nom: '',
          email: '',
          fonction: '',
          roleId: null,
          actif: true
        });

        this.successMessage =
          `Le compte de ${
            updatedUser.nom ||
            updatedUser.email ||
            'l’utilisateur'
          } a été modifié avec succès.`;

        this.loadUtilisateurs();
        this.startAutoRefresh();
      },

      error: (error: any) => {
        console.error(
          'ERROR UPDATE USER',
          error
        );

        this.savingEdit = false;

        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          (
            error?.status === 409
              ? 'Un autre compte utilise déjà cet email.'
              : 'Erreur lors de la modification du compte.'
          );
      }
    });
}
// =====================================================
// SUPPRESSION D’UN UTILISATEUR
// =====================================================

openDeleteUser(
  user: UtilisateurAdminResponse
): void {
  if (!user?.id) {
    this.pageError =
      'Utilisateur introuvable.';
    return;
  }

  if (this.isCurrentUser(user)) {
    this.pageError =
      'Vous ne pouvez pas supprimer votre propre compte.';
    return;
  }

  this.pageError = '';
  this.successMessage = '';

  this.userToDelete = user;

  this.stopAutoRefresh();
  this.showDeleteModal = true;
}

closeDeleteModal(): void {
  if (this.deletingUser) {
    return;
  }

  this.showDeleteModal = false;
  this.userToDelete = null;

  this.startAutoRefresh();
}

confirmDeleteUser(): void {
  if (!this.userToDelete?.id) {
    return;
  }

  const utilisateurId =
    this.userToDelete.id;

  const utilisateurNom =
    this.userToDelete.nom ||
    this.userToDelete.email ||
    'Utilisateur';

  this.pageError = '';
  this.successMessage = '';
  this.deletingUser = true;

  this.utilisateurAdminService
    .deleteUser(
      utilisateurId,
      this.getCurrentUserId()
    )
    .subscribe({
      next: () => {
        this.deletingUser = false;
        this.showDeleteModal = false;
        this.userToDelete = null;

        this.successMessage =
          `Le compte "${utilisateurNom}" a été supprimé définitivement.`;

        this.loadUtilisateurs();
        this.startAutoRefresh();
      },

      error: (error: any) => {
        console.error(
          'ERROR DELETE USER',
          error
        );

        this.deletingUser = false;

        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          (
            error?.status === 409
              ? 'Ce compte est lié à des données. Désactivez-le au lieu de le supprimer.'
              : 'Erreur lors de la suppression du compte.'
          );
      }
    });
}
}