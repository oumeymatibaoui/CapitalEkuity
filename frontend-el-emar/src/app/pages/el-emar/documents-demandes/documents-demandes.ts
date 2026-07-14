import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  DocumentDemande,
  DocumentDemandeRequest,
  DocumentDemandeService,
  LiaisonChampPieceRequest
} from '../../../core/services/document-demande.service';

import {
  ChampAppreciation,
  ChampAppreciationService
} from '../../../core/services/champ-appreciation.service';

type DeleteAction = 'DEACTIVATE' | 'DELETE';

@Component({
  selector: 'app-documents-demandes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './documents-demandes.html',
  styleUrl: './documents-demandes.scss'
})
export class DocumentsDemandes implements OnInit {

  documents: DocumentDemande[] = [];
  champsDisponibles: ChampAppreciation[] = [];

  loading = false;

  pageError = '';
  formError = '';
  formSubmitted = false;

  showModal = false;
  editMode = false;
  selectedDocumentId: number | null = null;

  showDeleteModal = false;
  documentToDelete: DocumentDemande | null = null;
  deleteAction: DeleteAction = 'DEACTIVATE';

  selectedChampToLinkId: number | null = null;
  linkDraft: LiaisonChampPieceRequest = this.getEmptyLinkDraft();

  phases: string[] = ['PH1', 'PH2'];

  lotsDisponibles: string[] = [
    'Architecture',
    'Structure',
    'Fluides',
    'Électricité',
    'OPC'
  ];

  form: DocumentDemandeRequest = this.getEmptyForm();

  constructor(
    private documentService: DocumentDemandeService,
    private champService: ChampAppreciationService
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
    this.loadChampsDisponibles();
  }

  loadDocuments(): void {
    this.loading = true;
    this.pageError = '';

    this.documentService.getAll().subscribe({
      next: (data) => {
        this.documents = data;
        this.loading = false;
      },
      error: () => {
        this.pageError = 'Erreur lors du chargement des documents demandés.';
        this.loading = false;
      }
    });
  }

  loadChampsDisponibles(): void {
    this.champService.getAll().subscribe({
      next: (data) => {
        this.champsDisponibles = data.filter(champ => champ.actif);
      },
      error: () => {
        this.pageError = 'Erreur lors du chargement des champs du formulaire.';
      }
    });
  }

  openAddModal(): void {
    this.editMode = false;
    this.selectedDocumentId = null;

    this.form = this.getEmptyForm();
    this.selectedChampToLinkId = null;
    this.linkDraft = this.getEmptyLinkDraft();

    this.formError = '';
    this.pageError = '';
    this.formSubmitted = false;

    this.showModal = true;
  }

  openEditModal(document: DocumentDemande): void {
    this.editMode = true;
    this.selectedDocumentId = document.id;

    this.formError = '';
    this.pageError = '';
    this.formSubmitted = false;

    this.selectedChampToLinkId = null;
    this.linkDraft = this.getEmptyLinkDraft();

    const lots = this.extractLots(document);

    this.form = {
      codeDocument: document.codeDocument,
      nomDocument: document.nomDocument,
      phase: document.phase,
      formatAccepte: document.formatAccepte,
      obligatoire: document.obligatoire,
      actif: document.actif,
      applicableTousLots: document.applicableTousLots,
      applicableA: document.applicableA,
      ordreAffichage: document.ordreAffichage,
      lotId: document.lotId ?? null,
      applicableLots: lots,
      champsLies: (document.champsLies ?? []).map((link, index) => ({
        champAppreciationId: link.champAppreciationId ?? null,
        documentDemandeId: document.id,
        obligatoire: link.obligatoire,
        conditionReponse: link.conditionReponse ?? '',
        messagePrestataire: link.messagePrestataire ?? '',
        ordreAffichage: link.ordreAffichage ?? index + 1,
        actif: link.actif
      }))
    };

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editMode = false;
    this.selectedDocumentId = null;

    this.form = this.getEmptyForm();
    this.selectedChampToLinkId = null;
    this.linkDraft = this.getEmptyLinkDraft();

    this.formError = '';
    this.formSubmitted = false;
  }

  saveDocument(): void {
    this.formSubmitted = true;
    this.formError = '';

    if (!this.validateForm()) {
      return;
    }

    const request = this.prepareRequest();

    if (this.editMode && this.selectedDocumentId) {
      this.documentService.update(this.selectedDocumentId, request).subscribe({
        next: () => {
          this.closeModal();
          this.loadDocuments();
        },
        error: (error) => {
          this.formError = this.extractErrorMessage(
            error,
            'Erreur lors de la modification du document.'
          );
        }
      });

      return;
    }

    this.documentService.create(request).subscribe({
      next: () => {
        this.closeModal();
        this.loadDocuments();
      },
      error: (error) => {
        this.formError = this.extractErrorMessage(
          error,
          'Erreur lors de l’ajout du document.'
        );
      }
    });
  }

  openDeactivateModal(document: DocumentDemande): void {
    this.documentToDelete = document;
    this.deleteAction = 'DEACTIVATE';
    this.showDeleteModal = true;
  }

  openDeleteModal(document: DocumentDemande): void {
    this.documentToDelete = document;
    this.deleteAction = 'DELETE';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.documentToDelete = null;
    this.showDeleteModal = false;
  }

  confirmDelete(): void {
    if (!this.documentToDelete) {
      return;
    }

    if (this.deleteAction === 'DEACTIVATE') {
      this.documentService.deactivate(this.documentToDelete.id).subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadDocuments();
        },
        error: () => {
          this.pageError = 'Erreur lors de la désactivation du document.';
          this.closeDeleteModal();
        }
      });

      return;
    }

    this.documentService.delete(this.documentToDelete.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadDocuments();
      },
      error: () => {
        this.pageError = 'Erreur lors de la suppression définitive du document.';
        this.closeDeleteModal();
      }
    });
  }

  activateDocument(document: DocumentDemande): void {
    if (document.actif) {
      return;
    }

    this.documentService.toggleActif(document.id).subscribe({
      next: () => {
        this.loadDocuments();
      },
      error: () => {
        this.pageError = 'Erreur lors de la réactivation du document.';
      }
    });
  }

  toggleStatus(document: DocumentDemande): void {
    this.documentService.toggleActif(document.id).subscribe({
      next: () => {
        this.loadDocuments();
      },
      error: () => {
        this.pageError = 'Erreur lors du changement de statut.';
      }
    });
  }

  toggleTousLots(): void {
    if (this.form.applicableTousLots) {
      this.form.applicableLots = [];
      this.form.applicableA = 'Tous les lots';
      this.form.lotId = null;
    } else {
      this.form.applicableA = '';
    }
  }

  toggleLot(lot: string): void {
    if (this.form.applicableTousLots) {
      return;
    }

    if (!this.form.applicableLots) {
      this.form.applicableLots = [];
    }

    const index = this.form.applicableLots.indexOf(lot);

    if (index >= 0) {
      this.form.applicableLots.splice(index, 1);
    } else {
      this.form.applicableLots.push(lot);
    }

    this.form.applicableA = this.form.applicableLots.join(',');
  }

  isLotSelected(lot: string): boolean {
    return this.form.applicableLots?.includes(lot) ?? false;
  }

  getLotsToDisplay(document: DocumentDemande): string[] {
    if (document.applicableTousLots) {
      return ['Tous les lots'];
    }

    return this.extractLots(document);
  }

getPhaseClass(phase?: string | null): string {
  const value = (phase ?? 'PH1').toUpperCase();

  switch (value) {
    case 'PH1':
      return 'phase-ph1';

    case 'PH2':
      return 'phase-ph2';

    default:
      return 'phase-default';
  }
}

  getDeleteTitle(): string {
    return this.deleteAction === 'DELETE'
      ? 'Supprimer définitivement le document'
      : 'Désactiver le document';
  }

  getDeleteMessage(): string {
    return this.deleteAction === 'DELETE'
      ? 'Cette action supprimera définitivement le document de la base de données.'
      : 'Le document sera conservé dans la base, mais marqué comme inactif.';
  }

  getConfirmButtonLabel(): string {
    return this.deleteAction === 'DELETE'
      ? 'Supprimer définitivement'
      : 'Désactiver';
  }

  getAvailableChampsForLink(): ChampAppreciation[] {
    if (this.form.applicableTousLots) {
      return this.champsDisponibles;
    }

    const lots = this.form.applicableLots ?? [];

    return this.champsDisponibles.filter(champ =>
      lots.includes(champ.lotNom)
    );
  }

  addChampLink(): void {
    this.formError = '';

    if (!this.selectedChampToLinkId) {
      this.formError = 'Veuillez sélectionner un champ à lier.';
      return;
    }

    if (!this.form.champsLies) {
      this.form.champsLies = [];
    }

    const exists = this.form.champsLies.some(
      link => link.champAppreciationId === this.selectedChampToLinkId
    );

    if (exists) {
      this.formError = 'Ce champ est déjà lié à cette pièce.';
      return;
    }

    this.form.champsLies.push({
      champAppreciationId: this.selectedChampToLinkId,
      documentDemandeId: null,
      obligatoire: this.linkDraft.obligatoire,
      conditionReponse: this.linkDraft.conditionReponse ?? '',
      messagePrestataire: this.linkDraft.messagePrestataire ?? '',
      ordreAffichage: this.form.champsLies.length + 1,
      actif: true
    });

    this.selectedChampToLinkId = null;
    this.linkDraft = this.getEmptyLinkDraft();
  }

  removeChampLink(index: number): void {
    if (!this.form.champsLies) {
      return;
    }

    this.form.champsLies.splice(index, 1);
  }

  getChampLabel(champId?: number | null): string {
    if (!champId) {
      return 'Champ inconnu';
    }

    const champ = this.champsDisponibles.find(item => item.id === champId);

    if (!champ) {
      return 'Champ inconnu';
    }

    return `${champ.codePxx} - ${champ.labelChamp}`;
  }

  private validateForm(): boolean {
    this.formError = '';

    if (!this.form.codeDocument || this.form.codeDocument.trim() === '') {
      this.formError = 'Le code document est obligatoire.';
      return false;
    }

    if (!this.form.nomDocument || this.form.nomDocument.trim() === '') {
      this.formError = 'Le nom du document est obligatoire.';
      return false;
    }

    if (!this.form.phase) {
      this.formError = 'La phase est obligatoire.';
      return false;
    }

    if (!this.form.formatAccepte || this.form.formatAccepte.trim() === '') {
      this.formError = 'Le format accepté est obligatoire.';
      return false;
    }

    if (
      !this.form.applicableTousLots
      && (!this.form.applicableLots || this.form.applicableLots.length === 0)
    ) {
      this.formError = 'Veuillez sélectionner au moins un lot ou choisir Tous les lots.';
      return false;
    }

    return true;
  }

  private prepareRequest(): DocumentDemandeRequest {
    const request: DocumentDemandeRequest = {
      ...this.form,
      codeDocument: this.form.codeDocument.trim(),
      nomDocument: this.form.nomDocument.trim(),
     formatAccepte: (this.form.formatAccepte ?? '').trim(),
      champsLies: (this.form.champsLies ?? []).map((link, index) => ({
        champAppreciationId: link.champAppreciationId,
        documentDemandeId: null,
        obligatoire: Boolean(link.obligatoire),
        conditionReponse: link.conditionReponse ?? '',
        messagePrestataire: link.messagePrestataire ?? '',
        ordreAffichage: link.ordreAffichage ?? index + 1,
        actif: link.actif === undefined ? true : Boolean(link.actif)
      }))
    };

    if (request.applicableTousLots) {
      request.applicableA = 'Tous les lots';
      request.applicableLots = [];
      request.lotId = null;
    } else {
      request.applicableA = request.applicableLots?.join(',') ?? '';
    }

    return request;
  }

  private extractLots(document: DocumentDemande): string[] {
    if (document.applicableLots && document.applicableLots.length > 0) {
      return document.applicableLots.filter(lot => lot !== 'Tous les lots');
    }

    if (!document.applicableA || document.applicableA === 'Tous les lots') {
      return [];
    }

    return document.applicableA
      .split(',')
      .map(lot => lot.trim())
      .filter(lot => lot.length > 0);
  }

  private getEmptyForm(): DocumentDemandeRequest {
    return {
      codeDocument: '',
      nomDocument: '',
      phase: 'PH1',
      formatAccepte: 'PDF',
      obligatoire: true,
      actif: true,
      applicableTousLots: true,
      applicableA: 'Tous les lots',
      ordreAffichage: null,
      lotId: null,
      applicableLots: [],
      champsLies: []
    };
  }

  private getEmptyLinkDraft(): LiaisonChampPieceRequest {
    return {
      champAppreciationId: null,
      documentDemandeId: null,
      obligatoire: true,
      conditionReponse: '',
      messagePrestataire: '',
      ordreAffichage: null,
      actif: true
    };
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (error?.error?.message) {
      return error.error.message;
    }

    if (error?.error?.detail) {
      return error.error.detail;
    }

    if (typeof error?.error === 'string' && error.error.trim() !== '') {
      return error.error;
    }

    return fallback;
  }
}