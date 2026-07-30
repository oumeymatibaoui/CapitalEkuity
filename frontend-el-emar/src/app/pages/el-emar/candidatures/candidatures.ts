import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CandidatureAccessResponse,
  CandidatureAccessService,
  CreateCandidatureAccessRequest,
  GeneratedAccountResponse,
  UpdateCandidatureAccessRequest,
   UtilisateurCndResponse
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
editCandidatureModalOpen = false;
deleteCandidatureModalOpen = false;
userAccessModalOpen = false;

userAccessToChange: UtilisateurCndResponse | null = null;

userAccessCandidatureId: number | null = null;

changingUserAccess = false;
editingCandidature: CandidatureAccessResponse | null = null;
candidatureToDelete: CandidatureAccessResponse | null = null;

editLots: LotView[] = [];

loadingEditLots = false;
savingEdit = false;

editForm: UpdateCandidatureAccessRequest = {
  nomEntreprise: '',
  typeIntervenantId: null,
  lotIds: []
};
  deletingCandidatureId: number | null = null;
changingAccessCandidatureId: number | null = null;
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

toggleCandidatureAccess(
  candidature: CandidatureAccessResponse
): void {
  const candidatureId = Number(
    candidature.candidatureId
  );

  if (!candidatureId) {
    this.errorMessage =
      'Identifiant candidature introuvable.';
    return;
  }

  const isBlocked =
    candidature.accesBloque === true;

  this.errorMessage = '';
  this.successMessage = '';
  this.changingAccessCandidatureId =
    candidatureId;

  const request$ = isBlocked
    ? this.candidatureService
        .activateCandidature(candidatureId)
    : this.candidatureService
        .deactivateCandidature(candidatureId);

  request$.subscribe({
    next: (
      updated: CandidatureAccessResponse
    ) => {
      this.changingAccessCandidatureId =
        null;

      this.candidatures =
        this.candidatures.map(item => {
          if (
            Number(item.candidatureId) ===
            candidatureId
          ) {
            return {
              ...item,
              ...updated,

              // Sécurité si le backend ne renvoie pas encore
              // correctement accesBloque.
              accesBloque: !isBlocked
            };
          }

          return item;
        });

      this.successMessage = isBlocked
        ? `L’accès de "${candidature.nomEntreprise}" a été activé.`
        : `L’accès de "${candidature.nomEntreprise}" a été désactivé.`;
    },

    error: (error: any) => {
      console.error(
        'CHANGE CANDIDATURE ACCESS ERROR',
        error
      );

      this.changingAccessCandidatureId =
        null;

      this.errorMessage =
        error?.error?.message ||
        error?.error?.detail ||
        (
          isBlocked
            ? 'Erreur lors de l’activation de la candidature.'
            : 'Erreur lors de la désactivation de la candidature.'
        );
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
openEditCandidatureModal(
  candidature: CandidatureAccessResponse
): void {
  const candidatureId =
    Number(candidature.candidatureId);

  if (!candidatureId) {
    this.errorMessage =
      'Identifiant candidature introuvable.';
    return;
  }

  this.errorMessage = '';
  this.successMessage = '';

  this.editingCandidature = candidature;

  this.editForm = {
    nomEntreprise:
      candidature.nomEntreprise || '',

    typeIntervenantId:
      candidature.typeIntervenantId
        ? Number(candidature.typeIntervenantId)
        : null,

    lotIds: (candidature.lots || [])
      .map(lot => Number(lot.id))
      .filter(id => Number.isFinite(id))
  };

  this.editCandidatureModalOpen = true;
  this.loadEditLots();
}
closeEditCandidatureModal(): void {
  if (this.savingEdit) {
    return;
  }

  this.editCandidatureModalOpen = false;
  this.editingCandidature = null;
  this.editLots = [];

  this.editForm = {
    nomEntreprise: '',
    typeIntervenantId: null,
    lotIds: []
  };
}
loadEditLots(): void {
  const typeId =
    Number(this.editForm.typeIntervenantId);

  this.editLots = [];

  if (!typeId) {
    return;
  }

  this.loadingEditLots = true;

  this.lotService.getAll(typeId).subscribe({
    next: (lots: Lot[]) => {
      this.editLots = (lots || [])
        .filter(lot => this.isActive(lot.actif))
        .map(lot => ({
          ...lot,
          id: Number(lot.id),
          nomLot:
            lot.nomLot || 'Lot sans nom',
          codeLot:
            lot.codeLot || ''
        }));

      this.loadingEditLots = false;
    },

    error: (error: any) => {
      console.error(
        'LOAD EDIT LOTS ERROR',
        error
      );

      this.loadingEditLots = false;

      this.errorMessage =
        'Erreur lors du chargement des lots.';
    }
  });
}
toggleEditLot(lotId: number): void {
  const id = Number(lotId);

  if (this.editForm.lotIds.includes(id)) {
    this.editForm.lotIds =
      this.editForm.lotIds.filter(
        item => item !== id
      );

    return;
  }

  this.editForm.lotIds = [
    ...this.editForm.lotIds,
    id
  ];
}
saveCandidatureChanges(): void {
  if (!this.editingCandidature) {
    this.errorMessage =
      'Candidature à modifier introuvable.';
    return;
  }

  const candidatureId =
    Number(
      this.editingCandidature.candidatureId
    );

  const nomEntreprise =
    String(
      this.editForm.nomEntreprise || ''
    ).trim();

  const typeIntervenantId =
    Number(
      this.editForm.typeIntervenantId
    );

  const lotIds =
    (this.editForm.lotIds || [])
      .map(id => Number(id))
      .filter(id => Number.isFinite(id));

  if (!candidatureId) {
    this.errorMessage =
      'Identifiant candidature introuvable.';
    return;
  }

  if (!nomEntreprise) {
    this.errorMessage =
      'Le nom de la société est obligatoire.';
    return;
  }

  if (!typeIntervenantId) {
    this.errorMessage =
      'Le type d’intervenant est obligatoire.';
    return;
  }

  if (lotIds.length === 0) {
    this.errorMessage =
      'Veuillez sélectionner au moins un lot.';
    return;
  }

  const request: UpdateCandidatureAccessRequest = {
    nomEntreprise,
    typeIntervenantId,
    lotIds
  };

  this.errorMessage = '';
  this.successMessage = '';
  this.savingEdit = true;

  this.candidatureService
    .updateCandidature(
      candidatureId,
      request
    )
    .subscribe({
      next: (
        updated: CandidatureAccessResponse
      ) => {
        this.savingEdit = false;
        this.editCandidatureModalOpen = false;
        this.editingCandidature = null;
        this.editLots = [];

        const index =
          this.candidatures.findIndex(
            item =>
              Number(item.candidatureId) ===
              candidatureId
          );

        if (index >= 0) {
          this.candidatures[index] = updated;
          this.candidatures = [
            ...this.candidatures
          ];
        } else {
          this.loadCandidatures();
        }

        this.successMessage =
          'Candidature modifiée avec succès.';
      },

      error: (error: any) => {
        console.error(
          'UPDATE CANDIDATURE ERROR',
          error
        );

        this.savingEdit = false;

        this.errorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors de la modification de la candidature.';
      }
    });
}
isEditLotSelected(lotId: number): boolean {
  return this.editForm.lotIds.includes(
    Number(lotId)
  );
}
onEditTypeChange(): void {
  this.editForm.lotIds = [];
  this.editLots = [];

  this.loadEditLots();
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
openDeleteCandidatureModal(
  candidature: CandidatureAccessResponse
): void {
  const candidatureId =
    Number(candidature.candidatureId);

  if (!candidatureId) {
    this.errorMessage =
      'Identifiant candidature introuvable.';
    return;
  }

  this.errorMessage = '';
  this.successMessage = '';

  this.candidatureToDelete = candidature;
  this.deleteCandidatureModalOpen = true;
}
closeDeleteCandidatureModal(): void {
  if (this.deletingCandidatureId !== null) {
    return;
  }

  this.deleteCandidatureModalOpen = false;
  this.candidatureToDelete = null;
}
confirmDeleteCandidature(): void {
  if (!this.candidatureToDelete) {
    this.errorMessage =
      'Candidature introuvable.';
    return;
  }

  const candidatureId =
    Number(
      this.candidatureToDelete.candidatureId
    );

  const nomEntreprise =
    this.candidatureToDelete.nomEntreprise ||
    'Candidature';

  if (!candidatureId) {
    this.errorMessage =
      'Identifiant candidature introuvable.';
    return;
  }

  this.errorMessage = '';
  this.successMessage = '';
  this.deletingCandidatureId = candidatureId;

  this.candidatureService
    .deleteCandidature(candidatureId)
    .subscribe({
      next: () => {
        this.candidatures =
          this.candidatures.filter(
            item =>
              Number(item.candidatureId) !==
              candidatureId
          );

        this.deletingCandidatureId = null;
        this.deleteCandidatureModalOpen = false;
        this.candidatureToDelete = null;

        this.successMessage =
          `La candidature "${nomEntreprise}" a été supprimée avec succès.`;
      },

      error: (error: any) => {
        console.error(
          'DELETE CANDIDATURE ERROR',
          error
        );

        this.deletingCandidatureId = null;

        this.errorMessage =
          error?.error?.message ||
          error?.error?.detail ||
          'Erreur lors de la suppression de la candidature.';
      }
    });
}
// deactivateCandidature(
//   candidature: CandidatureAccessResponse
// ): void {
//   const candidatureId =
//     Number(candidature.candidatureId);

//   if (!candidatureId) {
//     this.errorMessage =
//       'Identifiant candidature introuvable.';
//     return;
//   }

//   this.errorMessage = '';
//   this.successMessage = '';

//   this.candidatureService
//     .deactivateCandidature(candidatureId)
//     .subscribe({
//       next: () => {
//         this.successMessage =
//           `L’accès de "${candidature.nomEntreprise}" a été désactivé.`;

//         this.loadCandidatures();
//       },

//       error: (error: any) => {
//         console.error(
//           'DEACTIVATE CANDIDATURE ERROR',
//           error
//         );

//         this.errorMessage =
//           error?.error?.message ||
//           error?.error?.detail ||
//           'Erreur lors de la désactivation de la candidature.';
//       }
//     });
// }
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
openUserAccessModal(
  user: UtilisateurCndResponse,
  candidatureId: number
): void {
  const userId = Number(user.id);
  const parentId = Number(candidatureId);

  if (!userId) {
    this.errorMessage =
      'Identifiant utilisateur introuvable.';
    return;
  }

  if (!parentId) {
    this.errorMessage =
      'Identifiant intervenant introuvable.';
    return;
  }

  this.errorMessage = '';
  this.successMessage = '';

  this.userAccessToChange = user;
  this.userAccessCandidatureId = parentId;
  this.userAccessModalOpen = true;
}
closeUserAccessModal(): void {
  if (this.changingUserAccess) {
    return;
  }

  this.userAccessModalOpen = false;
  this.userAccessToChange = null;
  this.userAccessCandidatureId = null;
}
confirmUserAccessChange(): void {
  if (
    !this.userAccessToChange ||
    !this.userAccessCandidatureId
  ) {
    this.errorMessage =
      'Utilisateur introuvable.';
    return;
  }

  const userId = Number(
    this.userAccessToChange.id
  );

  const candidatureId = Number(
    this.userAccessCandidatureId
  );

  if (!userId || !candidatureId) {
    this.errorMessage =
      'Identifiant utilisateur introuvable.';
    return;
  }

  const userWasDisabled =
    this.userAccessToChange.actif === false;

  const newActiveValue =
    userWasDisabled;

  this.errorMessage = '';
  this.successMessage = '';
  this.changingUserAccess = true;

  const request$ = userWasDisabled
    ? this.candidatureService.activateUser(userId)
    : this.candidatureService.deactivateUser(userId);

  request$.subscribe({
    next: () => {
      const userName =
        this.userAccessToChange?.nomComplet ||
        this.userAccessToChange?.email ||
        'Utilisateur';

      /*
       * Mise à jour immédiate du frontend.
       */
      this.candidatures =
        this.candidatures.map(candidature => {

          if (
            Number(candidature.candidatureId) !==
            candidatureId
          ) {
            return candidature;
          }

          return {
            ...candidature,

            utilisateurs:
              (candidature.utilisateurs || [])
                .map(user => {

                  if (
                    Number(user.id) !== userId
                  ) {
                    return user;
                  }

                  return {
                    ...user,
                    actif: newActiveValue
                  };
                })
          };
        });

      this.changingUserAccess = false;
      this.userAccessModalOpen = false;
      this.userAccessToChange = null;
      this.userAccessCandidatureId = null;

      this.successMessage =
        userWasDisabled
          ? `L’utilisateur "${userName}" a été activé.`
          : `L’utilisateur "${userName}" a été désactivé.`;
    },

    error: (error: any) => {
      console.error(
        'CHANGE USER ACCESS ERROR',
        error
      );

      this.changingUserAccess = false;

      this.errorMessage =
        error?.error?.message ||
        error?.error?.detail ||
        (
          userWasDisabled
            ? 'Erreur lors de l’activation de l’utilisateur.'
            : 'Erreur lors de la désactivation de l’utilisateur.'
        );
    }
  });
}
  // deactivateUser(user: any): void {
  //   const confirmed = confirm(
  //     `Désactiver l’utilisateur ${user.email} ?`
  //   );

  //   if (!confirmed) return;

  //   this.candidatureService.deactivateUser(user.id).subscribe({
  //     next: () => {
  //       this.successMessage = 'Utilisateur désactivé avec succès.';
  //       this.loadCandidatures();
  //     },
  //     error: (error: any) => {
  //       console.error('DEACTIVATE USER ERROR', error);
  //       this.errorMessage =
  //         error?.error?.message ||
  //         error?.error?.detail ||
  //         'Erreur lors de la désactivation de l’utilisateur.';
  //     }
  //   });
  // }

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