import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-el-emar-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './el-emar-layout.html',
  styleUrl: './el-emar-layout.scss',
})
export class ElEmarLayout {
  constructor(
  private authService: AuthService,
  private router: Router
) {}
  menuItems = [

    {
      label: 'Tableau de bord',
      icon: 'ti-layout-dashboard',
      route: '/el-emar/tableau-de-bord'
    },
        {
  label: 'Zones',
  icon: 'ti-map-pin',
  route: '/el-emar/zones'
},
  
    {
      label: 'Lots',
      icon: 'ti-layers-subtract',
      route: '/el-emar/lots'
    },
    {
      label: 'Champs d’appréciation',
      icon: 'ti-clipboard-list',
      route: '/el-emar/champs-appreciation'
    },
      {
      label: 'Campagnes de qualification',
      icon: 'ti-file-text',
      route: '/el-emar/appels-a-candidature'
    },
    {
      label: 'Documents demandés',
      icon: 'ti-folder',
      route: '/el-emar/documents-demandes'
    },
    
    {
      label: 'Grille d’évaluation',
      icon: 'ti-table',
      route: '/el-emar/grille-evaluation'
    },
    {
      label: 'Candidatures',
      icon: 'ti-users',
      route: '/el-emar/candidatures'
    },
    {
      label: 'Synthèse',
      icon: 'ti-chart-bar',
      route: '/el-emar/synthese'
    },
    {
      label: 'Notifications',
      icon: 'ti-bell',
      route: '/el-emar/notifications'
    },

  ];
  logout(): void {
  this.authService.logout();
  this.router.navigate(['/']);
}
}