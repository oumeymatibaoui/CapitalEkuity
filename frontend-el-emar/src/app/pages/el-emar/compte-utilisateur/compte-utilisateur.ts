import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit
} from '@angular/core';

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
export class CompteUtilisateur
  implements OnInit {

  /*
   * IMPORTANT :
   * plus de utilisateurId dans ce composant.
   *
   * La page appelle uniquement :
   * /api/el-emar/compte/me
   *
   * Le backend déduit l'identité depuis le JWT.
   */

  compte:
    CompteUtilisateurResponse | null = null;

  historique:
    HistoriqueActionResponse[] = [];

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
    private readonly fb: FormBuilder,
    private readonly compteUtilisateurService:
      CompteUtilisateurService
  ) {

    this.compteForm =
      this.fb.group({
        nom: [''],

        email: [
          {
            value: '',
            disabled: true
          }
        ],

        fonction: ['']
      });

    this.passwordForm =
      this.fb.group({
        oldPassword: [''],
        newPassword: [''],
        confirmPassword: ['']
      });
  }

  ngOnInit(): void {
    this.loadCompte();
    this.loadHistorique();
  }

  // =====================================================
  // CHARGER MON COMPTE
  // =====================================================

  loadCompte(): void {

    this.loading = true;

    this.pageError = '';
    this.successMessage = '';

    this.compteUtilisateurService
      .getCompte()
      .subscribe({

        next: (
          data:
            CompteUtilisateurResponse
        ) => {

          this.compte = data;

          this.compteForm.patchValue({
            nom:
              data.nom || '',

            email:
              data.email || '',

            fonction:
              data.fonction || ''
          });

          this.updateCurrentUserInStorage(
            data
          );

          this.loading = false;
        },

        error: (error: any) => {

          console.error(
            'ERROR LOAD COMPTE UTILISATEUR',
            error
          );

          this.loading = false;

          this.pageError =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors du chargement du compte.';
        }
      });
  }

  // =====================================================
  // SAUVEGARDER MON COMPTE
  // =====================================================

  saveCompte(): void {

    const nom =
      String(
        this.compteForm
          .get('nom')
          ?.value || ''
      ).trim();

    const fonction =
      String(
        this.compteForm
          .get('fonction')
          ?.value || ''
      ).trim();

    if (!nom) {
      this.pageError =
        'Le nom est obligatoire.';
      return;
    }

    this.savingCompte = true;

    this.pageError = '';
    this.successMessage = '';

    this.compteUtilisateurService
      .updateCompte({
        nom,
        fonction:
          fonction || null
      })
      .subscribe({

        next: (
          data:
            CompteUtilisateurResponse
        ) => {

          this.compte = data;

          this.compteForm.patchValue({
            nom:
              data.nom || '',

            email:
              data.email || '',

            fonction:
              data.fonction || ''
          });

          this.updateCurrentUserInStorage(
            data
          );

          this.savingCompte = false;

          this.successMessage =
            'Compte mis à jour avec succès.';

          this.pageError = '';

          this.loadHistorique();
        },

        error: (error: any) => {

          console.error(
            'ERROR UPDATE COMPTE UTILISATEUR',
            error
          );

          this.savingCompte = false;

          this.pageError =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors de la mise à jour du compte.';
        }
      });
  }

  // =====================================================
  // FORMULAIRE MOT DE PASSE
  // =====================================================

  togglePasswordForm(): void {

    this.showPasswordForm =
      !this.showPasswordForm;

    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    if (!this.showPasswordForm) {
      this.passwordForm.reset();
    }
  }

  // =====================================================
  // CHANGER MON MOT DE PASSE
  // =====================================================

  changePassword(): void {

    const oldPassword =
      String(
        this.passwordForm
          .get('oldPassword')
          ?.value || ''
      ).trim();

    const newPassword =
      String(
        this.passwordForm
          .get('newPassword')
          ?.value || ''
      ).trim();

    const confirmPassword =
      String(
        this.passwordForm
          .get('confirmPassword')
          ?.value || ''
      ).trim();

    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    if (
      !oldPassword ||
      !newPassword ||
      !confirmPassword
    ) {

      this.passwordErrorMessage =
        'Veuillez remplir tous les champs.';

      return;
    }

    /*
     * Backend = minimum 8 caractères.
     * Le frontend utilise la même règle.
     */
    if (newPassword.length < 8) {

      this.passwordErrorMessage =
        'Le nouveau mot de passe doit contenir au moins 8 caractères.';

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {

      this.passwordErrorMessage =
        'La confirmation du mot de passe ne correspond pas.';

      return;
    }

    if (
      newPassword ===
      oldPassword
    ) {

      this.passwordErrorMessage =
        'Le nouveau mot de passe doit être différent de l’ancien.';

      return;
    }

    this.changingPassword = true;

    this.compteUtilisateurService
      .changePassword({
        oldPassword,
        newPassword,
        confirmPassword
      })
      .subscribe({

        next: () => {

          this.changingPassword = false;

          this.passwordSuccessMessage =
            'Mot de passe modifié avec succès.';

          this.passwordErrorMessage = '';

          this.passwordForm.reset();

          this.showPasswordForm = false;

          this.loadHistorique();
        },

        error: (error: any) => {

          console.error(
            'ERROR CHANGE PASSWORD UTILISATEUR',
            error
          );

          this.changingPassword = false;

          this.passwordErrorMessage =
            error?.error?.message ||
            error?.error?.detail ||
            'Erreur lors du changement du mot de passe.';
        }
      });
  }

  // =====================================================
  // HISTORIQUE
  // =====================================================

  loadHistorique(): void {

    this.compteUtilisateurService
      .getHistorique()
      .subscribe({

        next: (
          data:
            HistoriqueActionResponse[]
        ) => {

          this.historique =
            data || [];
        },

        error: (error: any) => {

          console.error(
            'ERROR LOAD HISTORIQUE UTILISATEUR',
            error
          );
        }
      });
  }

  // =====================================================
  // AFFICHAGE
  // =====================================================

  getProfileInitial(): string {

    const source =
      this.compte?.nom ||
      this.compte?.email ||
      'U';

    return source
      .trim()
      .charAt(0)
      .toUpperCase();
  }

  getCompteTitle(): string {

    const type =
      String(
        this.compte
          ?.typeUtilisateur || ''
      )
        .trim()
        .toUpperCase();

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

    if (type === 'ACHAT') {
      return 'Espace Achat';
    }

    if (type === 'TECHNIQUE') {
      return 'Espace Technique';
    }

    if (type === 'COMITE') {
      return 'Espace Comité';
    }

    return 'Mon Espace Personnel';
  }

  getActionLabel(
    action: string
  ): string {

    switch (action) {

      case 'EL_EMAR_UPDATE_COMPTE':
      case 'CND_UPDATE_COMPTE':
      case 'UTILISATEUR_INTERNE_UPDATE_COMPTE':
        return 'Modification compte';

      case 'EL_EMAR_CHANGE_PASSWORD':
      case 'CND_CHANGE_PASSWORD':
      case 'UTILISATEUR_INTERNE_CHANGE_PASSWORD':
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

  getActionClass(
    action: string
  ): string {

    if (!action) {
      return 'action-default';
    }

    if (
      action.includes('COMPTE')
    ) {
      return 'action-account';
    }

    if (
      action.includes('PASSWORD')
    ) {
      return 'action-password';
    }

    if (
      action.includes('EVALUATION')
    ) {
      return 'action-evaluation';
    }

    if (
      action.includes('NOTIFICATION')
    ) {
      return 'action-notification';
    }

    if (
      action.includes('DECISION')
    ) {
      return 'action-decision';
    }

    if (
      action.includes('CLASSEMENT')
    ) {
      return 'action-zone';
    }

    if (
      action.includes('UPLOAD')
    ) {
      return 'action-upload';
    }

    if (
      action.includes('SOUMISSION')
    ) {
      return 'action-submit';
    }

    if (
      action.includes('CORRECTION')
    ) {
      return 'action-correction';
    }

    if (
      action.includes('MODIFICATION')
    ) {
      return 'action-edit';
    }

    return 'action-default';
  }

  formatDate(
    value?: string | null
  ): string {

    if (!value) {
      return '-';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      'fr-FR',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }

  // =====================================================
  // SYNCHRONISER LE NOM/FONCTION EN LOCAL
  //
  // Aucun ID n'est utilisé pour une requête HTTP.
  // =====================================================

  private updateCurrentUserInStorage(
    data:
      CompteUtilisateurResponse
  ): void {

    const possibleKeys = [
      'connectedUser',
      'currentUser',
      'user',
      'authUser',
      'candidatUser',
      'elEmarUser',
      'elEmarConnectedUser'
    ];

    for (
      const key of
        possibleKeys
    ) {

      const value =
        localStorage.getItem(
          key
        );

      if (!value) {
        continue;
      }

      try {

        const parsed =
          JSON.parse(value);

        const updated = {
          ...parsed,

          nom:
            data.nom,

          email:
            data.email,

          fonction:
            data.fonction,

          typeUtilisateur:
            data.typeUtilisateur
        };

        localStorage.setItem(
          key,
          JSON.stringify(
            updated
          )
        );

      } catch {
        continue;
      }
    }

    localStorage.setItem(
      'userEmail',
      data.email || ''
    );
  }
}
