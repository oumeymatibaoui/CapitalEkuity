import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import {
  NotificationResponse,
  NotificationService
} from '../../../core/services/notification.service';

@Component({
  selector: 'app-notifications-cnd',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './notifications-cnd.html',
  styleUrl: './notifications-cnd.scss',
})
export class NotificationsCnd implements OnInit {

  notifications: NotificationResponse[] = [];

  loading = false;
  pageError = '';
  successMessage = '';

  private readonly formulaireRoute = '/cnd/nouvelle-candidature';

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    const userId = this.getCurrentUserId();

    if (!userId) {
      this.pageError = 'Utilisateur connecté introuvable.';
      return;
    }

    this.loading = true;
    this.pageError = '';
    this.successMessage = '';

    this.notificationService
      .getNotificationsByDestinataire(userId)
      .subscribe({
        next: (data: NotificationResponse[]) => {
          this.notifications = (data || [])
            .filter(notification =>
              notification.typeNotification === 'COMMENTAIRE_CRITERE_EL_EMAR'
              || notification.typeNotification === 'COMMENTAIRE_EL_EMAR'
            )
            .sort((a, b) => {
              const dateA = new Date(a.dateCreation || '').getTime();
              const dateB = new Date(b.dateCreation || '').getTime();

              if (isNaN(dateA)) return 1;
              if (isNaN(dateB)) return -1;

              return dateB - dateA;
            });

          this.loading = false;
        },
        error: (error: any) => {
          console.error('ERROR LOAD NOTIFICATIONS CND', error);

          this.loading = false;

          this.pageError =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors du chargement des notifications.';
        }
      });
  }

  ouvrirNotification(notification: NotificationResponse): void {
    if (!notification) {
      return;
    }

    if (notification.traitee) {
      this.pageError = '';
      this.successMessage = 'Cette correction a déjà été traitée.';
      return;
    }

    const queryParams = {
      step: 2,
      fromNotification: true,

      notificationId: notification.id || null,

      lotId: notification.lotId || null,
      applicationCandidatureId: notification.applicationCandidatureId || null,

      critereEvaluationId: notification.critereEvaluationId || null,
      reponseCritereId: notification.reponseCritereId || null
    };

    const goToNouvelleCandidature = () => {
      this.router.navigate(
        [this.formulaireRoute],
        { queryParams }
      );
    };

    if (notification.id && !notification.lu) {
      this.notificationService.marquerCommeLu(notification.id).subscribe({
        next: () => {
          notification.lu = true;
          goToNouvelleCandidature();
        },
        error: (error: any) => {
          console.error('ERROR MARK NOTIFICATION AS READ', error);
          goToNouvelleCandidature();
        }
      });

      return;
    }

    goToNouvelleCandidature();
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.lu && !n.traitee).length;
  }

  getTreatedCount(): number {
    return this.notifications.filter(n => n.traitee).length;
  }

  getNotificationStatusLabel(notification: NotificationResponse): string {
    if (notification.traitee) {
      return 'Traitée';
    }

    return notification.lu ? 'Lu' : 'Nouveau';
  }

  getNotificationStatusClass(notification: NotificationResponse): string {
    if (notification.traitee) {
      return 'status-treated';
    }

    return notification.lu ? 'status-read' : 'status-unread';
  }

  getRowClass(notification: NotificationResponse): string {
    if (notification.traitee) {
      return 'treated-row';
    }

    return notification.lu ? 'read-row' : 'unread-row';
  }

  getActionButtonLabel(notification: NotificationResponse): string {
    if (notification.traitee) {
      return 'Correction traitée';
    }

    return 'Ouvrir le champ à corriger';
  }

  isActionDisabled(notification: NotificationResponse): boolean {
    return notification.traitee === true;
  }

  getLotLabel(notification: NotificationResponse): string {
    if (notification.lotNom && notification.lotNom.trim() !== '') {
      return notification.lotNom;
    }

    if (notification.lotId) {
      return 'Lot #' + notification.lotId;
    }

    return '-';
  }

  getCritereLabel(notification: NotificationResponse): string {
    if (notification.libelleCritere && notification.libelleCritere.trim() !== '') {
      return notification.libelleCritere;
    }

    if (notification.critereEvaluationId) {
      return 'Critère #' + notification.critereEvaluationId;
    }

    return 'Critère non renseigné';
  }

  getCommentaire(notification: NotificationResponse): string {
    return notification.message && notification.message.trim() !== ''
      ? notification.message
      : '-';
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

  formatDateTraitement(notification: NotificationResponse): string {
    if (!notification.dateTraitement) {
      return '-';
    }

    return this.formatDate(notification.dateTraitement);
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