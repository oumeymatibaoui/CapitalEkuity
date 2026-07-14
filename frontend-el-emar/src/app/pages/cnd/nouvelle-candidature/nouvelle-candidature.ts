import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';import * as L from 'leaflet';
import { CandidatCompteService } from '../../../core/services/candidat-compte.service';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { finalize, forkJoin, timeout } from 'rxjs';
import {
  CndFormulaireSauvegardeService
} from '../../../core/services/cnd-formulaire-sauvegarde.service';

import {
  CndReferenceCandidatService,
  ProjetReferenceResponse
} from '../../../core/services/cnd-reference-candidat.service';
import {
  CandidatureInfoRequest,
  CandidatureResponse,
  CndCandidatureService,
  LotOption
} from '../../../core/services/cnd-candidature.service';

import {
  FormulaireEvaluationCandidatService
} from '../../../core/services/formulaire-evaluation-candidat.service';

interface DocumentGeneralCandidature {
  id: number;
  codeDocument: 'RNE' | 'CNSS';
  nomDocument: string;
  description: string;
  formatAccepte: string;
  obligatoire: boolean;
}
interface ReferenceProjetForm {
  id?: number | null;
  localKey: string;
  lotId: number;

  nomProjet: string;
  maitreOuvrage: string;

  ville: string;
  zone: string;
  adresseProjet: string;
  latitude: number | null;
  longitude: number | null;

  typeProjet: string;

  surfaceM2: number | null;
  niveauxRPlus: number | null;
  nombreSousSols: number | null;
  anneeLivraison: number | null;

  bimOuiNon: boolean | null;
  seuilOk: boolean | null;

  missionRealisee: string;
  montant: number | null;

  fichierP11: File | null;
  fichierP12: File | null;

  uploadedFichierP11Name?: string;
  uploadedFichierP12Name?: string;
}
interface PieceCritere {
  id?: number;
  codePiece?: string;
  nomPiece?: string;
  obligatoire?: boolean;
  conditionReponse?: string | null;
  formatAccepte?: string;
  ordreAffichage?: number;
}

interface CritereFormulaire {
  id: number;
  codeCritere?: string;
  libelleCritere?: string;
  labelCandidat?: string;
  aideCandidat?: string;
  raisonDonnee?: string;
  noteCandidat?: string;
  typeChamp: string;
  obligatoire?: boolean;
  optionsChamp?: string;
  ordreAffichage?: number;
  pieces?: PieceCritere[];
}

interface SectionFormulaire {
  section: string;
  criteres: CritereFormulaire[];
}

interface FormulaireLotCandidat {
  lotId: number;
  nomLot: string;
  sections: SectionFormulaire[];
}

interface PieceGroupTableView {
  pieceKey: string;
  pieces: PieceCritere[];
  obligatoire: boolean;
  criteres: CritereFormulaire[];
}

interface SectionTableView {
  section: string;
  noPieceCriteres: CritereFormulaire[];
  pieceGroups: PieceGroupTableView[];
}

@Component({
  selector: 'app-nouvelle-candidature',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './nouvelle-candidature.html',
  styleUrls: ['./nouvelle-candidature.scss']
})
export class NouvelleCandidature implements OnInit {
referenceMaps: Record<string, L.Map> = {};
referenceMarkers: Record<string, L.Marker> = {};
  uploadedPieceFileNames: Record<string, string> = {};
  utilisateurId: number | null = null;
lotsFormulaireRemplisIds: number[] = [];
selectedReferenceLotId: number | null = null;
  currentStep: number = 1;
  readonly maxStep = 4;

  stepSocieteDone = false;
  stepFormulaireDone = false;
  stepReferencesDone = false;

  steps = [
    { number: 1, label: 'Données générales' },
    { number: 2, label: 'Formulaire par lot' },
    { number: 3, label: 'Références' },
    { number: 4, label: 'Soumission' }
  ];
candidatProfile = {
  nom: '',
  email: '',
  fonction: ''
};

showPasswordForm = false;
changingPassword = false;
passwordSuccessMessage = '';
passwordErrorMessage = '';

passwordForm: FormGroup;
  loading = false;
  loadingChamps = false;
  savingSociete = false;
  uploadingPiecesSociete = false;
  submitting = false;
savingLot = false;
savingReferences = false;
  pageError = '';
  successMessage = '';

  candidature: CandidatureResponse | null = null;

  lots: LotOption[] = [];
  selectedLotId: number | null = null;
  selectedLotName = '';

  formulaireLot: FormulaireLotCandidat | null = null;
  groupedSections: SectionTableView[] = [];

  critereValues: Record<number, any> = {};

  selectedFilesByPieceKey: Record<string, File | null> = {};
  selectedGeneralFilesByDocumentId: Record<number, File | null> = {};
  referencesByLotId: Record<number, ReferenceProjetForm[]> = {};

  societeForm: FormGroup;

  documentsGeneraux: DocumentGeneralCandidature[] = [
    {
      id: 1,
      codeDocument: 'RNE',
      nomDocument: 'Registre National des Entreprises / RNE',
      description: 'Pièce obligatoire pour identifier légalement la société.',
      formatAccepte: 'PDF',
      obligatoire: true
    },
    {
      id: 2,
      codeDocument: 'CNSS',
      nomDocument: 'Attestation CNSS',
      description: 'Pièce obligatoire pour vérifier la situation sociale.',
      formatAccepte: 'PDF',
      obligatoire: true
    }
  ];

constructor(
  private fb: FormBuilder,
  private route: ActivatedRoute,
  private candidatureService: CndCandidatureService,
  private formulaireEvaluationService: FormulaireEvaluationCandidatService,
  private formulaireSauvegardeService: CndFormulaireSauvegardeService,
  private referenceCandidatService: CndReferenceCandidatService,
  private candidatCompteService: CandidatCompteService,
  private cdr: ChangeDetectorRef,
  private zone: NgZone,
  private router: Router,

) {
  this.societeForm = this.fb.group({
    raisonSociale: [''],
    formeJuridique: [''],
    rneMatriculeFiscal: [''],
    dateCreationBureau: [null],
    adresseSiege: [''],
    telephone: [''],
    emailPrincipal: [''],
    siteInternet: [''],
    ville: [''],
    representantLegal: [''],
    fonctionRepresentant: [''],
    specialites: [''],
    agrementsCertifications: [''],
    banquePrincipale: [''],
    localisation: ['']
  });

  this.passwordForm = this.fb.group({
    oldPassword: [''],
    newPassword: [''],
    confirmPassword: ['']
  });
}

notificationTargetCritereEvaluationId: number | null = null;
notificationTargetReponseCritereId: number | null = null;
notificationTargetLotId: number | null = null;
notificationTargetApplicationCandidatureId: number | null = null;
private notificationTargetApplied = false;

  ngOnInit(): void {
    this.readNotificationTargetFromUrl();

    this.utilisateurId = this.getCurrentUserId();
    this.loadCandidatProfileFromStorage();

    if (!this.utilisateurId) {
      this.pageError = 'Utilisateur connecté introuvable.';
      return;
    }

    this.loadInitialData();
  }

private readNotificationTargetFromUrl(): void {
  this.route.queryParamMap.subscribe((params: ParamMap) => {
    const step = Number(params.get('step'));
    const fromNotification = params.get('fromNotification') === 'true';

    if (step !== 2 || !fromNotification) {
      this.clearNotificationTarget();
      return;
    }

    const lotId = Number(params.get('lotId'));
    const applicationCandidatureId = Number(params.get('applicationCandidatureId'));
    const critereEvaluationId = Number(params.get('critereEvaluationId'));
    const reponseCritereId = Number(params.get('reponseCritereId'));

    this.notificationTargetLotId = lotId || null;
    this.notificationTargetApplicationCandidatureId = applicationCandidatureId || null;
    this.notificationTargetCritereEvaluationId = critereEvaluationId || null;
    this.notificationTargetReponseCritereId = reponseCritereId || null;
    this.notificationTargetApplied = false;

    this.applyNotificationTargetIfReady();
  });
}
private clearNotificationTarget(): void {
  this.notificationTargetCritereEvaluationId = null;
  this.notificationTargetReponseCritereId = null;
  this.notificationTargetLotId = null;
  this.notificationTargetApplicationCandidatureId = null;
  this.notificationTargetApplied = false;
}

private resetCorrectionModeAfterSave(): void {
  this.clearNotificationTarget();

  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: {
      step: null,
      fromNotification: null,
      notificationId: null,
      lotId: null,
      applicationCandidatureId: null,
      critereEvaluationId: null,
      reponseCritereId: null
    },
    queryParamsHandling: 'merge',
    replaceUrl: true
  });

  this.successMessage = 'Correction sauvegardée avec succès. Le dossier est de nouveau en lecture seule.';
  this.pageError = '';

  if (this.selectedLotId) {
    this.loadFormulaireLot(this.selectedLotId);
  }

  this.cdr.detectChanges();
}
private applyNotificationTargetIfReady(): void {
  if (this.notificationTargetApplied) {
    return;
  }

  if (!this.notificationTargetLotId && !this.notificationTargetCritereEvaluationId) {
    return;
  }

  if (!this.lots || this.lots.length === 0) {
    return;
  }

  this.notificationTargetApplied = true;

  if (this.notificationTargetLotId) {
    const lotExists = this.lots.some(lot => Number(lot.id) === Number(this.notificationTargetLotId));

    if (lotExists) {
      this.selectedLotId = Number(this.notificationTargetLotId);
      this.selectedLotName = this.getLotNameById(this.selectedLotId);
    }
  }

  this.goToStep(2);

  setTimeout(() => {
    this.scrollToNotificationTarget();
  }, 1600);
}

markCurrentLotAsFilled(): void {
  if (!this.selectedLotId) return;

  if (!this.lotsFormulaireRemplisIds.includes(this.selectedLotId)) {
    this.lotsFormulaireRemplisIds.push(this.selectedLotId);
  }

  this.stepFormulaireDone = this.lotsFormulaireRemplisIds.length > 0;

  if (!this.selectedReferenceLotId) {
    this.selectedReferenceLotId = this.selectedLotId;
  }
}

getReferenceLots(): LotOption[] {
  return this.lots.filter(lot =>
    this.lotsFormulaireRemplisIds.includes(lot.id)
  );
}

selectReferenceLot(lotId: number): void {
  this.selectedReferenceLotId = lotId;
  this.initReferenceListForLot(lotId);
  this.loadReferencesForLot(lotId);

  setTimeout(() => {
    this.initMapsForCurrentReferenceLot();
  }, 400);
}
createReferenceLocalKey(lotId: number): string {
  return `ref-${lotId}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

getReferenceMapId(projet: ReferenceProjetForm): string {
  return `reference-map-${projet.localKey}`;
}

initReferenceMap(projet: ReferenceProjetForm): void {
  const mapId = this.getReferenceMapId(projet);

  const element = document.getElementById(mapId);

  if (!element) {
    console.warn('MAP ELEMENT NOT FOUND:', mapId);
    return;
  }

  element.style.height = '350px';
  element.style.width = '100%';

  if (this.referenceMaps[mapId]) {
    this.referenceMaps[mapId].invalidateSize();
    return;
  }

  const defaultLat = projet.latitude ?? 36.8065;
  const defaultLng = projet.longitude ?? 10.1815;

  console.log('CREATE MAP:', mapId);

  const map = L.map(element).setView([defaultLat, defaultLng], 12);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  this.referenceMaps[mapId] = map;

  if (!this.isCandidatureSoumise()) {
  map.on('click', (event: L.LeafletMouseEvent) => {
    this.setReferenceMarker(
      projet,
      event.latlng.lat,
      event.latlng.lng,
      true
    );
  });
}

  if (projet.latitude !== null && projet.longitude !== null) {
    this.setReferenceMarker(
      projet,
      projet.latitude,
      projet.longitude,
      false
    );
  }

  setTimeout(() => {
    map.invalidateSize();
  }, 300);

  setTimeout(() => {
    map.invalidateSize();
  }, 1000);
}

initMapsForCurrentReferenceLot(): void {
  if (!this.selectedReferenceLotId) return;

  const projets = this.getReferenceProjectsByLotId(this.selectedReferenceLotId);

  this.cdr.detectChanges();

  for (const projet of projets) {
    this.initReferenceMapWithRetry(projet);
  }
}
isNotificationTargetLot(lotId: number | null): boolean {
  if (!lotId || !this.notificationTargetLotId) {
    return false;
  }

  return Number(lotId) === Number(this.notificationTargetLotId);
}

isCritereHighlighted(critere: any): boolean {
  if (!critere) {
    return false;
  }

  const critereId = Number(critere.id || critere.critereEvaluationId || 0);
  const targetCritereId = Number(this.notificationTargetCritereEvaluationId || 0);

  if (!critereId || !targetCritereId) {
    return false;
  }

  return critereId === targetCritereId;
}

isPieceGroupHighlighted(group: PieceGroupTableView): boolean {
  return (group.criteres || []).some(critere => this.isCritereHighlighted(critere));
}

getCritereDomId(critere: any): string {
  const id = Number(critere?.id || critere?.critereEvaluationId || 0);
  return id ? `critere-notification-${id}` : '';
}

scrollToNotificationTarget(): void {
  this.tryScrollToNotificationTarget(40);
}

private tryScrollToNotificationTarget(attempts: number): void {
  if (!this.notificationTargetCritereEvaluationId) {
    return;
  }

  const elementId = `critere-notification-${this.notificationTargetCritereEvaluationId}`;
  const element = document.getElementById(elementId);

  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    element.classList.add('notification-highlight-pulse');

    setTimeout(() => {
      element.classList.remove('notification-highlight-pulse');
    }, 4500);

    return;
  }

  if (attempts <= 0) {
    console.warn('Critère ciblé introuvable dans le DOM :', elementId);
    return;
  }

  setTimeout(() => {
    this.tryScrollToNotificationTarget(attempts - 1);
  }, 250);
}
setReferenceMarker(
  projet: ReferenceProjetForm,
  lat: number,
  lng: number,
  loadAddress: boolean
): void {
  const mapId = this.getReferenceMapId(projet);
  const map = this.referenceMaps[mapId];

  if (!map) return;

  projet.latitude = lat;
  projet.longitude = lng;

  const markerIcon = L.divIcon({
    html: '📍',
    className: 'custom-reference-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  });

  if (this.referenceMarkers[mapId]) {
    this.referenceMarkers[mapId].setLatLng([lat, lng]);
  } else {
    this.referenceMarkers[mapId] = L.marker([lat, lng], {
      icon: markerIcon,
      draggable: !this.isCandidatureSoumise()
    }).addTo(map);

    this.referenceMarkers[mapId].on('dragend', () => {
      const position = this.referenceMarkers[mapId].getLatLng();
      this.setReferenceMarker(projet, position.lat, position.lng, true);
    });
  }

  map.setView([lat, lng], 15);

  if (loadAddress) {
    this.reverseGeocodeReferenceProject(projet, lat, lng);
  }

  this.stepReferencesDone = false;
}

reverseGeocodeReferenceProject(
  projet: ReferenceProjetForm,
  lat: number,
  lng: number
): void {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fr`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      // fetch() s'exécute hors de la zone Angular : on force la détection
      this.zone.run(() => {
        const address = data?.address || {};

        projet.adresseProjet = data?.display_name || `${lat}, ${lng}`;

        projet.ville =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.county ||
          '';

        projet.zone =
          address.suburb ||
          address.neighbourhood ||
          address.city_district ||
          address.state ||
          address.county ||
          '';

        this.stepReferencesDone = false;
        this.cdr.detectChanges();
      });
    })
    .catch(error => {
      console.error('ERROR REVERSE GEOCODING', error);

      this.zone.run(() => {
        projet.adresseProjet = `${lat}, ${lng}`;
        projet.ville = '';
        projet.zone = '';
        this.cdr.detectChanges();
      });
    });
}
getReferenceLotName(): string {
  if (!this.selectedReferenceLotId) return '';
  return this.getLotNameById(this.selectedReferenceLotId);
}

prepareReferencesStep(): void {
  const referenceLots = this.getReferenceLots();

  if (referenceLots.length === 0) {
    this.selectedReferenceLotId = null;
    return;
  }

  const alreadyValid =
    this.selectedReferenceLotId !== null &&
    referenceLots.some(lot => lot.id === this.selectedReferenceLotId);

  if (!alreadyValid) {
    this.selectedReferenceLotId = referenceLots[0].id;
  }

  if (this.selectedReferenceLotId !== null) {
    this.initReferenceListForLot(this.selectedReferenceLotId);
    this.loadReferencesForLot(this.selectedReferenceLotId);
  }
}
getFilledLotNames(): string {
  const names = this.getReferenceLots().map(lot => lot.nomLot);

  return names.length > 0 ? names.join(', ') : '-';
}
  // =====================================================
  // INIT
  // =====================================================
getGroupPieceName(group: PieceGroupTableView): string {
  const piece = group.pieces?.[0];

  return piece?.nomPiece || piece?.codePiece || 'Pièce justificative';
}

getGroupPieceFormat(group: PieceGroupTableView): string {
  const piece = group.pieces?.[0];

  return piece?.formatAccepte || 'PDF';
}

onPieceGroupFileSelected(event: Event, group: PieceGroupTableView): void {
  const input = event.target as HTMLInputElement;

  if (!input.files || input.files.length === 0) {
    this.selectedFilesByPieceKey[group.pieceKey] = null;
    return;
  }

  this.selectedFilesByPieceKey[group.pieceKey] = input.files[0];
}

getPieceGroupFileName(group: PieceGroupTableView): string {
  return this.selectedFilesByPieceKey[group.pieceKey]?.name || '';
}
loadLotsAutorises(candidatureId: number): void {
  console.log('CANDIDATURE ID UTILISÉ POUR LOTS = ', candidatureId);

  this.candidatureService.getLotsAutorises(candidatureId).subscribe({
    next: (lots: LotOption[]) => {
      console.log('RAW LOTS FROM API = ', lots);

      this.lots = (lots || [])
        .filter((lot: any) => lot.actif !== false)
        .map((lot: any) => ({
          ...lot,
          id: Number(lot.id),
          nomLot: lot.nomLot || lot.nom || lot.libelle || lot.name || 'Lot sans nom',
          codeLot: lot.codeLot || lot.code || ''
        }));

      console.log('LOTS AUTORISÉS POUR CETTE CANDIDATURE = ', this.lots);

      if (this.lots.length > 0) {
        let lotToSelect = this.lots[0];

        if (this.notificationTargetLotId) {
          const targetLot = this.lots.find(
            lot => Number(lot.id) === Number(this.notificationTargetLotId)
          );

          if (targetLot) {
            lotToSelect = targetLot;
          }
        }

        this.selectedLotId = lotToSelect.id;
        this.selectedLotName = lotToSelect.nomLot;

        if (this.currentStep === 2 || this.notificationTargetLotId) {
          this.loadFormulaireLot(this.selectedLotId);
        }

      } else {
        this.selectedLotId = null;
        this.selectedLotName = '';
        this.formulaireLot = null;
        this.groupedSections = [];
      }

      this.loadLotsRemplis();
      this.applyNotificationTargetIfReady();

      this.loading = false;
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('ERROR LOAD LOTS AUTORISES', error);
      this.pageError = 'Erreur lors du chargement des lots autorisés.';
      this.loading = false;
      this.cdr.detectChanges();
    }
  });
}
private loadCandidatProfileFromStorage(): void {
  const value =
    localStorage.getItem('candidatUser') ||
    localStorage.getItem('connectedUser') ||
    localStorage.getItem('currentUser');

  if (!value) {
    return;
  }

  try {
    const user = JSON.parse(value);

    const prenom = user?.prenom ?? '';
    const nom = user?.nom ?? '';

    const fullName = `${prenom} ${nom}`.trim();

    this.candidatProfile = {
      nom: fullName || nom || user?.email || 'Candidat',
      email: user?.email || '',
      fonction: user?.fonction || user?.fonctionUtilisateur || user?.poste || 'Non renseignée'
    };
  } catch {
    this.candidatProfile = {
      nom: 'Candidat',
      email: '',
      fonction: 'Non renseignée'
    };
  }
}

getProfileInitial(): string {
  const source =
    this.candidatProfile.nom ||
    this.candidatProfile.email ||
    'C';

  return source.trim().charAt(0).toUpperCase();
}

togglePasswordForm(): void {
  this.showPasswordForm = !this.showPasswordForm;
  this.passwordSuccessMessage = '';
  this.passwordErrorMessage = '';

  if (!this.showPasswordForm) {
    this.passwordForm.reset();
  }
}

changePassword(): void {
  this.passwordSuccessMessage = '';
  this.passwordErrorMessage = '';

  if (!this.utilisateurId) {
    this.passwordErrorMessage = 'Utilisateur connecté introuvable.';
    return;
  }

  const oldPassword = String(this.passwordForm.value.oldPassword || '').trim();
  const newPassword = String(this.passwordForm.value.newPassword || '').trim();
  const confirmPassword = String(this.passwordForm.value.confirmPassword || '').trim();

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

  this.candidatCompteService
    .changePassword(this.utilisateurId, oldPassword, newPassword)
    .subscribe({
      next: () => {
        this.changingPassword = false;
        this.passwordSuccessMessage = 'Mot de passe modifié avec succès.';
        this.passwordErrorMessage = '';
        this.passwordForm.reset();
        this.showPasswordForm = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('ERROR CHANGE PASSWORD', error);
        this.changingPassword = false;
        this.passwordErrorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors du changement du mot de passe.';
        this.cdr.detectChanges();
      }
    });
}
loadInitialData(): void {
  this.loading = true;
  this.pageError = '';
  this.successMessage = '';

  if (!this.utilisateurId) {
    this.pageError = 'Utilisateur connecté introuvable.';
    this.loading = false;
    return;
  }

  this.candidatureService.getCurrent(this.utilisateurId).subscribe({
    next: (data: CandidatureResponse) => {
      this.candidature = data;
      this.fillSocieteForm(data);

      if (!data?.id) {
        this.pageError = 'Candidature introuvable pour cet utilisateur.';
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }

      this.loadLotsAutorises(data.id);
    },
    error: (error) => {
      console.error('ERROR CURRENT CANDIDATURE', error);
      this.pageError = 'Erreur lors du chargement de la candidature.';
      this.loading = false;
      this.cdr.detectChanges();
    }
  });
}
initReferenceMapWithRetry(
  projet: ReferenceProjetForm,
  attempts: number = 20
): void {
  const mapId = this.getReferenceMapId(projet);
  const element = document.getElementById(mapId);

  if (!element) {
    if (attempts <= 0) {
      console.warn('MAP ELEMENT STILL NOT FOUND AFTER RETRY:', mapId);
      return;
    }

    setTimeout(() => {
      this.initReferenceMapWithRetry(projet, attempts - 1);
    }, 150);

    return;
  }

  this.initReferenceMap(projet);
}
  loadCurrentCandidature(): void {
    if (!this.utilisateurId) return;

    this.candidatureService.getCurrent(this.utilisateurId).subscribe({
      next: (data: CandidatureResponse) => {
        this.candidature = data;
        this.fillSocieteForm(data);
        this.loadLotsRemplis();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('ERROR CURRENT CANDIDATURE', error);
        this.pageError = 'Erreur lors du chargement de la candidature.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
isCandidatureSoumise(): boolean {
  const statut = (this.candidature?.statut || '').toString().toUpperCase();

  return [
    'SOUMIS',
    'SOUMISE',
    'SUBMITTED',
    'ACCEPTE',
    'ACCEPTEE',
    'REJETE',
    'REJETEE'
  ].includes(statut);
}
  // =====================================================
  // STEP STATUS
  // =====================================================
loadLotsRemplis(): void {
  if (!this.candidature?.id) return;

  this.formulaireSauvegardeService
    .getLotsRemplis(this.candidature.id)
    .subscribe({
      next: (ids) => {
        this.lotsFormulaireRemplisIds = ids || [];
        this.stepFormulaireDone = this.lotsFormulaireRemplisIds.length > 0;

        if (this.lotsFormulaireRemplisIds.length > 0 && !this.selectedReferenceLotId) {
          this.selectedReferenceLotId = this.lotsFormulaireRemplisIds[0];
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('ERROR LOAD LOTS REMPLIS', error);
        this.cdr.detectChanges();
      }
    });
}
  isStepDone(stepNumber: number): boolean {
    if (stepNumber === 1) return this.stepSocieteDone;
    if (stepNumber === 2) return this.stepFormulaireDone;
    if (stepNumber === 3) return this.stepReferencesDone;
    return false;
  }

  isStepCurrent(stepNumber: number): boolean {
    return this.currentStep === stepNumber;
  }

  isStepPending(stepNumber: number): boolean {
    return !this.isStepDone(stepNumber) && this.currentStep !== stepNumber;
  }

  // =====================================================
  // STEP 1 : DONNEES GENERALES
  // =====================================================

  private fillSocieteForm(data: CandidatureResponse): void {
    this.societeForm.patchValue({
      raisonSociale: data.raisonSociale ?? '',
      formeJuridique: data.formeJuridique ?? '',
      rneMatriculeFiscal: data.rneMatriculeFiscal ?? '',
      dateCreationBureau: data.dateCreationBureau ?? null,
      adresseSiege: data.adresseSiege ?? '',
      telephone: data.telephone ?? '',
      emailPrincipal: data.emailPrincipal ?? '',
      siteInternet: data.siteInternet ?? '',
      ville: data.ville ?? '',
      representantLegal: data.representantLegal ?? '',
      fonctionRepresentant: data.fonctionRepresentant ?? '',
      specialites: data.specialites ?? '',
      agrementsCertifications: data.agrementsCertifications ?? '',
      banquePrincipale: data.banquePrincipale ?? '',
      localisation: data.localisation ?? ''
    });
  }

  saveInformationsSociete(moveNext = false): void {
    if (!this.utilisateurId) {
      this.pageError = 'Utilisateur connecté introuvable.';
      return;
    }
if (this.isCandidatureSoumise()) {
  this.pageError = 'Cette candidature est déjà soumise. Elle est en lecture seule.';
  return;
}
    this.savingSociete = true;
    this.pageError = '';
    this.successMessage = '';

    const request: CandidatureInfoRequest = {
      raisonSociale: this.societeForm.value.raisonSociale ?? '',
      formeJuridique: this.societeForm.value.formeJuridique ?? '',
      rneMatriculeFiscal: this.societeForm.value.rneMatriculeFiscal ?? '',
      dateCreationBureau: this.societeForm.value.dateCreationBureau ?? null,
      adresseSiege: this.societeForm.value.adresseSiege ?? '',
      telephone: this.societeForm.value.telephone ?? '',
      emailPrincipal: this.societeForm.value.emailPrincipal ?? '',
      siteInternet: this.societeForm.value.siteInternet ?? '',
      ville: this.societeForm.value.ville ?? '',
      representantLegal: this.societeForm.value.representantLegal ?? '',
      fonctionRepresentant: this.societeForm.value.fonctionRepresentant ?? '',
      specialites: this.societeForm.value.specialites ?? '',
      agrementsCertifications: this.societeForm.value.agrementsCertifications ?? '',
      banquePrincipale: this.societeForm.value.banquePrincipale ?? '',
      localisation: this.societeForm.value.localisation ?? ''
    };

    this.candidatureService.updateInformationsSociete(
      this.utilisateurId,
      request
    ).subscribe({
      next: (data: CandidatureResponse) => {
  this.candidature = this.mergeCandidatureDocuments(this.candidature, data);
  this.fillSocieteForm(this.candidature);
  this.savingSociete = false;

  this.uploadPiecesSociete(false, moveNext);
},
      error: (error) => {
        console.error('ERROR SAVE SOCIETE', error);
        this.savingSociete = false;
        this.pageError = 'Erreur lors de la sauvegarde des informations société.';
        this.successMessage = '';
        this.cdr.detectChanges();
      }
    });
  }

  onGeneralDocumentSelected(event: Event, document: DocumentGeneralCandidature): void {
    const input = event.target as HTMLInputElement;
if (this.isCandidatureSoumise()) {
  this.pageError = 'Cette candidature est déjà soumise. Vous ne pouvez plus modifier les pièces.';
  return;
}
    if (!input.files || input.files.length === 0) {
      this.selectedGeneralFilesByDocumentId[document.id] = null;
      return;
    }

    this.selectedGeneralFilesByDocumentId[document.id] = input.files[0];
  }

 getGeneralDocumentFileName(documentId: number): string {
  const selectedFile = this.selectedGeneralFilesByDocumentId[documentId];

  if (selectedFile) {
    return selectedFile.name;
  }

  if (documentId === 1) {
    return this.candidature?.rneNomFichier || '';
  }

  if (documentId === 2) {
    return this.candidature?.cnssNomFichier || '';
  }

  return '';
}

// getGeneralDocumentStatus(documentId: number): string {
//   if (this.selectedGeneralFilesByDocumentId[documentId]) {
//     return 'Sélectionné';
//   }

//   if (documentId === 1) {
//     return this.candidature?.rneStatut || 'NON_DEPOSE';
//   }

//   if (documentId === 2) {
//     return this.candidature?.cnssStatut || 'NON_DEPOSE';
//   }

//   return 'NON_DEPOSE';
// }

  getGeneralDocumentStatus(documentId: number): string {
    if (this.selectedGeneralFilesByDocumentId[documentId]) {
      return 'Sélectionné';
    }

    if (documentId === 1) {
      return (this.candidature as any)?.rneStatut ?? 'NON_DEPOSE';
    }

    if (documentId === 2) {
      return (this.candidature as any)?.cnssStatut ?? 'NON_DEPOSE';
    }

    return 'NON_DEPOSE';
  }
private mergeCandidatureDocuments(
  oldData: CandidatureResponse | null,
  newData: CandidatureResponse
): CandidatureResponse {
  if (!oldData) {
    return newData;
  }

  return {
    ...oldData,
    ...newData,

    rneNomFichier: newData.rneNomFichier || oldData.rneNomFichier || '',
    rneCheminFichier: newData.rneCheminFichier || oldData.rneCheminFichier || '',
    rneTypeContenu: newData.rneTypeContenu || oldData.rneTypeContenu || '',
    rneTailleFichier: newData.rneTailleFichier || oldData.rneTailleFichier || null,
    rneStatut: newData.rneStatut || oldData.rneStatut || 'NON_DEPOSE',

    cnssNomFichier: newData.cnssNomFichier || oldData.cnssNomFichier || '',
    cnssCheminFichier: newData.cnssCheminFichier || oldData.cnssCheminFichier || '',
    cnssTypeContenu: newData.cnssTypeContenu || oldData.cnssTypeContenu || '',
    cnssTailleFichier: newData.cnssTailleFichier || oldData.cnssTailleFichier || null,
    cnssStatut: newData.cnssStatut || oldData.cnssStatut || 'NON_DEPOSE'
  };
}
  getRneFile(): File | null {
    return this.selectedGeneralFilesByDocumentId[1] ?? null;
  }

  getCnssFile(): File | null {
    return this.selectedGeneralFilesByDocumentId[2] ?? null;
  }

uploadPiecesSociete(showNoFileMessage = true, moveNext = false): void {
  if (!this.candidature?.id) {
    this.pageError = 'Candidature introuvable.';
    return;
  }

  const rneFile = this.getRneFile();
  const cnssFile = this.getCnssFile();

  if (!rneFile && !cnssFile) {
    this.stepSocieteDone = true;
    this.successMessage = showNoFileMessage
      ? 'Aucune nouvelle pièce société à envoyer.'
      : 'Informations société sauvegardées avec succès.';

    if (moveNext) {
      this.goToStep(2);
    }

    this.cdr.detectChanges();
    return;
  }

  this.uploadingPiecesSociete = true;
  this.pageError = '';
  this.successMessage = '';

  this.candidatureService.uploadPiecesSociete(
    this.candidature.id,
    rneFile,
    cnssFile
  ).subscribe({
    next: () => {
      this.selectedGeneralFilesByDocumentId[1] = null;
      this.selectedGeneralFilesByDocumentId[2] = null;

      this.reloadCurrentCandidatureAfterPiecesUpload(moveNext);
    },
    error: (error) => {
      console.error('ERROR UPLOAD RNE CNSS', error);

      this.uploadingPiecesSociete = false;
      this.pageError =
        error?.error?.message ||
        error?.error?.detail ||
        'Erreur lors de l’envoi des pièces RNE/CNSS.';
      this.successMessage = '';

      this.cdr.detectChanges();
    }
  });
}
private reloadCurrentCandidatureAfterPiecesUpload(moveNext: boolean): void {
  if (!this.utilisateurId) {
    this.uploadingPiecesSociete = false;
    this.pageError = 'Utilisateur connecté introuvable.';
    this.cdr.detectChanges();
    return;
  }

  this.candidatureService.getCurrent(this.utilisateurId).subscribe({
    next: (freshData: CandidatureResponse) => {
      this.candidature = freshData;
      this.fillSocieteForm(freshData);

      this.uploadingPiecesSociete = false;
      this.stepSocieteDone = true;
      this.successMessage = 'Informations société et pièces sauvegardées avec succès.';
      this.pageError = '';

      if (moveNext) {
        this.goToStep(2);
      }

      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('ERROR RELOAD CANDIDATURE AFTER UPLOAD', error);

      this.uploadingPiecesSociete = false;
      this.stepSocieteDone = true;
      this.pageError = 'Pièces envoyées, mais erreur lors du rechargement de la candidature.';
      this.successMessage = '';

      this.cdr.detectChanges();
    }
  });
}
  // =====================================================
  // STEP 2 : FORMULAIRE PAR LOT
  // =====================================================

  selectLot(lotId: number): void {
  if (!this.canOpenLot(lotId)) {
    this.pageError = 'Cette candidature est soumise. Vous pouvez modifier uniquement le lot demandé par El Emar.';
    return;
  }

  this.selectedLotId = lotId;
  this.selectedLotName = this.getLotNameById(lotId);
  this.loadFormulaireLot(lotId);
}

  getLotNameById(lotId: number | null): string {
    if (!lotId) return '';
    return this.lots.find(l => l.id === lotId)?.nomLot || 'Lot';
  }

  /**
   * Charge le formulaire d'un lot.
   * IMPORTANT : on force `cdr.detectChanges()` après chaque mutation d'état
   * asynchrone (début de chargement, fin de chargement, données reçues),
   * car certains appels HTTP/services peuvent s'exécuter en dehors de la
   * zone Angular et empêcher le rafraîchissement automatique de la vue
   * (c'est ce qui causait l'écran bloqué sur "Chargement du formulaire...").
   */
  loadFormulaireLot(lotId: number): void {
    if (!lotId) {
      this.formulaireLot = null;
      this.groupedSections = [];
      this.loadingChamps = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadingChamps = true;
    this.pageError = '';
    this.formulaireLot = null;
    this.groupedSections = [];
    this.cdr.detectChanges(); // affiche immédiatement "Chargement du formulaire du lot..."

    console.log('LOAD FORMULAIRE LOT ID = ', lotId);

    this.formulaireEvaluationService.getFormulaireByLot(lotId)
      .pipe(
        timeout({ each: 10000 }),
        finalize(() => {
          this.zone.run(() => {
            this.loadingChamps = false;
            this.cdr.detectChanges(); // garantit la sortie de l'état "loading" dans tous les cas
          });
        })
      )
      .subscribe({
        next: (formulaire: any) => {
          this.zone.run(() => {
            const safeFormulaire = formulaire as FormulaireLotCandidat;

            console.log('FORMULAIRE LOT RESPONSE = ', safeFormulaire);

            this.formulaireLot = {
              lotId: safeFormulaire?.lotId ?? lotId,
              nomLot: safeFormulaire?.nomLot ?? this.getLotNameById(lotId),
              sections: safeFormulaire?.sections ?? []
            };

            for (const section of this.formulaireLot.sections ?? []) {
              for (const critere of section.criteres ?? []) {
                if (this.critereValues[critere.id] === undefined) {
                  this.critereValues[critere.id] =
                    this.getDefaultValueByType(critere.typeChamp);
                }
              }
            }

this.groupedSections = this.buildGroupedSections(this.formulaireLot);

console.log('GROUPED SECTIONS = ', this.groupedSections);

this.cdr.detectChanges();

if (this.notificationTargetCritereEvaluationId) {
  this.tryScrollToNotificationTarget(40);
}

this.loadSavedFormulaireForLot(lotId);
          });
        },
        error: (error) => {
          this.zone.run(() => {
            console.error('ERROR FORMULAIRE LOT', error);
            this.pageError = 'Erreur lors du chargement du formulaire du lot.';
            this.formulaireLot = null;
            this.groupedSections = [];
            this.cdr.detectChanges();
          });
        }
      });
  }
getCriterePieceGroupKey(critere: CritereFormulaire): string {
  return `critere-${critere.id}`;
}
buildGroupedSections(formulaireLot: FormulaireLotCandidat | null): SectionTableView[] {
  const result: SectionTableView[] = [];

  for (const section of formulaireLot?.sections ?? []) {
    const view: SectionTableView = {
      section: section.section,
      noPieceCriteres: [],
      pieceGroups: []
    };

    const criteres = [...(section.criteres ?? [])].sort((a, b) => {
      return (a.ordreAffichage ?? 0) - (b.ordreAffichage ?? 0);
    });

    for (const critere of criteres) {
      const pieces = [...(critere.pieces ?? [])]
        .filter(piece => piece && (piece.nomPiece || piece.codePiece))
        .sort((a, b) => {
          return (a.ordreAffichage ?? 0) - (b.ordreAffichage ?? 0);
        });

      if (pieces.length === 0) {
        view.noPieceCriteres.push(critere);
        continue;
      }

      // IMPORTANT :
      // Ici on groupe par critere.id, pas par nomPiece.
      // Donc chaque critère reste une seule ligne.
      // Ses pièces s’affichent dans la même cellule.
      view.pieceGroups.push({
        pieceKey: this.getCriterePieceGroupKey(critere),
        pieces: pieces,
        obligatoire: pieces.some(piece => piece.obligatoire === true),
        criteres: [critere]
      });
    }

    result.push(view);
  }

  console.log('GROUPED BY CRITERE ID = ', result);

  return result;
}

  getPiecesGroupKey(pieces: PieceCritere[]): string {
    return pieces
      .map(piece => piece.nomPiece || piece.codePiece || `PIECE-${piece.id}`)
      .join('__')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  getCritereLabel(critere: CritereFormulaire): string {
    return (
      critere.labelCandidat ||
      critere.libelleCritere ||
      critere.codeCritere ||
      'Champ'
    );
  }

  getSectionTotalRows(section: SectionTableView): number {
    const noPieceRows = section.noPieceCriteres?.length || 0;

    const pieceRows = (section.pieceGroups || [])
      .reduce((sum, group) => sum + (group.criteres?.length || 0), 0);

    return noPieceRows + pieceRows;
  }

  getGroupRowspan(group: PieceGroupTableView): number {
    return group.criteres?.length || 1;
  }

  getTypeLabel(typeChamp: string): string {
    const type = (typeChamp || '').toUpperCase();

    switch (type) {
      case 'TEXT':
        return 'Texte';
      case 'TEXTAREA':
        return 'Texte long';
      case 'NUMBER':
        return 'Nombre';
      case 'DATE':
        return 'Date';
      case 'BOOLEAN':
        return 'Oui / Non';
      case 'SELECT':
        return 'Liste';
      default:
        return typeChamp || 'Texte';
    }
  }

  getTypeUpper(typeChamp: string): string {
    return (typeChamp || '').toUpperCase();
  }

  getSelectOptions(critere: CritereFormulaire): string[] {
    return (critere.optionsChamp || '')
      .split(/[,;\n]/)
      .map(v => v.trim())
      .filter(v => !!v);
  }

  getDefaultValueByType(typeChamp: string): any {
    switch ((typeChamp || '').toUpperCase()) {
      case 'BOOLEAN':
        return null;
      case 'NUMBER':
        return null;
      case 'SELECT':
        return '';
      case 'DATE':
        return '';
      case 'TEXTAREA':
        return '';
      case 'TEXT':
      default:
        return '';
    }
  }
getPieceGroupKey(piece: PieceCritere): string {
  const name = piece.nomPiece || piece.codePiece || `PIECE-${piece.id}`;
  const condition = piece.conditionReponse || '';

  return `${name}__${condition}`
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
  isBooleanCritere(critere: CritereFormulaire): boolean {
    return this.getTypeUpper(critere.typeChamp) === 'BOOLEAN';
  }

isPieceVisibleForCritereAndPiece(
  critere: CritereFormulaire,
  piece: PieceCritere
): boolean {
  const value = this.critereValues[critere.id];

  if (piece.conditionReponse) {
    const condition = piece.conditionReponse.toLowerCase().trim();

    if (condition === 'oui') {
      return value === true || value === 'Oui' || value === 'oui';
    }

    if (condition === 'non') {
      return value === false || value === 'Non' || value === 'non';
    }

    return true;
  }

  if (this.isBooleanCritere(critere)) {
    return value === true || value === 'Oui' || value === 'oui';
  }

  return true;
}

isPieceGroupVisible(group: PieceGroupTableView): boolean {
  const critere = group.criteres[0];

  if (!critere) return false;

  return group.pieces.some(piece =>
    this.isPieceVisibleForCritereAndPiece(critere, piece)
  );
}

// isPieceGroupVisible(group: PieceGroupTableView): boolean {
//   const piece = group.pieces[0];

//   if (!piece) {
//     return false;
//   }

//   return group.criteres.some(critere =>
//     this.isPieceVisibleForCritereAndPiece(critere, piece)
//   );
// }

onCritereValueChange(): void {
  this.successMessage = '';
  this.pageError = '';
}


collectCurrentLotUploadCalls(candidatureId: number, lotId: number): any[] {
  const calls: any[] = [];

  for (const section of this.groupedSections) {
    for (const group of section.pieceGroups) {
      for (const piece of group.pieces) {
        if (!piece.id) continue;

        const key = this.getPieceFileKey(group, piece);
        const file = this.selectedFilesByPieceKey[key];

        if (file) {
          calls.push(
            this.formulaireSauvegardeService.uploadPiece(
              candidatureId,
              lotId,
              piece.id,
              file
            )
          );

          this.uploadedPieceFileNames[key] = file.name;
        }
      }
    }
  }

  return calls;
}
afterSaveCurrentLot(moveNext: boolean): void {
  const wasCorrectionMode =
    this.isCandidatureSoumise() && this.isCorrectionFromNotification();

  if (this.selectedLotId && !this.lotsFormulaireRemplisIds.includes(this.selectedLotId)) {
    this.lotsFormulaireRemplisIds.push(this.selectedLotId);
  }

  this.stepFormulaireDone = this.lotsFormulaireRemplisIds.length > 0;
  this.savingLot = false;
  this.loadingChamps = false;
  this.pageError = '';

  console.log('LOTS REMPLIS IDS', this.lotsFormulaireRemplisIds);

  if (wasCorrectionMode) {
    this.resetCorrectionModeAfterSave();
    return;
  }

  this.successMessage = 'Formulaire du lot sauvegardé avec succès.';

  if (moveNext) {
    this.prepareReferencesStep();
    this.goToStep(3);
  }

  this.cdr.detectChanges();
}
finishFormulaireStep(): void {
  this.saveCurrentLotFormulaire(true);
}

onPieceFileSelected(
  event: Event,
  group: PieceGroupTableView,
  piece: PieceCritere
): void {
 if (!this.canEditPieceGroup(group)) {
  this.pageError = 'Cette candidature est soumise. Vous pouvez modifier uniquement la pièce demandée par El Emar.';
  return;
}
  const input = event.target as HTMLInputElement;
  const key = this.getPieceFileKey(group, piece);

  if (!input.files || input.files.length === 0) {
    this.selectedFilesByPieceKey[key] = null;
    return;
  }

  this.selectedFilesByPieceKey[key] = input.files[0];

  this.successMessage = '';
  this.pageError = '';
}
loadSavedFormulaireForLot(lotId: number): void {
  if (!this.candidature?.id) return;

  this.formulaireSauvegardeService
    .getSavedFormulaire(this.candidature.id, lotId)
    .subscribe({
      next: (saved) => {
        this.zone.run(() => {
          for (const reponse of saved.reponses || []) {
            const critere = this.findCritereById(reponse.critereId);

            if (!critere) continue;

            this.critereValues[reponse.critereId] =
              this.parseSavedCritereValue(critere, reponse.valeur);
          }

          for (const pieceSaved of saved.pieces || []) {
            const found = this.findGroupAndPieceByPieceId(pieceSaved.criterePieceId);

            if (!found) continue;

            const key = this.getPieceFileKey(found.group, found.piece);
            this.uploadedPieceFileNames[key] = pieceSaved.nomFichier;
          }

          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('ERROR LOAD SAVED FORMULAIRE', error);
        this.cdr.detectChanges();
      }
    });
}

findCritereById(critereId: number): CritereFormulaire | null {
  for (const section of this.formulaireLot?.sections || []) {
    for (const critere of section.criteres || []) {
      if (critere.id === critereId) {
        return critere;
      }
    }
  }

  return null;
}

parseSavedCritereValue(critere: CritereFormulaire, value: string): any {
  const type = this.getTypeUpper(critere.typeChamp);

  if (type === 'BOOLEAN') {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  }

  if (type === 'NUMBER') {
    return value === '' ? null : Number(value);
  }

  return value;
}

findGroupAndPieceByPieceId(
  pieceId: number
): { group: PieceGroupTableView; piece: PieceCritere } | null {
  for (const section of this.groupedSections) {
    for (const group of section.pieceGroups) {
      for (const piece of group.pieces) {
        if (piece.id === pieceId) {
          return { group, piece };
        }
      }
    }
  }

  return null;
}
getPieceFileName(group: PieceGroupTableView, piece: PieceCritere): string {
  const key = this.getPieceFileKey(group, piece);

  return (
    this.selectedFilesByPieceKey[key]?.name ||
    this.uploadedPieceFileNames[key] ||
    ''
  );
}

getPieceFileKey(group: PieceGroupTableView, piece: PieceCritere): string {
  return `${group.pieceKey}-piece-${piece.id ?? piece.codePiece ?? piece.nomPiece}`;
}
  // getPieceFileName(group: PieceGroupTableView, piece: PieceCritere): string {
  //   const key = this.getPieceFileKey(group, piece);
  //   return this.selectedFilesByPieceKey[key]?.name || '';
  // }

  // getPieceFileKey(group: PieceGroupTableView, piece: PieceCritere): string {
  //   return `${group.pieceKey}_${piece.id ?? piece.nomPiece}`;
  // }

  
// =====================================================
// STEP 3 : REFERENCES
// =====================================================

initReferenceListForLot(lotId: number): void {
  if (!this.referencesByLotId[lotId]) {
    this.referencesByLotId[lotId] = [];
  }
}

getReferenceProjectsByLotId(lotId: number | null): ReferenceProjetForm[] {
  if (!lotId) return [];
  this.initReferenceListForLot(lotId);
  return this.referencesByLotId[lotId];
}
addReferenceProject(lotId: number | null): void {
  if (!lotId) return;
if (this.isCandidatureSoumise()) {
  this.pageError = 'Cette candidature est déjà soumise. Vous ne pouvez plus ajouter de projet.';
  return;
}
  this.initReferenceListForLot(lotId);

  const projet: ReferenceProjetForm = {
    id: null,
    localKey: this.createReferenceLocalKey(lotId),
    lotId,

    nomProjet: '',
    maitreOuvrage: '',

    ville: '',
    zone: '',
    adresseProjet: '',
    latitude: null,
    longitude: null,

    typeProjet: '',

    surfaceM2: null,
    niveauxRPlus: null,
    nombreSousSols: null,
    anneeLivraison: null,

    bimOuiNon: null,
    seuilOk: null,

    missionRealisee: '',
    montant: null,

    fichierP11: null,
    fichierP12: null,

    uploadedFichierP11Name: '',
    uploadedFichierP12Name: ''
  };

  this.referencesByLotId[lotId].push(projet);
  this.stepReferencesDone = false;

  // Force Angular à créer le div dans le DOM
  this.cdr.detectChanges();

  // Puis initialise la carte quand le div existe vraiment
  this.initReferenceMapWithRetry(projet);
}

removeReferenceProject(lotId: number | null, index: number): void {
  if (!lotId) return;
if (this.isCandidatureSoumise()) {
  this.pageError = 'Cette candidature est déjà soumise. Vous ne pouvez plus supprimer de projet.';
  return;
}
  this.referencesByLotId[lotId]?.splice(index, 1);
  this.stepReferencesDone = false;
}
isCorrectionFromNotification(): boolean {
  return !!(
    this.notificationTargetCritereEvaluationId ||
    this.notificationTargetReponseCritereId ||
    this.notificationTargetLotId ||
    this.notificationTargetApplicationCandidatureId
  );
}

canEditCritere(critere: any): boolean {
  if (!this.isCandidatureSoumise()) {
    return true;
  }

  if (!this.isCorrectionFromNotification()) {
    return false;
  }

  return this.isCritereHighlighted(critere);
}

canEditPieceGroup(group: PieceGroupTableView): boolean {
  if (!this.isCandidatureSoumise()) {
    return true;
  }

  if (!this.isCorrectionFromNotification()) {
    return false;
  }

  return this.isPieceGroupHighlighted(group);
}

canSaveCurrentLot(): boolean {
  if (!this.isCandidatureSoumise()) {
    return true;
  }

  if (!this.isCorrectionFromNotification()) {
    return false;
  }

  if (this.notificationTargetLotId && this.selectedLotId) {
    return Number(this.notificationTargetLotId) === Number(this.selectedLotId);
  }

  return !!this.notificationTargetCritereEvaluationId;
}

canOpenLot(lotId: number): boolean {
  if (!this.isCandidatureSoumise()) {
    return true;
  }

  if (!this.notificationTargetLotId) {
    return true;
  }

  return Number(lotId) === Number(this.notificationTargetLotId);
}
onReferenceFileSelected(
  event: Event,
  projet: ReferenceProjetForm,
  type: 'P11' | 'P12'
): void {
  if (this.isCandidatureSoumise()) {
  this.pageError = 'Cette candidature est déjà soumise. Vous ne pouvez plus modifier les fichiers.';
  return;
}
  const input = event.target as HTMLInputElement;

  if (!input.files || input.files.length === 0) {
    if (type === 'P11') projet.fichierP11 = null;
    if (type === 'P12') projet.fichierP12 = null;
    return;
  }

  if (type === 'P11') {
    projet.fichierP11 = input.files[0];
  }

  if (type === 'P12') {
    projet.fichierP12 = input.files[0];
  }

  this.stepReferencesDone = false;
}

getReferenceFileName(
  projet: ReferenceProjetForm,
  type: 'P11' | 'P12'
): string {
  if (type === 'P11') {
    return projet.fichierP11?.name || projet.uploadedFichierP11Name || '';
  }

  return projet.fichierP12?.name || projet.uploadedFichierP12Name || '';
}

loadReferencesForLot(lotId: number): void {
  if (!this.candidature?.id) return;

  this.referenceCandidatService
    .getReferences(this.candidature.id, lotId)
    .subscribe({
      next: (references) => {
        this.referencesByLotId[lotId] = (references || []).map(ref => ({
          id: ref.id,
          localKey: this.createReferenceLocalKey(lotId),
          lotId,

          nomProjet: ref.nomProjet || '',
          maitreOuvrage: ref.maitreOuvrage || '',

          ville: ref.ville || '',
          zone: ref.zone || '',
          adresseProjet: ref.adresseProjet || '',
          latitude: ref.latitude ?? null,
          longitude: ref.longitude ?? null,

          typeProjet: ref.typeProjet || '',

          surfaceM2: ref.surfaceM2 ?? null,
          niveauxRPlus: ref.niveauxRPlus ?? null,
          nombreSousSols: ref.nombreSousSols ?? null,
          anneeLivraison: ref.anneeLivraison ?? null,

          bimOuiNon: ref.bimOuiNon ?? null,
          seuilOk: ref.seuilOk ?? null,

          missionRealisee: ref.missionRealisee || '',
          montant: ref.montant ?? null,

          fichierP11: null,
          fichierP12: null,

          uploadedFichierP11Name: this.extractFileName(ref.fichierP11 || ''),
          uploadedFichierP12Name: this.extractFileName(ref.fichierP12 || '')
        }));

        this.cdr.detectChanges();

        setTimeout(() => {
          this.initMapsForCurrentReferenceLot();
        }, 300);
      },
      error: (error) => {
        console.error('ERROR LOAD REFERENCES', error);
        this.cdr.detectChanges();
      }
    });
}

saveSelectedReferenceLot(moveNext: boolean = false): void {
  if (!this.candidature?.id || !this.selectedReferenceLotId) {
    this.pageError = 'Impossible de sauvegarder les références.';
    return;

  }
if (this.isCandidatureSoumise()) {
  this.pageError = 'Cette candidature est déjà soumise. Le formulaire est en lecture seule.';
  return;
}
  const candidatureId = this.candidature.id;
  const lotId = this.selectedReferenceLotId;
  const projets = this.getReferenceProjectsByLotId(lotId);

 const request = projets.map(projet => ({
  id: projet.id ?? null,

  nomProjet: projet.nomProjet,
  maitreOuvrage: projet.maitreOuvrage,

  ville: projet.ville,
  zone: projet.zone,
  adresseProjet: projet.adresseProjet,
  latitude: projet.latitude,
  longitude: projet.longitude,

  typeProjet: projet.typeProjet,

  surfaceM2: projet.surfaceM2,
  niveauxRPlus: projet.niveauxRPlus,
  nombreSousSols: projet.nombreSousSols,
  anneeLivraison: projet.anneeLivraison,

  bimOuiNon: projet.bimOuiNon,
  seuilOk: projet.seuilOk,

  missionRealisee: projet.missionRealisee,
  montant: projet.montant
}));

  this.savingReferences = true;
  this.pageError = '';
  this.successMessage = '';

  this.referenceCandidatService
    .saveReferences(candidatureId, lotId, request)
    .subscribe({
      next: (savedReferences) => {
        this.updateLocalReferencesAfterSave(lotId, savedReferences);

        const uploadCalls = this.collectReferenceUploadCalls(
          candidatureId,
          lotId,
          this.referencesByLotId[lotId]
        );

        if (uploadCalls.length === 0) {
          this.afterSaveReferences(moveNext);
          return;
        }

        forkJoin(uploadCalls).subscribe({
          next: () => {
            this.afterSaveReferences(moveNext);
          },
          error: (error) => {
            console.error('ERROR UPLOAD REFERENCES FILES', error);
            this.savingReferences = false;
            this.pageError = 'Références sauvegardées, mais erreur lors de l’envoi des fichiers.';
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('ERROR SAVE REFERENCES', error);
        this.savingReferences = false;
        this.pageError = 'Erreur lors de la sauvegarde des références.';
        this.cdr.detectChanges();
      }
    });
}

updateLocalReferencesAfterSave(
  lotId: number,
  savedReferences: ProjetReferenceResponse[]
): void {
  const localProjects = this.referencesByLotId[lotId] || [];

  savedReferences.forEach((saved, index) => {
    if (localProjects[index]) {
      localProjects[index].id = saved.id;
      localProjects[index].uploadedFichierP11Name =
        this.extractFileName(saved.fichierP11 || '');
      localProjects[index].uploadedFichierP12Name =
        this.extractFileName(saved.fichierP12 || '');
    }
  });
}
canModifyGeneralDocuments(): boolean {
  return !this.isCandidatureSoumise();
}

getGeneralDocumentInputId(document: DocumentGeneralCandidature): string {
  return `general-document-input-${document.id}`;
}

getPieceInputId(group: PieceGroupTableView, piece: PieceCritere): string {
  return `piece-input-${this.selectedLotId || 0}-${piece.id || 0}`;
}

private clearNativeFileInput(inputId: string): void {
  const input = document.getElementById(inputId) as HTMLInputElement | null;

  if (input) {
    input.value = '';
  }
}

removeGeneralDocument(
  event: MouseEvent,
  documentGeneral: DocumentGeneralCandidature
): void {
  event.preventDefault();
  event.stopPropagation();

  if (this.isCandidatureSoumise()) {
    this.pageError = 'Cette candidature est soumise. Vous ne pouvez plus supprimer les fichiers.';
    return;
  }

  if (!this.candidature?.id) {
    this.pageError = 'Candidature introuvable.';
    return;
  }

  const candidatureId = this.candidature.id;

  // Cas 1 : fichier sélectionné mais pas encore sauvegardé
  if (this.selectedGeneralFilesByDocumentId[documentGeneral.id]) {
    this.selectedGeneralFilesByDocumentId[documentGeneral.id] = null;
    this.clearNativeFileInput(this.getGeneralDocumentInputId(documentGeneral));
    this.successMessage = 'Fichier retiré de la sélection.';
    this.pageError = '';
    this.cdr.detectChanges();
    return;
  }

  // Cas 2 : fichier déjà enregistré en base
  const hasSavedFile = this.getGeneralDocumentFileName(documentGeneral.id);

  if (!hasSavedFile) {
    return;
  }

  const deleteCall =
    documentGeneral.codeDocument === 'RNE'
      ? this.candidatureService.deleteRne(candidatureId)
      : this.candidatureService.deleteCnss(candidatureId);

  deleteCall.subscribe({
    next: (data: CandidatureResponse) => {
      this.candidature = data;
      this.fillSocieteForm(data);

      this.selectedGeneralFilesByDocumentId[documentGeneral.id] = null;
      this.clearNativeFileInput(this.getGeneralDocumentInputId(documentGeneral));

      this.successMessage = `Fichier ${documentGeneral.codeDocument} supprimé avec succès.`;
      this.pageError = '';
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('ERROR DELETE GENERAL DOCUMENT', error);
      this.pageError =
        error?.error?.message ||
        error?.error?.detail ||
        'Erreur lors de la suppression du fichier.';
      this.successMessage = '';
      this.cdr.detectChanges();
    }
  });
}

canDeletePieceFile(group: PieceGroupTableView): boolean {
  return this.canEditPieceGroup(group);
}

removePieceFile(
  event: MouseEvent,
  group: PieceGroupTableView,
  piece: PieceCritere
): void {
  event.preventDefault();
  event.stopPropagation();

  if (!this.canDeletePieceFile(group)) {
    this.pageError = 'Cette candidature est soumise. Vous ne pouvez pas supprimer cette pièce.';
    return;
  }

  if (!this.candidature?.id || !this.selectedLotId || !piece.id) {
    this.pageError = 'Impossible de supprimer cette pièce.';
    return;
  }

  const candidatureId = this.candidature.id;
  const lotId = this.selectedLotId;
  const key = this.getPieceFileKey(group, piece);

  // Cas 1 : fichier sélectionné mais pas encore sauvegardé
  if (this.selectedFilesByPieceKey[key]) {
    this.selectedFilesByPieceKey[key] = null;
    this.clearNativeFileInput(this.getPieceInputId(group, piece));

    this.successMessage = 'Fichier retiré de la sélection.';
    this.pageError = '';
    this.cdr.detectChanges();
    return;
  }

  // Cas 2 : fichier déjà sauvegardé
  if (!this.uploadedPieceFileNames[key]) {
    return;
  }

  this.formulaireSauvegardeService
    .deletePiece(candidatureId, lotId, piece.id)
    .subscribe({
      next: () => {
        this.selectedFilesByPieceKey[key] = null;
        delete this.uploadedPieceFileNames[key];

        this.clearNativeFileInput(this.getPieceInputId(group, piece));

        this.successMessage = 'Pièce supprimée avec succès.';
        this.pageError = '';
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('ERROR DELETE PIECE', error);
        this.pageError =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors de la suppression de la pièce.';
        this.successMessage = '';
        this.cdr.detectChanges();
      }
    });
}
collectReferenceUploadCalls(
  candidatureId: number,
  lotId: number,
  projets: ReferenceProjetForm[]
): any[] {
  const calls: any[] = [];

  for (const projet of projets) {
    if (!projet.id) continue;

    if (projet.fichierP11) {
      calls.push(
        this.referenceCandidatService.uploadReferenceFile(
          candidatureId,
          lotId,
          projet.id,
          'P11',
          projet.fichierP11
        )
      );

      projet.uploadedFichierP11Name = projet.fichierP11.name;
    }

    if (projet.fichierP12) {
      calls.push(
        this.referenceCandidatService.uploadReferenceFile(
          candidatureId,
          lotId,
          projet.id,
          'P12',
          projet.fichierP12
        )
      );

      projet.uploadedFichierP12Name = projet.fichierP12.name;
    }
  }

  return calls;
}

afterSaveReferences(moveNext: boolean): void {
  this.savingReferences = false;
  this.stepReferencesDone = true;
  this.successMessage = 'Références sauvegardées avec succès.';
  this.pageError = '';

  if (moveNext) {
    this.goToStep(4);
  }

  this.cdr.detectChanges();
}

extractFileName(path: string): string {
  if (!path) return '';

  const cleanPath = path.split('?')[0];

  return cleanPath
    .split(/[\\/]/)
    .pop()
    ?.trim() || '';
}

finishReferencesStep(): void {
  this.saveSelectedReferenceLot(true);
}


  // =====================================================
  // STEP 4 : SOUMISSION
  // =====================================================

submitCandidature(): void {
  if (!this.candidature?.id) {
    this.pageError = 'Candidature introuvable.';
    return;
  }

  this.submitting = true;
  this.pageError = '';
  this.successMessage = '';

  this.candidatureService.submit(this.candidature.id).subscribe({
    next: (data: CandidatureResponse) => {
      this.candidature = data;
      this.submitting = false;
      this.successMessage = 'Candidature soumise avec succès.';
      this.pageError = '';
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('ERROR SUBMIT', error);
      this.submitting = false;
      this.pageError = 'Erreur lors de la soumission de la candidature.';
      this.successMessage = '';
      this.cdr.detectChanges();
    }
  });
}
// =====================================================
  // NAVIGATION
  // =====================================================

  goToStep(step: number): void {
    if (step < 1 || step > this.maxStep) return;

    this.currentStep = step;

    if (step === 2 && this.selectedLotId) {
      this.loadFormulaireLot(this.selectedLotId);
    }

   if (step === 3) {
  this.prepareReferencesStep();
    setTimeout(() => {
    this.initMapsForCurrentReferenceLot();
  }, 800);
}

    this.cdr.detectChanges();
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.cdr.detectChanges();
    }
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      this.saveInformationsSociete(true);
      return;
    }

    if (this.currentStep === 2) {
      this.finishFormulaireStep();
      return;
    }

    if (this.currentStep === 3) {
      this.finishReferencesStep();
      return;
    }

    if (this.currentStep < this.maxStep) {
      this.currentStep++;
      this.cdr.detectChanges();
    }
  }
saveCurrentLotFormulaire(moveNext: boolean = false): void {
 if (!this.canSaveCurrentLot()) {
  this.pageError = 'Cette candidature est soumise. Vous pouvez sauvegarder uniquement la correction demandée par El Emar.';
  return;
}
  if (!this.candidature?.id || !this.selectedLotId || !this.formulaireLot) {
    this.pageError = 'Impossible de sauvegarder le formulaire du lot.';
    return;
  }

  const candidatureId = this.candidature.id;
  const lotId = this.selectedLotId;

  console.log('SAVE LOT START', {
    candidatureId,
    lotId,
    selectedLotName: this.selectedLotName
  });

  const allCriteres = this.formulaireLot.sections
    .flatMap(section => section.criteres || []);

  const reponses = allCriteres.map(critere => {
    const rawValue = this.critereValues[critere.id];

    return {
      critereId: critere.id,
      valeur: rawValue === null || rawValue === undefined ? '' : String(rawValue)
    };
  });

  this.savingLot = true;
  this.loadingChamps = true;
  this.pageError = '';
  this.successMessage = '';
  this.cdr.detectChanges();

  this.formulaireSauvegardeService
    .saveReponses(candidatureId, lotId, { reponses })
    .subscribe({
      next: (saved) => {
        console.log('SAVE LOT RESPONSE', saved);

        const uploadCalls = this.collectCurrentLotUploadCalls(candidatureId, lotId);

        if (uploadCalls.length === 0) {
          this.afterSaveCurrentLot(moveNext);
          return;
        }

        forkJoin(uploadCalls).subscribe({
          next: () => {
            console.log('UPLOAD PIECES LOT OK');
            this.afterSaveCurrentLot(moveNext);
          },
          error: (error) => {
            console.error('ERROR UPLOAD PIECES LOT', error);
            this.savingLot = false;
            this.loadingChamps = false;
            this.pageError = 'Réponses sauvegardées, mais erreur lors de l’envoi des pièces.';
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('ERROR SAVE FORMULAIRE LOT', error);
        this.savingLot = false;
        this.loadingChamps = false;
        this.pageError = 'Erreur lors de la sauvegarde du formulaire du lot.';
        this.cdr.detectChanges();
      }
    });
}
  // =====================================================
  // USER
  // =====================================================

  private getCurrentUserId(): number | null {
    const directUserId = localStorage.getItem('userId');

    if (directUserId && !isNaN(Number(directUserId))) {
      return Number(directUserId);
    }

    const possibleKeys = ['connectedUser', 'currentUser', 'user', 'authUser'];

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