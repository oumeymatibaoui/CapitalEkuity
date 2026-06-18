import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
    constructor(  private authService: AuthService,private router: Router) {}
    elEmarLogin = {
  email: 'admin@elemar.tn',
  motDePasse: 'admin123'
};

loginError = '';
steps = [
  {
    number: '01',
    title: 'Se connecter à la plateforme',
    description: 'Utilisez les identifiants fournis par El Emar pour accéder à votre espace sécurisé.'
  },
  {
    number: '02',
    title: 'Choisir les lots concernés',
    description: 'Sélectionnez les lots pour lesquels votre structure souhaite déposer sa candidature.'
  },
  {
    number: '03',
    title: 'Renseigner les informations générales',
    description: 'Complétez les informations administratives et professionnelles de votre structure.'
  },
  {
    number: '04',
    title: 'Déposer les documents demandés',
    description: 'Ajoutez les pièces justificatives nécessaires au traitement de votre dossier.'
  },
  {
    number: '05',
    title: 'Compléter les références et critères',
    description: 'Présentez vos références, expériences et réponses aux critères de qualification.'
  },
  {
    number: '06',
    title: 'Soumettre et suivre le dossier',
    description: 'Envoyez votre candidature et suivez son état d’avancement depuis votre espace.'
  }
];

getStepIcon(number: string): string {
  const icons: Record<string, string> = {
    '01': 'ti-lock',
    '02': 'ti-pin',
    '03': 'ti-clipboard-list',
    '04': 'ti-pencil',
    '05': 'ti-upload',
    '06': 'ti-file-description',

  };
  return icons[number] ?? 'ti-circle';
}
showElEmarLogin = false;

openElEmarLogin(): void {
  this.showElEmarLogin = true;
}

closeElEmarLogin(): void {
  this.showElEmarLogin = false;
}

ElEmarLogin(event: Event): void {
  event.preventDefault();
  this.loginError = '';

  this.authService.login(
    this.elEmarLogin.email,
    this.elEmarLogin.motDePasse
  ).subscribe({
    next: user => {
      if (user.typeUtilisateur !== 'EL_EMAR') {
        this.loginError = 'Accès réservé au personnel El Emar.';
        return;
      }

      this.closeElEmarLogin();
      this.router.navigate(['/el-emar/tableau-de-bord']);
    },
    error: () => {
      this.loginError = 'Email ou mot de passe incorrect.';
    }
  });}}
