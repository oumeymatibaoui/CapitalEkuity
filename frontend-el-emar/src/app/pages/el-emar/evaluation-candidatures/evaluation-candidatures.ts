import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';

import { NotificationService } from '../../../core/services/notification.service';

import {
  ClassementZoneResponse,
  ClassementZoneService,
  SaveReferenceZoneRequest
} from '../../../core/services/classement-zone.service';

import {
  ElEmarCandidatureDetail,
  ElEmarCritereEvaluation,
  ElEmarEvaluationService,
  ElEmarLotEvaluation,
  ElEmarPieceEvaluation,
  ElEmarReferenceProjet,
  SaveEvaluationRequest,
  SaveEvaluationResponse,
  StatutEvaluation
} from '../../../core/services/l-emar-evaluation.service';

import {
  Zone,
  ZoneService
} from '../../../core/services/zone.service';

@Component({
  selector: 'app-evaluation-candidatures',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './evaluation-candidatures.html',
  styleUrl: './evaluation-candidatures.scss'
})
export class EvaluationCandidatures implements OnInit, OnDestroy {

  candidatureId: number | null = null;

  detail: ElEmarCandidatureDetail | null = null;
  selectedLot: ElEmarLotEvaluation | null = null;

  zones: Zone[] = [];

  referenceZoneSelection: Record<string, string> = {};
  referenceZoneCommentaire: Record<string, string> = {};

  classementsByApplicationId: Record<number, ClassementZoneResponse> = {};

  decisionFinaleByLot: Record<number, 'ADMIS' | 'REJETE' | null> = {};
  observationFinaleByLot: Record<number, string> = {};
  validatingDecisionByLot: Record<number, boolean> = {};
  decisionValidatedByLot: Record<number, boolean> = {};

  /**
   * Commentaire spécifique par critère.
   * Clé = applicationCandidatureId_reponseCritereId
   */
  commentaireCritereNotification: Record<string, string> = {};

  loading = false;
  loadFinished = false;
  saving = false;
  loadingZones = false;

  pageError = '';
  successMessage = '';
  debugMessage = '';

  pdfModalOpen = false;
  pdfLoading = false;
  pdfError = '';
  selectedPdfUrl: SafeResourceUrl | null = null;
  selectedPdfRawUrl = '';
  selectedPdfTitle = '';

  private currentPdfObjectUrl: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private evaluationService: ElEmarEvaluationService,
    private zoneService: ZoneService,
    private classementZoneService: ClassementZoneService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('candidatureId'));

      if (!id || isNaN(id)) {
        this.pageError = 'Identifiant candidature invalide.';
        this.loading = false;
        this.loadFinished = true;
        return;
      }

      this.candidatureId = id;
      this.loadDetail();
      this.loadZones();
    });
  }

  ngOnDestroy(): void {
    this.closePdfObjectUrlOnly();
  }

  // =====================================================
  // LOAD DETAIL
  // =====================================================

  loadDetail(): void {
    if (!this.candidatureId) {
      this.pageError = "Aucun identifiant candidature trouvé dans l'URL.";
      this.loading = false;
      this.loadFinished = true;
      return;
    }

    this.loading = true;
    this.loadFinished = false;
    this.pageError = '';
    this.successMessage = '';
    this.debugMessage = '';

    this.evaluationService
      .getCandidatureDetail(this.candidatureId)
      .pipe(
        timeout(10000),
        catchError((error: unknown) => {
          console.error('ERROR OR TIMEOUT LOAD DETAIL', error);
          this.pageError = 'Le chargement du dossier a pris trop de temps ou a échoué.';
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          this.loadFinished = true;
          this.cdr.detectChanges();
        })
      )
      .subscribe((data: ElEmarCandidatureDetail | null) => {
        if (!data) {
          this.detail = null;
          this.selectedLot = null;
          return;
        }

        this.detail = data;

        for (const lot of this.detail.lots || []) {
          this.initDecisionStateForLot(lot);
        }

        if (this.detail.lots && this.detail.lots.length > 0) {
          this.selectedLot = this.detail.lots[0];
          this.initDecisionStateForLot(this.selectedLot);
        } else {
          this.selectedLot = null;
          this.debugMessage = 'Candidature chargée, mais aucun lot rempli trouvé.';
        }

        this.initReferenceZoneSelection();
        this.cdr.detectChanges();
      });
  }

  loadZones(): void {
    this.loadingZones = true;

    this.zoneService
      .getAll()
      .pipe(
        timeout(8000),
        catchError((error: unknown) => {
          console.error('ERROR OR TIMEOUT LOAD ZONES', error);
          return of([]);
        }),
        finalize(() => {
          this.loadingZones = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe((zones: Zone[]) => {
        this.zones = zones || [];
        this.initReferenceZoneSelection();
        this.cdr.detectChanges();
      });
  }

  // =====================================================
  // ZONES RÉFÉRENCES
  // =====================================================

 initReferenceZoneSelection(): void {
  if (!this.detail?.lots) return;

  for (const lot of this.detail.lots) {
    for (const ref of lot.references || []) {
      const key = String(ref.id);

      // Ne jamais écraser une sélection déjà faite localement
      if (this.referenceZoneSelection[key]) {
        continue;
      }

      // On ne se fie qu'à l'ID, jamais au nom (source de doublons)
      if (ref.zoneElEmarId) {
        this.referenceZoneSelection[key] = String(ref.zoneElEmarId);
      } else {
        this.referenceZoneSelection[key] = '';
      }
    }
  }
}

  onReferenceZoneChangeLocal(ref: ElEmarReferenceProjet, zoneId: string): void {
    const key = String(ref.id);
    this.referenceZoneSelection[key] = zoneId;

    const selectedZone = this.zones.find(
      zone => String(zone.id) === String(zoneId)
    );

    ref.zoneElEmarId = selectedZone?.id || null;
    ref.zoneElEmarNom = selectedZone?.nomZone || null;
    ref.zoneValidee = false;
    ref.zone = selectedZone?.nomZone || null;

    this.successMessage =
      'Zone El Emar sélectionnée localement. Elle sera enregistrée lors de la validation du lot.';

    this.cdr.detectChanges();
  }

  validerZoneReference(
    lot: ElEmarLotEvaluation | null,
    ref: ElEmarReferenceProjet
  ): void {
    if (!lot) {
      this.pageError = 'Aucun lot sélectionné.';
      return;
    }

    if (!ref?.id) {
      this.pageError = 'Référence projet introuvable.';
      return;
    }

    const selectedZoneId = this.referenceZoneSelection[String(ref.id)];

    if (!selectedZoneId) {
      this.pageError = 'Veuillez choisir une zone El Emar avant validation.';
      return;
    }

    const request: SaveReferenceZoneRequest = {
      referenceProjetId: Number(ref.id),
      applicationCandidatureId: Number(lot.applicationCandidatureId),
      zoneId: Number(selectedZoneId),
      commentaire: this.referenceZoneCommentaire[String(ref.id)] || null
    };

    this.saving = true;
    this.pageError = '';
    this.successMessage = '';

    this.classementZoneService.validerReferenceZone(request).subscribe({
      next: (classement: ClassementZoneResponse) => {
        this.saving = false;

        const selectedZone = this.zones.find(
          zone => Number(zone.id) === Number(selectedZoneId)
        );

        ref.zoneElEmarId = Number(selectedZoneId);
        ref.zoneElEmarNom = selectedZone?.nomZone || classement.nomZone || null;
        ref.zone = selectedZone?.nomZone || classement.nomZone || null;
        ref.zoneValidee = true;

        this.classementsByApplicationId[
          Number(lot.applicationCandidatureId)
        ] = classement;

        this.successMessage =
          `Zone enregistrée pour la référence "${ref.nomProjet || 'Projet'}". Catégorie : ${classement.categorie}.`;

        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('ERROR VALIDATION ZONE REFERENCE', error);

        this.saving = false;

        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors de la validation de la zone.';

        this.cdr.detectChanges();
      }
    });
  }

  getReferenceZoneLabel(ref: ElEmarReferenceProjet): string {
    const selectedId = this.referenceZoneSelection[String(ref.id)];

    if (selectedId) {
      const selectedZone = this.zones.find(
        zone => String(zone.id) === String(selectedId)
      );

      if (selectedZone) return selectedZone.nomZone;
    }

    const rawZone = String(ref.zoneElEmarNom || ref.zone || '').trim();

    if (!rawZone) return '-';

    const zoneByName = this.zones.find(zone =>
      String(zone.nomZone || '').trim().toLowerCase() === rawZone.toLowerCase()
    );

    if (zoneByName) return zoneByName.nomZone;

    const zoneById = this.zones.find(zone => String(zone.id) === rawZone);

    if (zoneById) return zoneById.nomZone;

    return rawZone;
  }

  getReferenceZoneAdresse(ref: ElEmarReferenceProjet): string {
    const selectedId = this.referenceZoneSelection[String(ref.id)];

    if (selectedId) {
      const selectedZone = this.zones.find(
        zone => String(zone.id) === String(selectedId)
      );

      return selectedZone?.adresse || '';
    }

    return '';
  }

  // =====================================================
  // DOCUMENTS GÉNÉRAUX
  // =====================================================

  onDocumentGeneralStatutChange(
    typeDocument: 'RNE' | 'CNSS',
    statut: StatutEvaluation
  ): void {
    if (!this.detail) return;

    if (typeDocument === 'RNE') this.detail.rneStatut = statut;
    if (typeDocument === 'CNSS') this.detail.cnssStatut = statut;

    if (this.isDossierNonRecevable()) {
      this.detail.dossierRecevable = false;
      this.detail.motifNonRecevable = 'RNE ou CNSS non conforme.';
    } else {
      this.detail.dossierRecevable = true;
      this.detail.motifNonRecevable = null;
    }

    this.successMessage = 'Contrôle du document mis à jour localement.';
    this.cdr.detectChanges();
  }

  isDossierNonRecevable(): boolean {
    const rne = this.detail?.rneStatut || 'A_VERIFIER';
    const cnss = this.detail?.cnssStatut || 'A_VERIFIER';

    return rne === 'NON_CONFORME' || cnss === 'NON_CONFORME';
  }

  // =====================================================
  // NOTES
  // =====================================================

  getDisplayedGlobalNote(): number {
    if (this.isDossierNonRecevable()) return 0;
    return Number(this.detail?.noteGlobale || 0);
  }

  getDisplayedLotNote(lot: ElEmarLotEvaluation): number {
    if (this.isDossierNonRecevable()) return 0;
    return Number(lot.noteLot || 0);
  }

  getDisplayedCritereNote(critere: ElEmarCritereEvaluation): number {
    if (this.isDossierNonRecevable()) return 0;
    return Number(critere.noteObtenue || 0);
  }

  getNoteClass(note?: number | null): string {
    const value = Number(note || 0);

    if (value >= 70) return 'score-good';
    if (value >= 40) return 'score-medium';

    return 'score-low';
  }

  // =====================================================
  // LOTS
  // =====================================================

  selectLot(lot: ElEmarLotEvaluation): void {
    this.selectedLot = lot;
    this.initDecisionStateForLot(lot);
    this.cdr.detectChanges();
  }

  getSections(lot: ElEmarLotEvaluation | null): string[] {
    if (!lot || !lot.criteres) return [];

    const sections = lot.criteres.map(
      (critere: ElEmarCritereEvaluation) => critere.section || 'Critères'
    );

    return Array.from(new Set(sections));
  }

  getCriteresBySection(
    lot: ElEmarLotEvaluation | null,
    section: string
  ): ElEmarCritereEvaluation[] {
    if (!lot || !lot.criteres) return [];

    return lot.criteres.filter(
      (critere: ElEmarCritereEvaluation) =>
        (critere.section || 'Critères') === section
    );
  }

  onStatutEvaluationChange(
    lot: ElEmarLotEvaluation,
    critere: ElEmarCritereEvaluation
  ): void {
    if (this.isDossierNonRecevable()) {
      this.pageError = 'Le dossier est non recevable : RNE ou CNSS non conforme.';
      return;
    }

    critere.conforme = critere.statutEvaluation === 'CONFORME';

    if (critere.statutEvaluation === 'CONFORME') {
      critere.noteObtenue = Number(critere.noteMax || 0);
    } else {
      critere.noteObtenue = 0;
    }

    this.recalculateLotLocal(lot);
    this.saveCritereEvaluation(lot, critere);
  }

  saveCritereEvaluation(
    lot: ElEmarLotEvaluation,
    critere: ElEmarCritereEvaluation
  ): void {
    const request: SaveEvaluationRequest = {
      statut: critere.statutEvaluation,
      commentaireEvaluateur: critere.commentaireEvaluateur || null,
      evaluateurId: this.getCurrentUserId()
    };

    this.saving = true;
    this.pageError = '';
    this.successMessage = '';

    this.evaluationService
      .saveCritereEvaluation(
        lot.applicationCandidatureId,
        critere.reponseCritereId,
        request
      )
      .subscribe({
        next: (response: SaveEvaluationResponse) => {
          critere.statutEvaluation = response.statutEvaluation;
          critere.conforme = response.conforme;
          critere.noteObtenue = response.noteObtenue;
          critere.commentaireEvaluateur = response.commentaireEvaluateur;

          lot.noteLot = response.noteLot;

          if (this.detail) {
            this.detail.noteGlobale = response.noteGlobale;
          }

          this.saving = false;
          this.successMessage = 'Évaluation sauvegardée.';
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          console.error('ERROR SAVE CRITERE EVALUATION', error);

          this.saving = false;
          this.pageError = "Erreur lors de la sauvegarde de l'évaluation.";

          this.cdr.detectChanges();
        }
      });
  }

  recalculateLotLocal(lot: ElEmarLotEvaluation): void {
    const totalMax = (lot.criteres || []).reduce(
      (sum: number, critere: ElEmarCritereEvaluation) =>
        sum + Number(critere.noteMax || 0),
      0
    );

    const totalObtenu = (lot.criteres || []).reduce(
      (sum: number, critere: ElEmarCritereEvaluation) =>
        sum + Number(critere.noteObtenue || 0),
      0
    );

    lot.noteLot = totalMax > 0
      ? Number(((totalObtenu / totalMax) * 100).toFixed(2))
      : 0;

    this.recalculateGlobalLocal();
  }

  recalculateGlobalLocal(): void {
    if (!this.detail) return;

    const allCriteres: ElEmarCritereEvaluation[] = (this.detail.lots || [])
      .flatMap((lot: ElEmarLotEvaluation) => lot.criteres || []);

    const totalMax = allCriteres.reduce(
      (sum: number, c: ElEmarCritereEvaluation) =>
        sum + Number(c.noteMax || 0),
      0
    );

    const totalObtenu = allCriteres.reduce(
      (sum: number, c: ElEmarCritereEvaluation) =>
        sum + Number(c.noteObtenue || 0),
      0
    );

    this.detail.noteGlobale = totalMax > 0
      ? Number(((totalObtenu / totalMax) * 100).toFixed(2))
      : 0;
  }

  // =====================================================
  // NOTIFICATION PAR CRITÈRE
  // =====================================================
// =====================================================
// NOTIFICATION PAR CRITÈRE
// =====================================================

getCritereNotificationKey(
  lot: ElEmarLotEvaluation | null,
  critere: ElEmarCritereEvaluation | null
): string {
  if (!lot || !critere) {
    return '';
  }

  const applicationCandidatureId = Number(lot.applicationCandidatureId);
  const reponseCritereId = Number(critere.reponseCritereId);

  if (!applicationCandidatureId || !reponseCritereId) {
    return '';
  }

  return `${applicationCandidatureId}_${reponseCritereId}`;
}

getCritereCommentaire(
  lot: ElEmarLotEvaluation | null,
  critere: ElEmarCritereEvaluation | null
): string {
  const key = this.getCritereNotificationKey(lot, critere);

  if (!key) {
    return '';
  }

  return this.commentaireCritereNotification[key] || '';
}

setCritereCommentaire(
  lot: ElEmarLotEvaluation | null,
  critere: ElEmarCritereEvaluation | null,
  value: string
): void {
  const key = this.getCritereNotificationKey(lot, critere);

  if (!key) {
    return;
  }

  this.commentaireCritereNotification[key] = value || '';
}

hasCritereCommentaire(
  lot: ElEmarLotEvaluation | null,
  critere: ElEmarCritereEvaluation | null
): boolean {
  return this.getCritereCommentaire(lot, critere).trim().length > 0;
}

envoyerCommentaireCritereAuCandidat(
  lot: ElEmarLotEvaluation | null,
  critere: ElEmarCritereEvaluation | null
): void {
  console.log('CLICK NOTIFICATION CRITERE', {
    lot,
    critere,
    key: this.getCritereNotificationKey(lot, critere),
    message: this.getCritereCommentaire(lot, critere)
  });

  if (!lot || !critere) {
    this.pageError = 'Lot ou critère introuvable.';
    return;
  }

  const applicationCandidatureId = Number(lot.applicationCandidatureId);
  const reponseCritereId = Number(critere.reponseCritereId);

  if (!applicationCandidatureId || !reponseCritereId) {
    this.pageError = 'Application ou critère introuvable.';
    return;
  }

  const key = this.getCritereNotificationKey(lot, critere);
  const message = this.getCritereCommentaire(lot, critere).trim();

  if (!message) {
    this.pageError = 'Veuillez écrire un commentaire pour ce critère.';
    return;
  }

  const expediteurId = this.getCurrentUserId();

  if (!expediteurId) {
    this.pageError = 'Utilisateur El Emar connecté introuvable.';
    console.error('STOP NOTIFICATION: expediteurId introuvable');
    return;
  }

  const destinataireId =
    Number(
      (lot as any).candidatUserId ||
      (lot as any).utilisateurId ||
      (this.detail as any)?.candidatUserId ||
      (this.detail as any)?.utilisateurId ||
      (this.detail as any)?.candidatId ||
      0
    ) || null;

  this.saving = true;
  this.pageError = '';
  this.successMessage = '';

  console.log('SEND NOTIFICATION REQUEST', {
    applicationCandidatureId,
    reponseCritereId,
    expediteurId,
    destinataireId,
    message
  });

  this.notificationService.envoyerCommentaireCritereElEmar(
    applicationCandidatureId,
    reponseCritereId,
    {
      expediteurId,
      destinataireId,
      candidatureId: this.candidatureId,
      applicationCandidatureId,
      reponseCritereId,
      critereEvaluationId: critere.critereEvaluationId,
      codeCritere: critere.codeCritere || null,
      libelleCritere: critere.libelle || null,
      message
    }
  ).subscribe({
    next: (response) => {
      console.log('NOTIFICATION SAVED', response);

      this.saving = false;

      this.successMessage =
        `Commentaire envoyé au candidat pour le critère : ${critere.libelle || critere.codeCritere || ''}`;

      this.commentaireCritereNotification[key] = '';

      this.cdr.detectChanges();
    },
    error: (error: any) => {
      console.error('ERROR SEND CRITERE NOTIFICATION', error);

      this.saving = false;

      this.pageError =
        error?.error?.message ||
        error?.error?.detail ||
        'Erreur lors de l’envoi du commentaire du critère.';

      this.cdr.detectChanges();
    }
  });
}
get zonesUniques(): Zone[] {
  const seen = new Map<string, Zone>();

  for (const zone of this.zones) {
    const key = (zone.nomZone || '').trim().toLowerCase();

    if (!seen.has(key)) {
      seen.set(key, zone);
    }
  }

  return Array.from(seen.values());
}
// initReferenceZoneSelection(): void {
//   if (!this.detail?.lots) return;

//   for (const lot of this.detail.lots) {
//     for (const ref of lot.references || []) {
//       const key = String(ref.id);

//       // Ne jamais écraser une sélection déjà faite localement
//       if (this.referenceZoneSelection[key]) {
//         continue;
//       }

//       // On ne se fie qu'à l'ID, jamais au nom (source de doublons)
//       if (ref.zoneElEmarId) {
//         this.referenceZoneSelection[key] = String(ref.zoneElEmarId);
//       } else {
//         this.referenceZoneSelection[key] = '';
//       }
//     }
//   }
// }
  // =====================================================
  // DÉCISION FINALE PAR LOT
  // =====================================================

  getLotKey(lot: ElEmarLotEvaluation | null): number | null {
    if (!lot?.applicationCandidatureId) return null;
    return Number(lot.applicationCandidatureId);
  }

  initDecisionStateForLot(lot: ElEmarLotEvaluation | null): void {
    const lotKey = this.getLotKey(lot);

    if (!lotKey || !lot) return;

    if (!(lotKey in this.decisionFinaleByLot)) {
      const rawDecision = String(
        (lot as any).decisionFinale ||
        (lot as any).decision ||
        lot.statut ||
        ''
      ).toUpperCase();

      if (
        rawDecision.includes('ADMIS') ||
        rawDecision.includes('ADMISE') ||
        rawDecision.includes('ACCEPTE') ||
        rawDecision.includes('ACCEPTEE')
      ) {
        this.decisionFinaleByLot[lotKey] = 'ADMIS';
      } else if (
        rawDecision.includes('REJETE') ||
        rawDecision.includes('REJETEE') ||
        rawDecision.includes('REFUSE') ||
        rawDecision.includes('REFUSEE')
      ) {
        this.decisionFinaleByLot[lotKey] = 'REJETE';
      } else {
        this.decisionFinaleByLot[lotKey] = null;
      }
    }

    if (!(lotKey in this.observationFinaleByLot)) {
      this.observationFinaleByLot[lotKey] =
        (lot as any).observationFinale ||
        (lot as any).observation ||
        '';
    }

    if (!(lotKey in this.validatingDecisionByLot)) {
      this.validatingDecisionByLot[lotKey] = false;
    }

    if (!(lotKey in this.decisionValidatedByLot)) {
      this.decisionValidatedByLot[lotKey] = false;
    }
  }

  getFinalScoreForLot(lot: ElEmarLotEvaluation | null): number {
    if (!lot) return 0;
    return this.getDisplayedLotNote(lot);
  }

  canAdmettreLot(lot: ElEmarLotEvaluation | null): boolean {
    if (!lot) return false;

    return this.getFinalScoreForLot(lot) >= 80 &&
      !this.isDossierNonRecevable();
  }

  selectDecisionForLot(
    lot: ElEmarLotEvaluation | null,
    decision: 'ADMIS' | 'REJETE'
  ): void {
    const lotKey = this.getLotKey(lot);

    if (!lotKey) {
      this.pageError = 'Lot introuvable.';
      return;
    }

    if (decision === 'ADMIS' && !this.canAdmettreLot(lot)) {
      this.pageError =
        'Admission impossible pour ce lot : la note doit être supérieure ou égale à 80/100 et le dossier doit être recevable.';
      return;
    }

    this.decisionFinaleByLot[lotKey] = decision;
    this.pageError = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  getDecisionButtonClassForLot(
    lot: ElEmarLotEvaluation | null,
    decision: 'ADMIS' | 'REJETE'
  ): string {
    const lotKey = this.getLotKey(lot);

    if (!lotKey) return '';

    return this.decisionFinaleByLot[lotKey] === decision
      ? 'decision-selected'
      : '';
  }

  isLotValidating(lot: ElEmarLotEvaluation | null): boolean {
    const lotKey = this.getLotKey(lot);

    if (!lotKey) return false;

    return this.validatingDecisionByLot[lotKey] === true;
  }

  isLotDecisionValidated(lot: ElEmarLotEvaluation | null): boolean {
    const lotKey = this.getLotKey(lot);

    if (!lotKey) return false;

    return this.decisionValidatedByLot[lotKey] === true;
  }

  getSelectedZoneRequestsForLot(
    lot: ElEmarLotEvaluation | null
  ): SaveReferenceZoneRequest[] {
    if (!lot) return [];

    const requests: SaveReferenceZoneRequest[] = [];

    for (const ref of lot.references || []) {
      const selectedZoneId = this.referenceZoneSelection[String(ref.id)];

      if (!selectedZoneId) continue;

      requests.push({
        referenceProjetId: Number(ref.id),
        applicationCandidatureId: Number(lot.applicationCandidatureId),
        zoneId: Number(selectedZoneId),
        commentaire: this.referenceZoneCommentaire[String(ref.id)] || null
      });
    }

    return requests;
  }

hasAtLeastOneZoneSelectedForLot(
  lot: ElEmarLotEvaluation | null
): boolean {
  if (!lot) return false;

  return (lot.references || []).some(ref => {
    const selectedZoneId = this.referenceZoneSelection[String(ref.id)];

    return !!selectedZoneId || ref.zoneValidee === true;
  });
}

  validerDecisionFinaleLot(
    lot: ElEmarLotEvaluation | null
  ): void {
    const lotKey = this.getLotKey(lot);

    if (!lot || !lotKey) {
      this.pageError = 'Lot sélectionné introuvable.';
      return;
    }

    const decision = this.decisionFinaleByLot[lotKey];

    if (!decision) {
      this.pageError =
        'Veuillez choisir une décision pour ce lot : Admettre ou Rejeter.';
      return;
    }

    if (decision === 'ADMIS' && !this.canAdmettreLot(lot)) {
      this.pageError =
        'Admission impossible pour ce lot : la note doit être supérieure ou égale à 80/100.';
      return;
    }

    if (decision === 'ADMIS' && !this.hasAtLeastOneZoneSelectedForLot(lot)) {
      this.pageError =
        'Veuillez choisir au moins une zone El Emar pour les projets de référence de ce lot.';
      return;
    }

    this.validatingDecisionByLot[lotKey] = true;
    this.pageError = '';
    this.successMessage = '';

    const decisionRequest = {
      decision,
      observation: this.observationFinaleByLot[lotKey]?.trim() || null,
      evaluateurId: this.getCurrentUserId()
    };

    if (decision === 'REJETE') {
      this.saveFinalDecisionLotOnly(lot, decisionRequest);
      return;
    }

  const zoneRequests = this.getSelectedZoneRequestsForLot(lot);

if (zoneRequests.length === 0) {
  this.saveFinalDecisionLotOnly(lot, decisionRequest);
  return;
}

forkJoin(
  zoneRequests.map(request =>
    this.classementZoneService.validerReferenceZone(request)
  )
).subscribe({
  next: (classements: ClassementZoneResponse[]) => {
    for (const classement of classements || []) {
      if (classement.applicationCandidatureId) {
        this.classementsByApplicationId[
          Number(classement.applicationCandidatureId)
        ] = classement;
      }
    }

    this.saveFinalDecisionLotOnly(lot, decisionRequest);
  },
  error: (error: any) => {
    console.error('ERROR SAVE ZONE BEFORE LOT DECISION', error);

    if (error?.status === 409) {
      this.debugMessage =
        'La zone est déjà enregistrée. Validation de la décision finale en cours...';

      this.saveFinalDecisionLotOnly(lot, decisionRequest);
      return;
    }

    this.validatingDecisionByLot[lotKey] = false;

    this.pageError =
      error?.error?.message ||
      error?.error?.detail ||
      'Erreur lors de l’enregistrement du classement par zone pour ce lot.';

    this.cdr.detectChanges();
  }
});
  }

  private saveFinalDecisionLotOnly(
    lot: ElEmarLotEvaluation,
    request: any
  ): void {
    const lotKey = this.getLotKey(lot);

    if (!lotKey) return;

    this.evaluationService
      .saveDecisionFinaleLot(lotKey, request)
      .subscribe({
        next: (response) => {
          this.validatingDecisionByLot[lotKey] = false;
          this.decisionValidatedByLot[lotKey] = true;

          lot.decisionFinale = response.decisionFinale;
          lot.observationFinale = response.observationFinale || null;
          lot.statut = response.statutLot || response.decisionFinale || lot.statut;
          lot.noteLot = response.noteLot ?? lot.noteLot;

          if (this.detail) {
            this.detail.noteGlobale = response.noteGlobale;
          }

          this.successMessage =
            response.decisionFinale === 'ADMIS'
              ? `Décision validée pour le lot ${lot.nomLot} : admis. Les zones sélectionnées sont enregistrées.`
              : `Décision validée pour le lot ${lot.nomLot} : rejeté.`;

          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('ERROR SAVE LOT DECISION FINALE', error);

          this.validatingDecisionByLot[lotKey] = false;

          this.pageError =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors de la validation de la décision finale du lot.';

          this.cdr.detectChanges();
        }
      });
  }

  getClassementForLot(
    lot: ElEmarLotEvaluation | null
  ): ClassementZoneResponse | null {
    const lotKey = this.getLotKey(lot);

    if (!lotKey) return null;

    return this.classementsByApplicationId[lotKey] || null;
  }

  getCategorieClass(categorie?: string | null): string {
    const value = String(categorie || '').toUpperCase();

    if (value === 'A') return 'categorie-a';
    if (value === 'B') return 'categorie-b';
    if (value === 'C') return 'categorie-c';
    if (value === 'NON_QUALIFIE') return 'categorie-non-qualifie';

    return 'categorie-attente';
  }

  // =====================================================
  // PDF
  // =====================================================

  openPdfModal(url?: string | null, title?: string | null): void {
    if (!url) {
      this.pageError = 'Aucun fichier PDF disponible.';
      return;
    }

    this.closePdfObjectUrlOnly();

    this.pdfModalOpen = true;
    this.pdfLoading = true;
    this.pdfError = '';
    this.selectedPdfUrl = null;
    this.selectedPdfRawUrl = '';
    this.selectedPdfTitle = title || 'Consultation du document';

    this.cdr.detectChanges();

    this.evaluationService
      .getPdfBlob(url)
      .pipe(
        timeout(15000),
        catchError((error: unknown) => {
          console.error('ERROR OR TIMEOUT LOAD PDF', error);
          this.pdfError =
            "Impossible d'afficher le PDF. Vérifiez que le backend répond.";
          return of(null);
        }),
        finalize(() => {
          this.pdfLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe((blob: Blob | null) => {
        if (!blob || blob.size === 0) {
          this.pdfError = 'Le fichier PDF est vide ou introuvable.';
          this.cdr.detectChanges();
          return;
        }

        const pdfBlob = new Blob([blob], { type: 'application/pdf' });

        this.currentPdfObjectUrl = URL.createObjectURL(pdfBlob);

        this.selectedPdfUrl =
          this.sanitizer.bypassSecurityTrustResourceUrl(
            this.currentPdfObjectUrl
          );

        this.selectedPdfRawUrl = this.currentPdfObjectUrl;

        this.cdr.detectChanges();
      });
  }

  closePdfModal(): void {
    this.pdfModalOpen = false;
    this.pdfLoading = false;
    this.pdfError = '';
    this.selectedPdfUrl = null;
    this.selectedPdfTitle = '';
    this.selectedPdfRawUrl = '';

    this.closePdfObjectUrlOnly();
    this.cdr.detectChanges();
  }

  private closePdfObjectUrlOnly(): void {
    if (this.currentPdfObjectUrl) {
      URL.revokeObjectURL(this.currentPdfObjectUrl);
      this.currentPdfObjectUrl = null;
    }
  }

  // =====================================================
  // HELPERS
  // =====================================================

  goBack(): void {
    this.router.navigate(['/el-emar/evaluations']);
  }

  getPieceButtonLabel(piece: ElEmarPieceEvaluation): string {
    if (!piece.deposee) return 'Non déposé';
    return piece.nomPiece || piece.codePiece || 'Voir PDF';
  }

  getReferenceP11Title(): string {
    return 'Références similaires dans le même métier';
  }

  getReferenceP12Title(): string {
    return "Attestation du maître d'ouvrage";
  }

  getStatusClass(statut?: StatutEvaluation | string | null): string {
    const value = (statut || '').toUpperCase();

    if (value === 'CONFORME') return 'status-conforme';
    if (value === 'NON_CONFORME') return 'status-non-conforme';

    return 'status-verifier';
  }

  formatBoolean(value?: boolean | null): string {
    if (value === true) return 'Oui';
    if (value === false) return 'Non';

    return '-';
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';

    const date = new Date(value);

    if (isNaN(date.getTime())) return value;

    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
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
      'authUser'
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