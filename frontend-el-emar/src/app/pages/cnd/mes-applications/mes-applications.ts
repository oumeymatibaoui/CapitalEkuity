import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import {
  HistoriqueActionResponse,
  HistoriqueActionService
} from '../../../core/services/historique-action.service';

@Component({
  selector: 'app-mes-applications',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './mes-applications.html',
  styleUrl: './mes-applications.scss',
})
export class MesApplications implements OnInit {

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
      this.pageError = 'Utilisateur connecté introuvable.';
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
        console.error('ERROR LOAD HISTORIQUE', error);
        this.loading = false;
        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors du chargement de l’historique.';
      }
    });
  }

  getActionLabel(action: string): string {
    switch (action) {
      case 'CONNEXION_COMPTE':
        return 'Connexion';
      case 'CONSULTATION_CANDIDATURE':
        return 'Consultation candidature';
      case 'MODIFICATION_INFOS_SOCIETE':
        return 'Modification infos société';
      case 'UPLOAD_RNE':
        return 'Dépôt RNE';
      case 'UPLOAD_CNSS':
        return 'Dépôt CNSS';
      case 'SAUVEGARDE_FORMULAIRE_LOT':
        return 'Sauvegarde formulaire lot';
      case 'UPLOAD_PIECE_CRITERE':
        return 'Dépôt pièce critère';
      case 'SOUMISSION_CANDIDATURE':
        return 'Soumission candidature';
      case 'ENVOI_NOTIFICATION_EL_EMAR':
        return 'Notification El Emar';
      case 'OUVERTURE_NOTIFICATION_CND':
        return 'Ouverture notification';
      case 'CORRECTION_NOTIFICATION_CND':
        return 'Correction notification';
      case 'DECISION_LOT_EL_EMAR':
        return 'Décision El Emar';
      default:
        return action || '-';
    }
  }

  getActionClass(action: string): string {
    if (!action) return 'action-default';

    if (action.includes('UPLOAD')) return 'action-upload';
    if (action.includes('MODIFICATION')) return 'action-edit';
    if (action.includes('SOUMISSION')) return 'action-submit';
    if (action.includes('NOTIFICATION')) return 'action-notification';
    if (action.includes('DECISION')) return 'action-decision';

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
      'connectedUser',
      'currentUser',
      'user',
      'authUser',
      'candidatUser'
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