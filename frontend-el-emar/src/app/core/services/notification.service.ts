import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface NotificationRequest {
  expediteurId: number;
  destinataireId?: number | null;

  candidatureId?: number | null;
  applicationCandidatureId?: number | null;

  reponseCritereId?: number | null;
  critereEvaluationId?: number | null;

  codeCritere?: string | null;
  libelleCritere?: string | null;

  message: string;
}

export interface NotificationResponse {
  id: number;

  expediteurId?: number;
  expediteurNom?: string;

  destinataireId?: number;
  destinataireNom?: string;

  candidatureId?: number;
  applicationCandidatureId?: number;

  lotId?: number;
  lotNom?: string;

  reponseCritereId?: number;
  critereEvaluationId?: number;

  codeCritere?: string;
  libelleCritere?: string;

  nomEntreprise?: string;

  message?: string;
  typeNotification?: string;
  lu?: boolean;
  dateCreation?: string;

  traitee?: boolean | null;
  dateTraitement?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private readonly apiUrl = `${environment.apiBaseUrl}/api/notifications`;

  constructor(private http: HttpClient) {}

  envoyerCommentaireCritereElEmar(
    applicationCandidatureId: number,
    reponseCritereId: number,
    request: NotificationRequest
  ): Observable<NotificationResponse> {
    return this.http.post<NotificationResponse>(
      `${this.apiUrl}/applications/${applicationCandidatureId}/criteres/${reponseCritereId}/commentaire-el-emar`,
      request
    );
  }

  repondreCandidatCritere(
    applicationCandidatureId: number,
    reponseCritereId: number,
    request: NotificationRequest
  ): Observable<NotificationResponse> {
    return this.http.post<NotificationResponse>(
      `${this.apiUrl}/applications/${applicationCandidatureId}/criteres/${reponseCritereId}/reponse-candidat`,
      request
    );
  }

  getNotificationsByDestinataire(destinataireId: number): Observable<NotificationResponse[]> {
    return this.http.get<NotificationResponse[]>(
      `${this.apiUrl}/destinataire/${destinataireId}`
    );
  }

  getConversationByApplication(applicationCandidatureId: number): Observable<NotificationResponse[]> {
    return this.http.get<NotificationResponse[]>(
      `${this.apiUrl}/applications/${applicationCandidatureId}/conversation`
    );
  }

  getConversationByCritere(
    applicationCandidatureId: number,
    reponseCritereId: number
  ): Observable<NotificationResponse[]> {
    return this.http.get<NotificationResponse[]>(
      `${this.apiUrl}/applications/${applicationCandidatureId}/criteres/${reponseCritereId}/conversation`
    );
  }

  marquerCommeLu(notificationId: number): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/${notificationId}/lu`,
      {}
    );
  }

  marquerCommeTraitee(notificationId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.apiUrl}/${notificationId}/traitee`,
      {}
    );
  }
}