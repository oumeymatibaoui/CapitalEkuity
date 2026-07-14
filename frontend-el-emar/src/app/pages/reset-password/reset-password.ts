import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword implements OnInit {

  token = '';

  newPassword = '';
  confirmPassword = '';

  pageError = '';
  successMessage = '';

  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.pageError = 'Lien de réinitialisation invalide.';
    }
  }

  submitResetPassword(): void {
    this.pageError = '';
    this.successMessage = '';

    if (!this.token) {
      this.pageError = 'Lien de réinitialisation invalide.';
      return;
    }

    if (!this.newPassword || !this.confirmPassword) {
      this.pageError = 'Veuillez saisir et confirmer le nouveau mot de passe.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.pageError = 'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.pageError = 'La confirmation ne correspond pas.';
      return;
    }

    this.loading = true;

    this.authService.resetPassword(
      this.token,
      this.newPassword,
      this.confirmPassword
    ).subscribe({
      next: (message: string) => {
        this.loading = false;
        this.successMessage = message || 'Mot de passe réinitialisé avec succès.';
        this.pageError = '';

        setTimeout(() => {
          this.router.navigateByUrl('/home');
        }, 1500);
      },
      error: (error: unknown) => {
        console.error('RESET PASSWORD ERROR = ', error);
        this.loading = false;

        const err = error as any;

        this.pageError =
          err?.error?.message ||
          err?.error?.detail ||
          err?.error ||
          'Erreur lors de la réinitialisation du mot de passe.';
      }
    });
  }
}