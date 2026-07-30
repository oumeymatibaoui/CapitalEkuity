import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CreateRoleRequest,
  ModuleAccess,
  ModuleGroup,
  RoleAccess,
  RoleAccessService,
  UpdateRoleRequest
} from '../../../core/services/role-access.service';

@Component({
  selector: 'app-roles-acces',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './roles-acces.html',
  styleUrl: './roles-acces.scss'
})
export class RolesAcces implements OnInit {

  // =====================================================
  // DONNÉES
  // =====================================================

  roles: RoleAccess[] = [];
  filteredRoles: RoleAccess[] = [];

  selectedRole: RoleAccess | null = null;
  moduleGroups: ModuleGroup[] = [];

  searchRole = '';

  // Affichage de l'aperçu de navigation (repliable pour alléger l'écran)
  previewOpen = true;

  // =====================================================
  // ÉTATS DE CHARGEMENT
  // =====================================================

  loading = false;
  loadingModules = false;

  savingRole = false;
  savingAccess = false;
  deletingRole = false;

  // =====================================================
  // MESSAGES
  // =====================================================

  errorMessage = '';
  successMessage = '';

  // =====================================================
  // MODAL CRÉATION
  // =====================================================

  showCreateModal = false;

  createForm: CreateRoleRequest = {
    nomRole: '',
    description: '',
    typeRole: 'INTERNE',
    roleSysteme: false
  };

  // =====================================================
  // MODAL MODIFICATION (séparée de la création)
  // =====================================================

  showEditModal = false;
  editingRoleId: number | null = null;

  editForm: UpdateRoleRequest & { nomRole: string; description: string; typeRole: string } = {
    nomRole: '',
    description: '',
    typeRole: 'INTERNE',
    roleSysteme: false,
    actif: true
  };

  // =====================================================
  // MODAL SUPPRESSION
  // =====================================================

  showDeleteRoleModal = false;
  roleToDelete: RoleAccess | null = null;

  constructor(
    private roleAccessService: RoleAccessService
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  // =====================================================
  // CHARGEMENT DES RÔLES
  // =====================================================

  loadRoles(preferredRoleId?: number | null): void {
    this.loading = true;
    this.errorMessage = '';

    const selectedRoleId =
      preferredRoleId ??
      this.selectedRole?.id ??
      null;

    this.roleAccessService.getRoles().subscribe({
      next: (data: RoleAccess[]) => {
        this.roles = (data || [])
          .filter((role: RoleAccess) => role.actif !== false)
          .sort((a: RoleAccess, b: RoleAccess) =>
            String(a.nomRole || '').localeCompare(
              String(b.nomRole || ''),
              'fr'
            )
          );

        this.filterRoles();

        let roleToSelect: RoleAccess | undefined;

        if (selectedRoleId !== null) {
          roleToSelect = this.roles.find(
            (role: RoleAccess) =>
              Number(role.id) === Number(selectedRoleId)
          );
        }

        if (!roleToSelect && this.roles.length > 0) {
          roleToSelect = this.roles[0];
        }

        if (roleToSelect) {
          this.selectRole(roleToSelect);
        } else {
          this.selectedRole = null;
          this.moduleGroups = [];
        }

        this.loading = false;
      },

      error: (error: any) => {
        console.error('ERROR LOAD ROLES', error);

        this.roles = [];
        this.filteredRoles = [];
        this.selectedRole = null;
        this.moduleGroups = [];

        this.errorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors du chargement des rôles.';

        this.loading = false;
      }
    });
  }

  // =====================================================
  // SÉLECTION DU RÔLE
  // =====================================================

  selectRole(role: RoleAccess): void {
    if (!role) {
      return;
    }

    this.selectedRole = role;
    this.loadModulesForRole(role.id);
  }

  // =====================================================
  // CHARGEMENT DES MODULES
  // =====================================================

  loadModulesForRole(roleId: number): void {
    if (!roleId) {
      this.moduleGroups = [];
      return;
    }

    this.loadingModules = true;
    this.errorMessage = '';

    this.roleAccessService
      .getModulesByRole(roleId)
      .subscribe({
        next: (data: ModuleGroup[]) => {
          this.moduleGroups = data || [];
          this.loadingModules = false;
        },

        error: (error: any) => {
          console.error(
            'ERROR LOAD ROLE MODULES',
            error
          );

          this.moduleGroups = [];
          this.loadingModules = false;

          this.errorMessage =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors du chargement des accès du rôle.';
        }
      });
  }

  // =====================================================
  // RECHERCHE
  // =====================================================

  filterRoles(): void {
    const value = String(
      this.searchRole || ''
    )
      .trim()
      .toLowerCase();

    if (!value) {
      this.filteredRoles = [...this.roles];
      return;
    }

    this.filteredRoles = this.roles.filter(
      (role: RoleAccess) => {
        const nomRole = String(
          role.nomRole || ''
        ).toLowerCase();

        const codeRole = String(
          role.codeRole || ''
        ).toLowerCase();

        const description = String(
          role.description || ''
        ).toLowerCase();

        return (
          nomRole.includes(value) ||
          codeRole.includes(value) ||
          description.includes(value)
        );
      }
    );
  }

  clearSearch(): void {
    this.searchRole = '';
    this.filterRoles();
  }

  // =====================================================
  // APERÇU (repli / dépli)
  // =====================================================

  togglePreview(): void {
    this.previewOpen = !this.previewOpen;
  }

  // =====================================================
  // MODIFICATION LOCALE D’UN MODULE
  // =====================================================

  toggleModule(module: ModuleAccess): void {
    if (!module) {
      return;
    }

    module.autorise = !module.autorise;
    this.refreshGroupCounts();
  }

  // =====================================================
  // ENREGISTRER LES ACCÈS
  // =====================================================

  saveAccess(): void {
    if (!this.selectedRole) {
      this.errorMessage =
        'Veuillez sélectionner un rôle.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.savingAccess = true;

    const selectedRoleId = this.selectedRole.id;

    const modules = this.moduleGroups.flatMap(
      (group: ModuleGroup) =>
        group.modules.map(
          (module: ModuleAccess) => ({
            moduleId: module.moduleId,
            autorise: module.autorise === true
          })
        )
    );

    this.roleAccessService
      .updateRoleModules(
        selectedRoleId,
        { modules }
      )
      .subscribe({
        next: (data: ModuleGroup[]) => {
          this.moduleGroups = data || [];
          this.savingAccess = false;

          this.successMessage =
            'Les accès ont été enregistrés avec succès.';

          this.loadRoles(selectedRoleId);
          this.clearSuccessMessageLater();
        },

        error: (error: any) => {
          console.error(
            'ERROR SAVE ROLE ACCESS',
            error
          );

          this.savingAccess = false;

          this.errorMessage =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors de l’enregistrement des accès.';
        }
      });
  }

  // =====================================================
  // TOUT AUTORISER
  // =====================================================

  allowAll(): void {
    if (!this.selectedRole) {
      this.errorMessage =
        'Veuillez sélectionner un rôle.';
      return;
    }

    const roleId = this.selectedRole.id;

    this.errorMessage = '';
    this.successMessage = '';

    this.roleAccessService
      .allowAll(roleId)
      .subscribe({
        next: (data: ModuleGroup[]) => {
          this.moduleGroups = data || [];

          this.successMessage =
            'Tous les modules ont été autorisés.';

          this.loadRoles(roleId);
          this.clearSuccessMessageLater();
        },

        error: (error: any) => {
          console.error(
            'ERROR ALLOW ALL',
            error
          );

          this.errorMessage =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors de l’autorisation globale.';
        }
      });
  }

  // =====================================================
  // TOUT BLOQUER
  // =====================================================

  blockAll(): void {
    if (!this.selectedRole) {
      this.errorMessage =
        'Veuillez sélectionner un rôle.';
      return;
    }

    const confirmation = confirm(
      `Voulez-vous vraiment bloquer tous les modules du rôle "${this.selectedRole.nomRole}" ?`
    );

    if (!confirmation) {
      return;
    }

    const roleId = this.selectedRole.id;

    this.errorMessage = '';
    this.successMessage = '';

    this.roleAccessService
      .blockAll(roleId)
      .subscribe({
        next: (data: ModuleGroup[]) => {
          this.moduleGroups = data || [];

          this.successMessage =
            'Tous les modules ont été bloqués.';

          this.loadRoles(roleId);
          this.clearSuccessMessageLater();
        },

        error: (error: any) => {
          console.error(
            'ERROR BLOCK ALL',
            error
          );

          this.errorMessage =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors du blocage global.';
        }
      });
  }

  // =====================================================
  // RÉINITIALISER LES ACCÈS
  // =====================================================

  resetChanges(): void {
    if (!this.selectedRole) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.loadModulesForRole(
      this.selectedRole.id
    );
  }

  // =====================================================
  // CRÉATION — OUVRIR / FERMER
  // =====================================================

  openCreateModal(): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.resetRoleForm();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    if (this.savingRole) {
      return;
    }

    this.showCreateModal = false;
    this.resetRoleForm();
  }

  // =====================================================
  // CRÉER LE RÔLE
  // =====================================================

  saveNewRole(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const nomRole = String(this.createForm.nomRole || '').trim();
    const description = String(this.createForm.description || '').trim();
    const typeRole = String(this.createForm.typeRole || 'INTERNE').trim().toUpperCase();
    const roleSysteme = this.createForm.roleSysteme === true;

    if (!nomRole) {
      this.errorMessage = 'Le nom du rôle est obligatoire.';
      return;
    }

    if (typeRole !== 'INTERNE' && typeRole !== 'EXTERNE') {
      this.errorMessage = 'Le type du rôle doit être INTERNE ou EXTERNE.';
      return;
    }

    this.savingRole = true;

    const request: CreateRoleRequest = {
      nomRole,
      description,
      typeRole,
      roleSysteme
    };

    this.roleAccessService
      .createRole(request)
      .subscribe({
        next: (createdRole: RoleAccess) => {
          this.savingRole = false;
          this.closeCreateModal();

          this.successMessage =
            `Le rôle "${createdRole.nomRole || nomRole}" a été créé avec succès.`;

          this.loadRoles(createdRole.id);
          this.clearSuccessMessageLater();
        },

        error: (error: any) => {
          console.error('ERROR CREATE ROLE', error);

          this.savingRole = false;

          this.errorMessage =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors de la création du rôle.';
        }
      });
  }

  // =====================================================
  // MODIFICATION — OUVRIR / FERMER
  // =====================================================

  openEditRole(event: Event, role: RoleAccess): void {
    event.stopPropagation();
    this.prepareEditRole(role);
  }

  openEditSelectedRole(): void {
    if (!this.selectedRole) {
      this.errorMessage = 'Veuillez sélectionner un rôle à modifier.';
      return;
    }

    this.prepareEditRole(this.selectedRole);
  }

  private prepareEditRole(role: RoleAccess): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.editingRoleId = role.id;

    this.editForm = {
      nomRole: String(role.nomRole || '').trim(),
      description: String(role.description || '').trim(),
      typeRole: String(role.typeRole || 'INTERNE').trim().toUpperCase(),
      roleSysteme: role.roleSysteme === true,
      actif: role.actif !== false
    };

    this.showEditModal = true;
  }

  closeEditModal(): void {
    if (this.savingRole) {
      return;
    }

    this.showEditModal = false;
    this.editingRoleId = null;
  }

  // =====================================================
  // ENREGISTRER LA MODIFICATION
  // =====================================================

  saveEditedRole(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.editingRoleId === null) {
      return;
    }

    const nomRole = String(this.editForm.nomRole || '').trim();
    const description = String(this.editForm.description || '').trim();
    const typeRole = String(this.editForm.typeRole || 'INTERNE').trim().toUpperCase();
    const roleSysteme = this.editForm.roleSysteme === true;

    if (!nomRole) {
      this.errorMessage = 'Le nom du rôle est obligatoire.';
      return;
    }

    if (typeRole !== 'INTERNE' && typeRole !== 'EXTERNE') {
      this.errorMessage = 'Le type du rôle doit être INTERNE ou EXTERNE.';
      return;
    }

    this.savingRole = true;

    const roleId = this.editingRoleId;

    const request: UpdateRoleRequest = {
      nomRole,
      description,
      typeRole,
      roleSysteme,
      actif: this.editForm.actif !== false
    };

    this.roleAccessService
      .updateRole(roleId, request)
      .subscribe({
        next: (updatedRole: RoleAccess) => {
          this.savingRole = false;
          this.closeEditModal();

          this.successMessage =
            `Le rôle "${updatedRole.nomRole || nomRole}" a été modifié avec succès.`;

          this.loadRoles(updatedRole.id);
          this.clearSuccessMessageLater();
        },

        error: (error: any) => {
          console.error('ERROR UPDATE ROLE', error);

          this.savingRole = false;

          this.errorMessage =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors de la modification du rôle.';
        }
      });
  }

  // =====================================================
  // SUPPRESSION — OUVRIR / FERMER
  // =====================================================

  openDeleteRole(event: Event, role: RoleAccess): void {
    event.stopPropagation();
    this.prepareDeleteRole(role);
  }

  openDeleteSelectedRole(): void {
    if (!this.selectedRole) {
      this.errorMessage = 'Veuillez sélectionner un rôle à supprimer.';
      return;
    }

    this.prepareDeleteRole(this.selectedRole);
  }

  private prepareDeleteRole(role: RoleAccess): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (role.roleSysteme === true) {
      this.errorMessage = 'Un rôle système ne peut pas être supprimé.';
      return;
    }

    this.roleToDelete = role;
    this.showDeleteRoleModal = true;
  }

  closeDeleteRoleModal(): void {
    if (this.deletingRole) {
      return;
    }

    this.roleToDelete = null;
    this.showDeleteRoleModal = false;
  }

  // =====================================================
  // CONFIRMER SUPPRESSION
  // =====================================================

  confirmDeleteRole(): void {
    if (!this.roleToDelete) {
      return;
    }

    if (this.roleToDelete.roleSysteme === true) {
      this.errorMessage = 'Un rôle système ne peut pas être supprimé.';
      this.closeDeleteRoleModal();
      return;
    }

    const roleId = this.roleToDelete.id;
    const roleNom = this.roleToDelete.nomRole;

    this.errorMessage = '';
    this.successMessage = '';
    this.deletingRole = true;

    this.roleAccessService
      .deleteRole(roleId)
      .subscribe({
        next: () => {
          this.deletingRole = false;
          this.roleToDelete = null;
          this.showDeleteRoleModal = false;

          if (
            this.selectedRole &&
            Number(this.selectedRole.id) === Number(roleId)
          ) {
            this.selectedRole = null;
            this.moduleGroups = [];
          }

          this.successMessage =
            `Le rôle "${roleNom}" a été supprimé définitivement.`;

          this.loadRoles();
          this.clearSuccessMessageLater();
        },

        error: (error: any) => {
          console.error('ERROR DELETE ROLE', error);

          this.deletingRole = false;
          this.roleToDelete = null;
          this.showDeleteRoleModal = false;

          this.errorMessage =
            error?.error?.message ||
            error?.error?.detail ||
            (
              error?.status === 409
                ? 'Ce rôle est encore affecté à des utilisateurs. Attribuez-leur un autre rôle avant de le supprimer.'
                : 'Erreur lors de la suppression du rôle.'
            );
        }
      });
  }

  // =====================================================
  // STATISTIQUES
  // =====================================================

  getTotalModules(): number {
    if (this.roles.length === 0) {
      return 0;
    }

    return Math.max(
      ...this.roles.map(
        (role: RoleAccess) =>
          Number(role.totalModules || 0)
      )
    );
  }

  getTotalAuthorized(): number {
    return this.roles.reduce(
      (total: number, role: RoleAccess) =>
        total + Number(role.modulesAutorises || 0),
      0
    );
  }

  getTotalBlocked(): number {
    return this.roles.reduce(
      (total: number, role: RoleAccess) => {
        const totalModules = Number(role.totalModules || 0);
        const modulesAutorises = Number(role.modulesAutorises || 0);

        return total + Math.max(totalModules - modulesAutorises, 0);
      },
      0
    );
  }

  // =====================================================
  // APERÇU DE LA NAVBAR
  // =====================================================

  getAuthorizedModulesForPreview(): ModuleGroup[] {
    return this.moduleGroups
      .map((group: ModuleGroup) => ({
        ...group,
        modules: group.modules.filter(
          (module: ModuleAccess) => module.autorise === true
        )
      }))
      .filter((group: ModuleGroup) => group.modules.length > 0);
  }

  // =====================================================
  // ICÔNE DU RÔLE
  // =====================================================

  getRoleIcon(role: RoleAccess): string {
    const codeRole = String(role.codeRole || '').trim().toUpperCase();

    switch (codeRole) {
      case 'IT':
      case 'ADMIN':
        return 'ti ti-shield-lock';

      case 'EL_EMAR':
        return 'ti ti-building-bank';

      case 'EVALUATEUR':
      case 'EVALUATEUR_JUNIOR':
        return 'ti ti-clipboard-check';

      case 'DECIDEUR':
        return 'ti ti-gavel';

      case 'DA':
        return 'ti ti-shopping-cart';

      case 'CND':
        return 'ti ti-user';

      default:
        return 'ti ti-user-cog';
    }
  }

  // =====================================================
  // HELPERS
  // =====================================================

  private resetRoleForm(): void {
    this.createForm = {
      nomRole: '',
      description: '',
      typeRole: 'INTERNE',
      roleSysteme: false
    };
  }

  private refreshGroupCounts(): void {
    this.moduleGroups = this.moduleGroups.map(
      (group: ModuleGroup) => ({
        ...group,
        modulesAutorises: group.modules.filter(
          (module: ModuleAccess) => module.autorise === true
        ).length
      })
    );
  }

  private clearSuccessMessageLater(): void {
    setTimeout(() => {
      this.successMessage = '';
    }, 2500);
  }
}