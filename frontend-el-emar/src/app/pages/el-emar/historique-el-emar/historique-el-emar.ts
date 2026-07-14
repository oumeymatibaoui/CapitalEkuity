import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import {
  HistoriqueActionResponse,
  HistoriqueActionService
} from '../../../core/services/historique-action.service';

@Component({
  selector: 'app-historique-el-emar',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './historique-el-emar.html',
  styleUrl: './historique-el-emar.scss',
})
export class HistoriqueElEmar implements OnInit {

  historique: HistoriqueActionResponse[] = [];

  loading = false;
  pageError = '';

  constructor(
    private historiqueActionService: HistoriqueActionService
  ) {}

  ngOnInit(): void {
    this.loadHistorique();
  }

  loadHistorique(): void {
    const userId = this.getCurrentUserId();

    if (!userId) {
      this.pageError = 'Utilisateur El Emar connecté introuvable.';
      return;
    }

    this.loading = true;
    this.pageError = '';

    this.historiqueActionService.getHistoriqueByUtilisateur(userId).subscribe({
      next: (data: HistoriqueActionResponse[]) => {
        this.historique = data || [];
        this.loading = false;
      },
      error: (error: any) => {
        console.error('ERROR LOAD HISTORIQUE EL EMAR', error);

        this.loading = false;
        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors du chargement de l’historique El Emar.';
      }
    });
  }

  getActionLabel(action: string): string {
    switch (action) {

      // =========================
      // ACTIONS EL EMAR
      // =========================

      case 'EL_EMAR_EVALUATION_CRITERE':
        return 'Évaluation critère';

      case 'EL_EMAR_ENVOI_NOTIFICATION':
        return 'Notification envoyée';

      case 'EL_EMAR_DECISION_FINALE_LOT':
        return 'Décision finale lot';

      case 'EL_EMAR_CLASSEMENT_ZONE':
        return 'Classement zone';

      case 'EL_EMAR_CREATE_CATEGORIE_EVALUATION':
        return 'Création catégorie';

      case 'EL_EMAR_UPDATE_CATEGORIE_EVALUATION':
        return 'Modification catégorie';

      case 'EL_EMAR_TOGGLE_CATEGORIE_EVALUATION':
        return 'Activation / désactivation catégorie';

      case 'EL_EMAR_DELETE_CATEGORIE_EVALUATION':
        return 'Suppression catégorie';

      case 'EL_EMAR_CONSULTATION_CANDIDATURE':
        return 'Consultation candidature';

      // =========================
      // ACTIONS CANDIDAT POSSIBLES
      // =========================

      case 'SOUMISSION_CANDIDATURE':
        return 'Soumission candidature';

      case 'CORRECTION_NOTIFICATION_CND':
        return 'Correction candidat';

      case 'UPLOAD_RNE':
        return 'Dépôt RNE';

      case 'UPLOAD_CNSS':
        return 'Dépôt CNSS';

      case 'UPLOAD_PIECE_CRITERE':
        return 'Dépôt pièce critère';

      default:
        return action || '-';
    }
  }

  getActionClass(action: string): string {
    if (!action) return 'action-default';

    if (action.includes('EVALUATION')) return 'action-evaluation';
    if (action.includes('NOTIFICATION')) return 'action-notification';
    if (action.includes('DECISION')) return 'action-decision';
    if (action.includes('CLASSEMENT')) return 'action-zone';
    if (action.includes('CATEGORIE')) return 'action-config';
    if (action.includes('UPLOAD')) return 'action-upload';
    if (action.includes('SOUMISSION')) return 'action-submit';
    if (action.includes('CORRECTION')) return 'action-correction';

    return 'action-default';
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

  private getCurrentUserId(): number | null {
    const directUserId = localStorage.getItem('userId');

    if (directUserId && !isNaN(Number(directUserId))) {
      return Number(directUserId);
    }

    const possibleKeys = [
      'elEmarUser',
      'elEmarConnectedUser',
      'connectedUser',
      'currentUser',
      'user',
      'authUser'
    ];

    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);

      if (!value) {
        continue;
      }

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