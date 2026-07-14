import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CandidatureAccessResponse,
  CandidatureAccessService,
  CreateCandidatureAccessRequest,
  GeneratedAccountResponse
} from '../../../core/services/candidature-access.service';

import {
  TypeIntervenant,
  TypeIntervenantService
} from '../../../core/services/type-intervenant.service';

import {
  Lot,
  LotService
} from '../../../core/services/lot.service';

type LotView = Lot & {
  id: number;
  nomLot: string;
  codeLot?: string;
};

@Component({
  selector: 'app-candidatures',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './candidatures.html',
  styleUrl: './candidatures.scss',
})
export class Candidatures implements OnInit {

  deletingCandidatureId: number | null = null;

  types: TypeIntervenant[] = [];
  lots: LotView[] = [];
  candidatures: CandidatureAccessResponse[] = [];

  selectedTypeFilterId: number | null = null;

  loading = false;
  loadingTypes = false;
  loadingLots = false;
  saving = false;

  errorMessage = '';
  successMessage = '';

  modalOpen = false;

  generatedAccountsModalOpen = false;
  generatedAccounts: GeneratedAccountResponse[] = [];

  form: CreateCandidatureAccessRequest = this.getEmptyForm();

  constructor(
    private candidatureService: CandidatureAccessService,
    private typeService: TypeIntervenantService,
    private lotService: LotService
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.loadTypes();
      this.loadCandidatures();
    }, 0);
  }

  loadTypes(): void {
    this.loadingTypes = true;

    this.typeService.getAll(true).subscribe({
      next: (types: TypeIntervenant[]) => {
        this.types = types || [];
        this.loadingTypes = false;
      },
      error: (error: any) => {
        console.error('LOAD TYPES ERROR', error);
        this.loadingTypes = false;
        this.errorMessage = 'Erreur lors du chargement des types.';
      }
    });
  }

  loadCandidatures(): void {
    this.loading = true;
    this.errorMessage = '';

    this.candidatureService.getAll().subscribe({
      next: (data: CandidatureAccessResponse[]) => {
        this.candidatures = data || [];
        this.loading = false;
      },
      error: (error: any) => {
        console.error('LOAD CANDIDATURES ERROR', error);
        this.loading = false;
        this.errorMessage = 'Erreur lors du chargement des candidatures.';
      }
    });
  }

  deleteCandidature(candidature: CandidatureAccessResponse): void {
    const candidatureId = Number(candidature.candidatureId);

    if (!candidatureId) {
      this.errorMessage = 'Identifiant candidature introuvable.';
      return;
    }

    const confirmed = confirm(
      `Voulez-vous vraiment supprimer l’accès de "${candidature.nomEntreprise}" ?\n\nCette action va désactiver la candidature et les utilisateurs liés.`
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.deletingCandidatureId = candidatureId;

    this.candidatureService.deleteCandidature(candidatureId).subscribe({
      next: () => {
        this.candidatures = this.candidatures.filter(
          item => Number(item.candidatureId) !== candidatureId
        );

        this.successMessage = 'Candidature supprimée avec succès.';
        this.deletingCandidatureId = null;
      },
      error: (error: any) => {
        console.error('DELETE CANDIDATURE ERROR', error);

        this.deletingCandidatureId = null;

        this.errorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors de la suppression de la candidature.';
      }
    });
  }

  openCreateModal(): void {
    this.form = this.getEmptyForm();
    this.lots = [];
    this.errorMessage = '';
    this.successMessage = '';
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.saving = false;
    this.form = this.getEmptyForm();
    this.lots = [];
  }

  onTypeChange(): void {
    this.form.lotIds = [];
    this.lots = [];

    if (!this.form.typeIntervenantId) {
      return;
    }

    this.loadingLots = true;

    this.lotService.getAll(this.form.typeIntervenantId).subscribe({
      next: (lots: Lot[]) => {
        this.lots = (lots || [])
          .filter(lot => this.isActive(lot.actif))
          .map(lot => ({
            ...lot,
            id: Number(lot.id),
            nomLot: lot.nomLot || 'Lot sans nom',
            codeLot: lot.codeLot || ''
          }));

        this.loadingLots = false;
      },
      error: (error: any) => {
        console.error('LOAD LOTS ERROR', error);
        this.loadingLots = false;
        this.errorMessage = 'Erreur lors du chargement des lots.';
      }
    });
  }

  toggleLot(lotId: number): void {
    const id = Number(lotId);

    if (this.form.lotIds.includes(id)) {
      this.form.lotIds = this.form.lotIds.filter(item => item !== id);
    } else {
      this.form.lotIds = [...this.form.lotIds, id];
    }
  }

  isLotSelected(lotId: number): boolean {
    return this.form.lotIds.includes(Number(lotId));
  }

  addUserRow(): void {
    this.form.users.push({
      nomComplet: '',
      email: '',
      telephone: '',
      fonction: ''
    });
  }

  removeUserRow(index: number): void {
    if (this.form.users.length === 1) {
      this.errorMessage = 'Il faut au moins un utilisateur.';
      return;
    }

    this.form.users.splice(index, 1);
  }

  save(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.nomEntreprise?.trim()) {
      this.errorMessage = 'Veuillez saisir le nom de la société.';
      return;
    }

    if (!this.form.typeIntervenantId) {
      this.errorMessage = 'Veuillez choisir le type d’intervenant.';
      return;
    }

    if (!this.form.lotIds || this.form.lotIds.length === 0) {
      this.errorMessage = 'Veuillez choisir au moins un lot autorisé.';
      return;
    }

    const validUsers = this.form.users
      .map(user => ({
        nomComplet: user.nomComplet?.trim() || '',
        email: user.email?.trim().toLowerCase() || '',
        telephone: user.telephone?.trim() || '',
        fonction: user.fonction?.trim() || ''
      }))
      .filter(user => user.email.length > 0);

    if (validUsers.length === 0) {
      this.errorMessage = 'Veuillez ajouter au moins un utilisateur avec email.';
      return;
    }

    const invalidEmail = validUsers.find(user => !this.isValidEmail(user.email));

    if (invalidEmail) {
      this.errorMessage = `Email invalide : ${invalidEmail.email}`;
      return;
    }

    const duplicatedEmail = this.findDuplicatedEmail(validUsers.map(user => user.email));

    if (duplicatedEmail) {
      this.errorMessage = `Email dupliqué dans le formulaire : ${duplicatedEmail}`;
      return;
    }

    const request: CreateCandidatureAccessRequest = {
      nomEntreprise: this.form.nomEntreprise.trim(),
      typeIntervenantId: Number(this.form.typeIntervenantId),
      lotIds: this.form.lotIds.map(id => Number(id)),
      users: validUsers
    };

    this.saving = true;

    this.candidatureService.create(request).subscribe({
      next: (response: CandidatureAccessResponse) => {
        this.saving = false;
        this.modalOpen = false;

        this.successMessage = 'Candidature créée avec succès.';

        this.generatedAccounts = response.comptesGeneres || [];
        this.generatedAccountsModalOpen = this.generatedAccounts.length > 0;

        this.loadCandidatures();
      },
      error: (error: any) => {
        console.error('CREATE CANDIDATURE ACCESS ERROR', error);
        console.log('STATUS:', error?.status);
        console.log('ERROR BODY:', error?.error);

        this.saving = false;

        const message = error?.error?.message || 'Erreur lors de la création de la candidature.';
        const constraint = error?.error?.constraint;
        const detail = error?.error?.detail;

        this.errorMessage = constraint || detail
          ? `${message} ${constraint ? 'Contrainte: ' + constraint + '.' : ''} ${detail ? 'Détail: ' + detail : ''}`
          : message;
      }
    });
  }

  resetPassword(user: any): void {
    const confirmed = confirm(
      `Générer un nouveau mot de passe pour ${user.email} ?`
    );

    if (!confirmed) return;

    this.candidatureService.resetPassword(user.id).subscribe({
      next: (account: GeneratedAccountResponse) => {
        this.generatedAccounts = [account];
        this.generatedAccountsModalOpen = true;
        this.successMessage = 'Mot de passe régénéré avec succès.';
      },
      error: (error: any) => {
        console.error('RESET PASSWORD ERROR', error);
        this.errorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors de la régénération du mot de passe.';
      }
    });
  }

  deactivateUser(user: any): void {
    const confirmed = confirm(
      `Désactiver l’utilisateur ${user.email} ?`
    );

    if (!confirmed) return;

    this.candidatureService.deactivateUser(user.id).subscribe({
      next: () => {
        this.successMessage = 'Utilisateur désactivé avec succès.';
        this.loadCandidatures();
      },
      error: (error: any) => {
        console.error('DEACTIVATE USER ERROR', error);
        this.errorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors de la désactivation de l’utilisateur.';
      }
    });
  }

  closeGeneratedAccountsModal(): void {
    this.generatedAccountsModalOpen = false;
    this.generatedAccounts = [];
  }

  copyAccounts(): void {
    const text = this.generatedAccounts
      .map(account =>
        `${account.nomComplet} | ${account.email} | Mot de passe : ${account.motDePasseTemporaire}`
      )
      .join('\n');

    navigator.clipboard.writeText(text).then(() => {
      this.successMessage = 'Comptes copiés dans le presse-papiers.';
    });
  }

  getFilteredCandidatures(): CandidatureAccessResponse[] {
    if (!this.selectedTypeFilterId) {
      return this.candidatures;
    }

    return this.candidatures.filter(
      item => Number(item.typeIntervenantId) === Number(this.selectedTypeFilterId)
    );
  }

  getTypeName(typeId: number | null): string {
    const type = this.types.find(item => Number(item.id) === Number(typeId));
    return type?.libelle || '-';
  }

  getEmptyForm(): CreateCandidatureAccessRequest {
    return {
      nomEntreprise: '',
      typeIntervenantId: null,
      lotIds: [],
      users: [
        {
          nomComplet: '',
          email: '',
          telephone: '',
          fonction: ''
        }
      ]
    };
  }

  findDuplicatedEmail(emails: string[]): string | null {
    const seen = new Set<string>();

    for (const email of emails) {
      if (seen.has(email)) {
        return email;
      }

      seen.add(email);
    }

    return null;
  }

  isActive(value: any): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  trackByCandidatureId(index: number, item: CandidatureAccessResponse): number {
    return item.candidatureId;
  }

  trackByLotId(index: number, lot: LotView): number {
    return lot.id;
  }

  trackByUserIndex(index: number): number {
    return index;
  }
}