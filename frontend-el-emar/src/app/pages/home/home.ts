import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  AuthService,
  ConnectedCndUser,
  ConnectedUser
} from '../../core/services/auth.service';

interface Step {
  number: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {

  showElEmarLogin = false;
  showCandidatLogin = false;
showForgotPassword = false;
forgotPasswordEmail = '';
forgotPasswordError = '';
forgotPasswordSuccess = '';
sendingForgotPassword = false;
  loginError = '';
  candidatLoginError = '';

  elEmarLogin = {
    email: '',
    motDePasse: ''
  };

  candidatLogin = {
    email: '',
    motDePasse: ''
  };

  steps: Step[] = [
    {
      number: '01',
      title: 'Connexion',
      description: 'Connectez-vous avec les identifiants transmis par El Emar.'
    },
    {
      number: '02',
      title: 'Choix des lots',
      description: 'Sélectionnez les lots pour lesquels vous souhaitez déposer votre candidature.'
    },
    {
      number: '03',
      title: 'Informations société',
      description: 'Renseignez les informations générales relatives à votre structure.'
    },
    {
      number: '04',
      title: 'Données administratives',
      description: 'Complétez les informations administratives demandées.'
    },
    {
      number: '05',
      title: 'Informations métier',
      description: 'Déclarez vos compétences, moyens humains, techniques et références.'
    },
    {
      number: '06',
      title: 'Pièces justificatives',
      description: 'Déposez les documents demandés pour justifier les informations déclarées.'
    },
    {
      number: '07',
      title: 'Références projets',
      description: 'Ajoutez vos projets de référence selon les lots sélectionnés.'
    },
    {
      number: '08',
      title: 'Vérification',
      description: 'Relisez votre dossier avant la soumission définitive.'
    },
    {
      number: '09',
      title: 'Suivi',
      description: 'Suivez l’état de traitement de votre candidature depuis votre espace.'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  getStepIcon(stepNumber: string): string {
    switch (stepNumber) {
      case '01':
        return 'ti-login';
      case '02':
        return 'ti-layout-grid';
      case '03':
        return 'ti-building';
      case '04':
        return 'ti-file-description';
      case '05':
        return 'ti-forms';
      case '06':
        return 'ti-upload';
      case '07':
        return 'ti-briefcase';
      case '08':
        return 'ti-checklist';
      case '09':
        return 'ti-chart-bar';
      default:
        return 'ti-circle';
    }
  }

  // =========================
  // MODAL EL EMAR
  // =========================

  openElEmarLogin(): void {
    this.loginError = '';
    this.elEmarLogin = {
      email: '',
      motDePasse: ''
    };
    this.showElEmarLogin = true;
  }

  closeElEmarLogin(): void {
    this.showElEmarLogin = false;
    this.loginError = '';
  }

submitElEmarLogin(): void {
  this.loginError = '';

  const email = this.elEmarLogin.email.trim();
  const motDePasse = this.elEmarLogin.motDePasse;

  if (!email || !motDePasse) {
    this.loginError = 'Veuillez saisir votre email et votre mot de passe.';
    return;
  }

  this.authService.loginElEmar(email, motDePasse).subscribe({
    next: (user: ConnectedUser) => {
      console.log('LOGIN EL EMAR OK = ', user);

      const role = this.getUserRole(user);
      console.log('ROLE EL EMAR = ', role);

      if (role === 'CND') {
        this.loginError = 'Ce compte est un compte candidat. Veuillez utiliser l’espace candidat.';
        return;
      }

      this.closeElEmarLogin();

      this.router.navigateByUrl('/el-emar/dashboard').then((success: boolean) => {
        console.log('NAVIGATION ADMIN SUCCESS = ', success);

        if (!success) {
          this.loginError = 'Connexion réussie, mais la route admin est introuvable.';
        }
      });
    },
    error: (error: unknown) => {
      console.error('LOGIN EL EMAR ERROR = ', error);

      this.loginError = this.extractLoginError(
        error,
        'Email ou mot de passe incorrect.'
      );
    }
  });
}
  // =========================
  // MODAL CANDIDAT
  // =========================

  openCandidatLogin(): void {
    this.candidatLoginError = '';
    this.candidatLogin = {
      email: '',
      motDePasse: ''
    };
    this.showCandidatLogin = true;
  }

  closeCandidatLogin(): void {
    this.showCandidatLogin = false;
    this.candidatLoginError = '';
  }
openForgotPassword(prefillEmail?: string): void {
  this.forgotPasswordError = '';
  this.forgotPasswordSuccess = '';
  this.forgotPasswordEmail = prefillEmail?.trim() || '';
  this.showForgotPassword = true;
}

closeForgotPassword(): void {
  this.showForgotPassword = false;
  this.forgotPasswordError = '';
  this.forgotPasswordSuccess = '';
  this.sendingForgotPassword = false;
}

submitForgotPassword(): void {
  this.forgotPasswordError = '';
  this.forgotPasswordSuccess = '';

  const email = this.forgotPasswordEmail.trim();

  if (!email) {
    this.forgotPasswordError = 'Veuillez saisir votre email.';
    return;
  }

  if (!this.isValidEmail(email)) {
    this.forgotPasswordError = 'Veuillez saisir une adresse email valide.';
    return;
  }

  this.sendingForgotPassword = true;

  this.authService.forgotPassword(email).subscribe({
    next: (message: string) => {
      this.sendingForgotPassword = false;
      this.forgotPasswordSuccess =
        message || 'Si cet email existe, un lien de réinitialisation a été envoyé.';
      this.forgotPasswordError = '';
    },
    error: (error: unknown) => {
      console.error('FORGOT PASSWORD ERROR = ', error);
      this.sendingForgotPassword = false;

      this.forgotPasswordError = this.extractLoginError(
        error,
        'Erreur lors de l’envoi de l’email de réinitialisation.'
      );
    }
  });
}

private isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
submitCandidatLogin(): void {
  this.candidatLoginError = '';

  const email = this.candidatLogin.email.trim();
  const motDePasse = this.candidatLogin.motDePasse;

  if (!email || !motDePasse) {
    this.candidatLoginError = 'Veuillez saisir votre email et votre mot de passe.';
    return;
  }

  this.authService.loginCandidat(email, motDePasse).subscribe({
    next: (user: ConnectedCndUser) => {
      console.log('LOGIN CANDIDAT OK = ', user);

      const role = this.getUserRole(user);
      console.log('ROLE CANDIDAT = ', role);

      if (role !== 'CND') {
        this.candidatLoginError = 'Cet accès est réservé aux candidats / prestataires.';
        return;
      }

      this.saveCandidatSession(user);

      this.closeCandidatLogin();

      this.router.navigateByUrl('/cnd/nouvelle-candidature').then((success: boolean) => {
        console.log('NAVIGATION CND SUCCESS = ', success);

        if (!success) {
          this.candidatLoginError = 'Connexion réussie, mais la route /cnd/nouvelle-candidature est introuvable.';
        }
      });
    },
    error: (error: unknown) => {
      console.error('LOGIN CANDIDAT ERROR = ', error);

      this.candidatLoginError = this.extractLoginError(
        error,
        'Email ou mot de passe incorrect.'
      );
    }
  });
}
private saveCandidatSession(user: ConnectedCndUser): void {
  const rawUser = user as any;

  const utilisateurId =
    rawUser?.utilisateurId ??
    rawUser?.id ??
    rawUser?.userId ??
    null;

  const candidatureId =
    rawUser?.candidatureId ??
    null;

  if (utilisateurId !== null && utilisateurId !== undefined) {
    localStorage.setItem('userId', String(utilisateurId));
    localStorage.setItem('candidatUtilisateurId', String(utilisateurId));
  }

  if (candidatureId !== null && candidatureId !== undefined) {
    localStorage.setItem('candidatCandidatureId', String(candidatureId));
  }

  localStorage.setItem('candidatUser', JSON.stringify(user));
  localStorage.setItem('connectedUser', JSON.stringify(user));
  localStorage.setItem('currentUser', JSON.stringify(user));
}
  // =========================
  // REDIRECTION
  // =========================

  private redirectInternalUser(user: ConnectedUser): void {
    const role = this.getUserRole(user);

    if (role === 'IT' || role === 'ADMIN') {
      this.router.navigate(['/admin/tableau-bord']);
      return;
    }

    if (role === 'EL_EMAR') {
      this.router.navigate(['/admin/tableau-bord']);
      return;
    }

    if (role === 'EVALUATEUR') {
      this.router.navigate(['/admin/tableau-bord']);
      return;
    }

    if (role === 'DECIDEUR') {
      this.router.navigate(['/admin/tableau-bord']);
      return;
    }

    if (role === 'DA') {
      this.router.navigate(['/admin/tableau-bord']);
      return;
    }

    this.router.navigate(['/admin/tableau-bord']);
  }

  private getUserRole(user: ConnectedUser): string {
    const rawUser = user as any;

    return String(
      rawUser?.typeUtilisateur ??
      rawUser?.role ??
      rawUser?.type ??
      ''
    )
      .trim()
      .toUpperCase();
  }

  private saveConnectedUser(user: ConnectedUser): void {
    const rawUser = user as any;

    const userId =
      rawUser?.id ??
      rawUser?.userId ??
      rawUser?.utilisateurId ??
      null;

    if (userId !== null && userId !== undefined) {
      localStorage.setItem('userId', String(userId));
    }

    localStorage.setItem('connectedUser', JSON.stringify(user));
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  // =========================
  // ERREURS
  // =========================

private extractLoginError(error: unknown, defaultMessage: string): string {
  const err = error as any;

  if (err?.error?.message) {
    return err.error.message;
  }

  if (err?.error?.detail) {
    return err.error.detail;
  }

  if (typeof err?.error === 'string') {
    return err.error;
  }

  if (err?.message && !String(err.message).includes('Http failure response')) {
    return err.message;
  }

  return defaultMessage;
}
}