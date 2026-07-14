import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  roles: RoleAccess[] = [];
  filteredRoles: RoleAccess[] = [];

  selectedRole: RoleAccess | null = null;
  moduleGroups: ModuleGroup[] = [];

  searchRole = '';

  loading = false;
  errorMessage = '';
  successMessage = '';

  showCreateModal = false;

  createForm: CreateRoleRequest = {
    nomRole: '',
    description: '',
    typeRole: 'INTERNE'
  };
editRoleMode = false;
editingRoleId: number | null = null;

showDeleteRoleModal = false;
roleToDelete: RoleAccess | null = null;
  constructor(private roleAccessService: RoleAccessService) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading = true;
    this.errorMessage = '';

    this.roleAccessService.getRoles().subscribe({
      next: (data) => {
        this.roles = data;
        this.filteredRoles = data;

        if (data.length > 0) {
          this.selectRole(data[0]);
        }

        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erreur lors du chargement des rôles.';
        this.loading = false;
      }
    });
  }

  selectRole(role: RoleAccess): void {
    this.selectedRole = role;
    this.loadModulesForRole(role.id);
  }

  loadModulesForRole(roleId: number): void {
    this.errorMessage = '';

    this.roleAccessService.getModulesByRole(roleId).subscribe({
      next: (data) => {
        this.moduleGroups = data;
      },
      error: () => {
        this.errorMessage = 'Erreur lors du chargement des accès du rôle.';
      }
    });
  }

  filterRoles(): void {
    const value = this.searchRole.toLowerCase().trim();

    this.filteredRoles = this.roles.filter(role =>
      role.nomRole.toLowerCase().includes(value)
      || role.codeRole.toLowerCase().includes(value)
      || role.description?.toLowerCase().includes(value)
    );
  }

  toggleModule(module: ModuleAccess): void {
    module.autorise = !module.autorise;
    this.refreshGroupCounts();
  }

  saveAccess(): void {
    if (!this.selectedRole) {
      return;
    }

    const modules = this.moduleGroups.flatMap(group =>
      group.modules.map(module => ({
        moduleId: module.moduleId,
        autorise: module.autorise
      }))
    );

    this.roleAccessService.updateRoleModules(this.selectedRole.id, { modules }).subscribe({
      next: (data) => {
        this.moduleGroups = data;
        this.successMessage = 'Les accès ont été enregistrés avec succès.';
        this.loadRoles();

        setTimeout(() => {
          this.successMessage = '';
        }, 2500);
      },
      error: () => {
        this.errorMessage = 'Erreur lors de l’enregistrement des accès.';
      }
    });
  }

  allowAll(): void {
    if (!this.selectedRole) {
      return;
    }

    this.roleAccessService.allowAll(this.selectedRole.id).subscribe({
      next: (data) => {
        this.moduleGroups = data;
      },
      error: () => {
        this.errorMessage = 'Erreur lors de l’autorisation globale.';
      }
    });
  }

  blockAll(): void {
    if (!this.selectedRole) {
      return;
    }

    const confirmBlock = confirm('Voulez-vous vraiment bloquer tous les modules pour ce rôle ?');

    if (!confirmBlock) {
      return;
    }

    this.roleAccessService.blockAll(this.selectedRole.id).subscribe({
      next: (data) => {
        this.moduleGroups = data;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Erreur lors du blocage global.';
      }
    });
  }

  resetChanges(): void {
    if (!this.selectedRole) {
      return;
    }

    this.loadModulesForRole(this.selectedRole.id);
  }
openEditRole(event: Event, role: RoleAccess): void {
  event.stopPropagation();

  this.editRoleMode = true;
  this.editingRoleId = role.id;

  this.createForm = {
    nomRole: role.nomRole,
    description: role.description,
    typeRole: role.typeRole
  };

  this.showCreateModal = true;
}
openCreateModal(): void {
  this.editRoleMode = false;
  this.editingRoleId = null;

  this.createForm = {
    nomRole: '',
    description: '',
    typeRole: 'INTERNE'
  };

  this.showCreateModal = true;
}
openDeleteRole(event: Event, role: RoleAccess): void {
  event.stopPropagation();

  if (role.roleSysteme) {
    this.errorMessage = 'Un rôle système ne peut pas être supprimé.';
    return;
  }

  this.roleToDelete = role;
  this.showDeleteRoleModal = true;
}

closeDeleteRoleModal(): void {
  this.roleToDelete = null;
  this.showDeleteRoleModal = false;
}

confirmDeleteRole(): void {
  if (!this.roleToDelete) {
    return;
  }

  this.roleAccessService.deleteRole(this.roleToDelete.id).subscribe({
    next: () => {
      this.closeDeleteRoleModal();
      this.loadRoles();

      this.successMessage = 'Le rôle a été désactivé avec succès.';

      setTimeout(() => {
        this.successMessage = '';
      }, 2500);
    },
    error: () => {
      this.errorMessage = 'Erreur lors de la suppression du rôle.';
      this.closeDeleteRoleModal();
    }
  });
}
closeCreateModal(): void {
  this.showCreateModal = false;
  this.editRoleMode = false;
  this.editingRoleId = null;
}

  saveRole(): void {
  if (!this.createForm.nomRole.trim()) {
    this.errorMessage = 'Le nom du rôle est obligatoire.';
    return;
  }

  if (this.editRoleMode && this.editingRoleId) {

    const request: UpdateRoleRequest = {
      nomRole: this.createForm.nomRole,
      description: this.createForm.description,
      typeRole: this.createForm.typeRole,
      actif: true
    };

    this.roleAccessService.updateRole(this.editingRoleId, request).subscribe({
      next: () => {
        this.closeCreateModal();
        this.loadRoles();
        this.successMessage = 'Le rôle a été modifié avec succès.';

        setTimeout(() => {
          this.successMessage = '';
        }, 2500);
      },
      error: () => {
        this.errorMessage = 'Erreur lors de la modification du rôle.';
      }
    });

    return;
  }

  this.roleAccessService.createRole(this.createForm).subscribe({
    next: (role) => {
      this.closeCreateModal();
      this.loadRoles();

      setTimeout(() => {
        this.selectRole(role);
      }, 300);

      this.successMessage = 'Le rôle a été créé avec succès.';

      setTimeout(() => {
        this.successMessage = '';
      }, 2500);
    },
    error: () => {
      this.errorMessage = 'Erreur lors de la création du rôle.';
    }
  });
}
openEditSelectedRole(): void {
  if (!this.selectedRole) {
    this.errorMessage = 'Veuillez sélectionner un rôle à modifier.';
    return;
  }

  this.editRoleMode = true;
  this.editingRoleId = this.selectedRole.id;

  this.createForm = {
    nomRole: this.selectedRole.nomRole,
    description: this.selectedRole.description,
    typeRole: this.selectedRole.typeRole
  };

  this.showCreateModal = true;
}

openDeleteSelectedRole(): void {
  if (!this.selectedRole) {
    this.errorMessage = 'Veuillez sélectionner un rôle à désactiver.';
    return;
  }

  if (this.selectedRole.roleSysteme) {
    this.errorMessage = 'Un rôle système ne peut pas être supprimé.';
    return;
  }

  this.roleToDelete = this.selectedRole;
  this.showDeleteRoleModal = true;
}
  getTotalModules(): number {
    if (!this.roles.length) {
      return 0;
    }

    return this.roles[0].totalModules;
  }

  getTotalAuthorized(): number {
    return this.roles.reduce((sum, role) => sum + role.modulesAutorises, 0);
  }

  getTotalBlocked(): number {
    return this.roles.reduce(
      (sum, role) => sum + (role.totalModules - role.modulesAutorises),
      0
    );
  }

  getAuthorizedModulesForPreview(): ModuleGroup[] {
    return this.moduleGroups
      .map(group => ({
        ...group,
        modules: group.modules.filter(module => module.autorise)
      }))
      .filter(group => group.modules.length > 0);
  }

  private refreshGroupCounts(): void {
    this.moduleGroups = this.moduleGroups.map(group => ({
      ...group,
      modulesAutorises: group.modules.filter(module => module.autorise).length
    }));
  }
  getRoleIcon(role: RoleAccess): string {
  if (role.codeRole === 'IT' || role.codeRole === 'ADMIN') {
    return 'ti ti-shield-lock';
  }

  if (role.codeRole === 'EL_EMAR') {
    return 'ti ti-building-bank';
  }

  if (role.codeRole === 'EVALUATEUR') {
    return 'ti ti-clipboard-check';
  }

  if (role.codeRole === 'DECIDEUR') {
    return 'ti ti-gavel';
  }

  if (role.codeRole === 'CND') {
    return 'ti ti-user';
  }

  return 'ti ti-user-cog';
}
}