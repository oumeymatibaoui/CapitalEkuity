import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

import {
  CreateUtilisateurRequest,
  TypeUtilisateur,
  UtilisateurAdminResponse,
  UtilisateurAdminService
} from '../../../core/services/utilisateur-admin.service';

@Component({
  selector: 'app-compte-el-emar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './compte-el-emar.html',
  styleUrl: './compte-el-emar.scss',
})
export class CompteElEmar implements OnInit, OnDestroy {

  utilisateurs: UtilisateurAdminResponse[] = [];
  filteredUtilisateurs: UtilisateurAdminResponse[] = [];

  createForm: FormGroup;

  loading = false;
  creating = false;

  pageError = '';
  successMessage = '';

  createSuccessMessage = '';
  createErrorMessage = '';

  searchTerm = '';
  selectedRoleFilter = 'ALL';

  roles: TypeUtilisateur[] = [
    'EL_EMAR',
    'DA',
    'IT',
    'ADMIN'
  ];

  // --- Auto-refresh ---
  private autoRefreshSub?: Subscription;
  private readonly AUTO_REFRESH_INTERVAL_MS = 15000; // 15 secondes

  constructor(
    private fb: FormBuilder,
    private utilisateurAdminService: UtilisateurAdminService
  ) {
    this.createForm = this.fb.group({
      nom: [''],
      email: [''],
      fonction: [''],
      typeUtilisateur: ['EL_EMAR'],
      motDePasse: ['']
    });
  }

  ngOnInit(): void {
    this.loadUtilisateurs();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  // ------------------------------------------------------------------
  // Chargement
  // ------------------------------------------------------------------

  loadUtilisateurs(): void {
  this.loading = true;
  this.pageError = '';
  this.successMessage = '';

  this.utilisateurAdminService.getAllUsers().subscribe({
    next: (data: UtilisateurAdminResponse[]) => {
      this.utilisateurs = data || [];
      this.applyFilters();
      this.loading = false;
    },
    error: (error: any) => {
      console.error('ERROR LOAD USERS', error);

      this.loading = false;

      this.pageError =
        error?.error?.message ||
        error?.error?.detail ||
        'Erreur lors du chargement des utilisateurs internes.';
    }
  });
}

  /**
   * Démarre le rafraîchissement automatique périodique de la liste.
   * Ce rafraîchissement est silencieux : il ne déclenche pas le spinner
   * "loading" ni de message d'erreur bloquant, afin de ne pas perturber
   * l'utilisateur pendant qu'il consulte ou filtre la liste.
   */
  private startAutoRefresh(): void {
    this.stopAutoRefresh();

    this.autoRefreshSub = interval(this.AUTO_REFRESH_INTERVAL_MS).subscribe(() => {
      this.utilisateurAdminService.getAllUsers().subscribe({
        next: (data: UtilisateurAdminResponse[]) => {
          this.utilisateurs = data || [];
          this.applyFilters();
        },
        error: (error: any) => {
          console.error('ERROR AUTO REFRESH USERS', error);
          // Pas de message d'erreur intrusif pour un rafraîchissement silencieux.
        }
      });
    });
  }

  private stopAutoRefresh(): void {
    this.autoRefreshSub?.unsubscribe();
    this.autoRefreshSub = undefined;
  }

  // ------------------------------------------------------------------
  // Création
  // ------------------------------------------------------------------

createUtilisateur(): void {
  this.pageError = '';
  this.successMessage = '';
  this.createSuccessMessage = '';
  this.createErrorMessage = '';

  const nom = String(this.createForm.value.nom || '').trim();
  const email = String(this.createForm.value.email || '').trim();
  const fonction = String(this.createForm.value.fonction || '').trim();
  const typeUtilisateur = this.createForm.value.typeUtilisateur as TypeUtilisateur;
  const motDePasse = String(this.createForm.value.motDePasse || '').trim();

  if (!nom || !email || !typeUtilisateur || !motDePasse) {
    this.createErrorMessage = 'Veuillez remplir le nom, l’email, le rôle et le mot de passe.';
    return;
  }

  if (!this.isValidEmail(email)) {
    this.createErrorMessage = 'Veuillez saisir une adresse email valide.';
    return;
  }

  if (motDePasse.length < 6) {
    this.createErrorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
    return;
  }

  const request: CreateUtilisateurRequest = {
    nom,
    email,
    fonction,
    typeUtilisateur,
    motDePasse,
    createurId: this.getCurrentUserId()
  };

  this.creating = true;
  this.loading = false;

  this.utilisateurAdminService.createUser(request).subscribe({
    next: (createdUser: UtilisateurAdminResponse) => {
      this.creating = false;
      this.loading = false;

      this.createSuccessMessage =
        `Compte interne créé avec succès pour ${createdUser.email || email}.`;

      this.createErrorMessage = '';

      this.createForm.reset({
        nom: '',
        email: '',
        fonction: '',
        typeUtilisateur: 'EL_EMAR',
        motDePasse: ''
      });

      // Ajout direct dans la liste sans bloquer la page
      if (createdUser && createdUser.id) {
        this.utilisateurs = [
          createdUser,
          ...this.utilisateurs.filter(u => u.id !== createdUser.id)
        ];

        this.applyFilters();
      }

      // Rafraîchissement silencieux depuis le backend
      this.refreshUtilisateursSilently();
    },

    error: (error: any) => {
      console.error('ERROR CREATE USER', error);

      this.creating = false;
      this.loading = false;
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
private refreshUtilisateursSilently(): void {
  this.utilisateurAdminService.getAllUsers().subscribe({
    next: (data: UtilisateurAdminResponse[]) => {
      this.utilisateurs = data || [];
      this.applyFilters();
      this.loading = false;
    },
    error: (error: any) => {
      console.error('ERROR SILENT REFRESH USERS', error);
      this.loading = false;
    }
  });
}
  // ------------------------------------------------------------------
  // Mise à jour rôle / statut
  // ------------------------------------------------------------------

  updateRole(user: UtilisateurAdminResponse, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value as TypeUtilisateur;

    if (!user.id || !newRole) return;

    this.pageError = '';
    this.successMessage = '';

    this.utilisateurAdminService.updateRole(user.id, {
      typeUtilisateur: newRole
    }).subscribe({
      next: (updated: UtilisateurAdminResponse) => {
        user.typeUtilisateur = updated.typeUtilisateur;
        this.successMessage = 'Rôle utilisateur mis à jour.';
        this.pageError = '';
        this.applyFilters();
      },
      error: (error: any) => {
        console.error('ERROR UPDATE ROLE', error);
        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors de la modification du rôle.';
        this.loadUtilisateurs();
      }
    });
  }

  toggleActif(user: UtilisateurAdminResponse): void {
    if (!user.id) return;

    this.pageError = '';
    this.successMessage = '';

    this.utilisateurAdminService.toggleActif(user.id).subscribe({
      next: (updated: UtilisateurAdminResponse) => {
        user.actif = updated.actif;
        this.successMessage = updated.actif
          ? 'Compte activé avec succès.'
          : 'Compte désactivé avec succès.';
        this.pageError = '';
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

  // ------------------------------------------------------------------
  // Filtres
  // ------------------------------------------------------------------

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value || '';
    this.applyFilters();
  }

  onRoleFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedRoleFilter = select.value || 'ALL';
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const role = this.selectedRoleFilter;

    this.filteredUtilisateurs = this.utilisateurs.filter(user => {
      const matchText =
        !term ||
        String(user.nom || '').toLowerCase().includes(term) ||
        String(user.email || '').toLowerCase().includes(term) ||
        String(user.fonction || '').toLowerCase().includes(term);

      const matchRole =
        role === 'ALL' ||
        String(user.typeUtilisateur || '').toUpperCase() === role;

      return matchText && matchRole;
    });
  }

  getActiveCount(): number {
    return this.utilisateurs.filter(user => user.actif).length;
  }

  getInactiveCount(): number {
    return this.utilisateurs.filter(user => !user.actif).length;
  }

  getRoleLabel(role?: string | null): string {
    switch ((role || '').toUpperCase()) {
      case 'EL_EMAR':
        return 'Utilisateur El Emar';
      case 'DA':
        return 'Direction achat';
      case 'IT':
        return 'IT';
      case 'ADMIN':
        return 'Administrateur';
      default:
        return role || '-';
    }
  }

  getRoleClass(role?: string | null): string {
    const value = String(role || '').toUpperCase();

    if (value === 'EL_EMAR') return 'role-el-emar';
    if (value === 'DA') return 'role-da';
    if (value === 'IT') return 'role-it';
    if (value === 'ADMIN') return 'role-admin';

    return 'role-default';
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';

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

  trackByUserId(index: number, user: UtilisateurAdminResponse): number {
    return user.id;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getCurrentUserId(): number | null {
    const directUserId = localStorage.getItem('userId');

    if (directUserId && !isNaN(Number(directUserId))) {
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

      if (!value) continue;

      try {
        const parsed = JSON.parse(value);

        if (parsed?.id) return Number(parsed.id);
        if (parsed?.userId) return Number(parsed.userId);
        if (parsed?.utilisateurId) return Number(parsed.utilisateurId);
      } catch {
        continue;
      }
    }

    return null;
  }
}