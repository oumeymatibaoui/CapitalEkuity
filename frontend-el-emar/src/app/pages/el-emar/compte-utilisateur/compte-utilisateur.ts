import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';

import {
  CompteUtilisateurResponse,
  CompteUtilisateurService
} from '../../../core/services/compte-utilisateur.service';

import {
  HistoriqueActionResponse
} from '../../../core/services/historique-action.service';

@Component({
  selector: 'app-compte-utilisateur',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './compte-utilisateur.html',
  styleUrl: './compte-utilisateur.scss',
})
export class CompteUtilisateur implements OnInit {

  utilisateurId: number | null = null;

  compte: CompteUtilisateurResponse | null = null;
  historique: HistoriqueActionResponse[] = [];

  compteForm: FormGroup;
  passwordForm: FormGroup;

  loading = false;
  savingCompte = false;
  changingPassword = false;

  showPasswordForm = false;

  pageError = '';
  successMessage = '';

  passwordErrorMessage = '';
  passwordSuccessMessage = '';

  constructor(
    private fb: FormBuilder,
    private compteUtilisateurService: CompteUtilisateurService
  ) {
    this.compteForm = this.fb.group({
      nom: [''],
      email: [{ value: '', disabled: true }],
      fonction: ['']
    });

    this.passwordForm = this.fb.group({
      oldPassword: [''],
      newPassword: [''],
      confirmPassword: ['']
    });
  }

  ngOnInit(): void {
    this.utilisateurId = this.getCurrentUserId();

    if (!this.utilisateurId) {
      this.pageError = 'Utilisateur connecté introuvable.';
      return;
    }

    this.loadCompte();
    this.loadHistorique();
  }

  loadCompte(): void {
    if (!this.utilisateurId) return;

    this.loading = true;
    this.pageError = '';
    this.successMessage = '';

    this.compteUtilisateurService.getCompte(this.utilisateurId).subscribe({
      next: (data: CompteUtilisateurResponse) => {
        this.compte = data;

        this.compteForm.patchValue({
          nom: data.nom || '',
          email: data.email || '',
          fonction: data.fonction || ''
        });

        this.updateCurrentUserInStorage(data);

        this.loading = false;
      },
      error: (error: any) => {
        console.error('ERROR LOAD COMPTE UTILISATEUR', error);
        this.loading = false;
        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors du chargement du compte.';
      }
    });
  }

  saveCompte(): void {
    if (!this.utilisateurId) {
      this.pageError = 'Utilisateur connecté introuvable.';
      return;
    }

    this.savingCompte = true;
    this.pageError = '';
    this.successMessage = '';

    const request = {
      nom: this.compteForm.value.nom || '',
      fonction: this.compteForm.value.fonction || ''
    };

    this.compteUtilisateurService.updateCompte(
      this.utilisateurId,
      request
    ).subscribe({
      next: (data: CompteUtilisateurResponse) => {
        this.compte = data;

        this.compteForm.patchValue({
          nom: data.nom || '',
          email: data.email || '',
          fonction: data.fonction || ''
        });

        this.updateCurrentUserInStorage(data);

        this.savingCompte = false;
        this.successMessage = 'Compte mis à jour avec succès.';
        this.pageError = '';

        this.loadHistorique();
      },
      error: (error: any) => {
        console.error('ERROR UPDATE COMPTE UTILISATEUR', error);
        this.savingCompte = false;
        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors de la mise à jour du compte.';
      }
    });
  }

  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    if (!this.showPasswordForm) {
      this.passwordForm.reset();
    }
  }

  changePassword(): void {
    if (!this.utilisateurId) {
      this.passwordErrorMessage = 'Utilisateur connecté introuvable.';
      return;
    }

    const oldPassword = String(this.passwordForm.value.oldPassword || '').trim();
    const newPassword = String(this.passwordForm.value.newPassword || '').trim();
    const confirmPassword = String(this.passwordForm.value.confirmPassword || '').trim();

    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    if (!oldPassword || !newPassword || !confirmPassword) {
      this.passwordErrorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    if (newPassword.length < 6) {
      this.passwordErrorMessage = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    if (newPassword !== confirmPassword) {
      this.passwordErrorMessage = 'La confirmation du mot de passe ne correspond pas.';
      return;
    }

    this.changingPassword = true;

    this.compteUtilisateurService.changePassword(
      this.utilisateurId,
      {
        oldPassword,
        newPassword,
        confirmPassword
      }
    ).subscribe({
      next: () => {
        this.changingPassword = false;
        this.passwordSuccessMessage = 'Mot de passe modifié avec succès.';
        this.passwordErrorMessage = '';
        this.passwordForm.reset();
        this.showPasswordForm = false;

        this.loadHistorique();
      },
      error: (error: any) => {
        console.error('ERROR CHANGE PASSWORD UTILISATEUR', error);
        this.changingPassword = false;
        this.passwordErrorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors du changement du mot de passe.';
      }
    });
  }

  loadHistorique(): void {
    if (!this.utilisateurId) return;

    this.compteUtilisateurService.getHistorique(this.utilisateurId).subscribe({
      next: (data: HistoriqueActionResponse[]) => {
        this.historique = data || [];
      },
      error: (error: any) => {
        console.error('ERROR LOAD HISTORIQUE UTILISATEUR', error);
      }
    });
  }

  getProfileInitial(): string {
    const source =
      this.compte?.nom ||
      this.compte?.email ||
      'U';

    return source.trim().charAt(0).toUpperCase();
  }
getCompteTitle(): string {
    const type = (this.compte?.typeUtilisateur || '').toUpperCase();

    if (type === 'CND') {
      return 'Espace Candidat';
    }

    if (type === 'EL_EMAR') {
      return 'Espace El Emar';
    }

    if (type === 'IT') {
      return 'Administration Technique';
    }

    if (type === 'ADMIN') {
      return 'Administration de la Plateforme';
    }

    return 'Mon Espace Personnel';
  }

  getActionLabel(action: string): string {
    switch (action) {
      case 'EL_EMAR_UPDATE_COMPTE':
      case 'CND_UPDATE_COMPTE':
        return 'Modification compte';

      case 'EL_EMAR_CHANGE_PASSWORD':
      case 'CND_CHANGE_PASSWORD':
        return 'Changement mot de passe';

      case 'EL_EMAR_EVALUATION_CRITERE':
        return 'Évaluation critère';

      case 'EL_EMAR_ENVOI_NOTIFICATION':
        return 'Notification envoyée';

      case 'EL_EMAR_DECISION_FINALE_LOT':
        return 'Décision finale lot';

      case 'EL_EMAR_CLASSEMENT_ZONE':
        return 'Classement zone';

      case 'CONSULTATION_CANDIDATURE':
        return 'Consultation candidature';

      case 'MODIFICATION_INFOS_SOCIETE':
        return 'Modification infos société';

      case 'UPLOAD_RNE':
        return 'Dépôt RNE';

      case 'UPLOAD_CNSS':
        return 'Dépôt CNSS';

      case 'UPLOAD_PIECE_CRITERE':
        return 'Dépôt pièce critère';

      case 'SOUMISSION_CANDIDATURE':
        return 'Soumission candidature';

      case 'CORRECTION_NOTIFICATION_CND':
        return 'Correction notification';

      default:
        return action || '-';
    }
  }

  getActionClass(action: string): string {
    if (!action) return 'action-default';

    if (action.includes('COMPTE')) return 'action-account';
    if (action.includes('PASSWORD')) return 'action-password';
    if (action.includes('EVALUATION')) return 'action-evaluation';
    if (action.includes('NOTIFICATION')) return 'action-notification';
    if (action.includes('DECISION')) return 'action-decision';
    if (action.includes('CLASSEMENT')) return 'action-zone';
    if (action.includes('UPLOAD')) return 'action-upload';
    if (action.includes('SOUMISSION')) return 'action-submit';
    if (action.includes('CORRECTION')) return 'action-correction';
    if (action.includes('MODIFICATION')) return 'action-edit';

    return 'action-default';
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

  private updateCurrentUserInStorage(data: CompteUtilisateurResponse): void {
    const possibleKeys = [
      'connectedUser',
      'currentUser',
      'user',
      'authUser',
      'candidatUser',
      'elEmarUser',
      'elEmarConnectedUser'
    ];

    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);

      if (!value) continue;

      try {
        const parsed = JSON.parse(value);

        const parsedId =
          parsed?.id ||
          parsed?.userId ||
          parsed?.utilisateurId;

        if (Number(parsedId) === Number(data.id)) {
          const updated = {
            ...parsed,
            id: data.id,
            nom: data.nom,
            email: data.email,
            fonction: data.fonction,
            typeUtilisateur: data.typeUtilisateur
          };

          localStorage.setItem(key, JSON.stringify(updated));
        }
      } catch {
        continue;
      }
    }

    localStorage.setItem('userEmail', data.email || '');
  }

  private getCurrentUserId(): number | null {
    const directUserId = localStorage.getItem('userId');

    if (directUserId && !isNaN(Number(directUserId))) {
      return Number(directUserId);
    }

    const possibleKeys = [
      'connectedUser',
      'currentUser',
      'user',
      'authUser',
      'candidatUser',
      'elEmarUser',
      'elEmarConnectedUser'
    ];

    for (const key of possibleKeys) {
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