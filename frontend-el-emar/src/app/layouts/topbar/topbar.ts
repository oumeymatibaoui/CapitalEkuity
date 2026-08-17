import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss'
})
export class Topbar {

  @Input() title = '';
  @Input() subtitle = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  get userRole(): string {
    try {
      return this.authService.getUserRole() || '';
    } catch {
      return '';
    }
  }

  get isAdmin(): boolean {
    return this.userRole === 'IT' || this.userRole === 'ADMIN';
  }
goToAdministration(): void {
  this.router.navigate(['/el-emar/AdminProfile']);
}
  get roleLabel(): string {
    const map: Record<string, string> = {
      IT: 'Administrateur système',
      ADMIN: 'Administrateur',
      EL_EMAR: 'Staff El Emar',
      EVALUATEUR: 'Évaluateur',
      DECIDEUR: 'Décideur',
      DA: 'Direction achats',
      CND: 'Intervenant'
    };

    if (map[this.userRole]) {
      return map[this.userRole];
    }

    try {
      return this.authService.getUserRoleName() || 'Utilisateur';
    } catch {
      return 'Utilisateur';
    }
  }

  get userName(): string {
    try {
      return this.authService.getUserName() || 'Utilisateur';
    } catch {
      return 'Utilisateur';
    }
  }

  get userInitial(): string {
    const name = this.userName || 'U';
    return name.trim().charAt(0).toUpperCase() || 'U';
  }

  goToCompte(): void {
    const route = this.userRole === 'CND' ? '/cnd/compte' : '/el-emar/compte';
    this.router.navigate([route]);
  }
}