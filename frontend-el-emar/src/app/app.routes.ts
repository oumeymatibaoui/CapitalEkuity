import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

import { ElEmarLayout } from './layouts/el-emar-layout/el-emar-layout';
import { TableauDeBord } from './pages/el-emar/tableau-de-bord/tableau-de-bord';
import { AppelsACandidature } from './pages/el-emar/appels-a-candidature/appels-a-candidature';
import { Lots } from './pages/el-emar/lots/lots';
import { DocumentsDemandes } from './pages/el-emar/documents-demandes/documents-demandes';
import { ChampsAppreciation } from './pages/el-emar/champs-appreciation/champs-appreciation';
import { GrilleEvaluation } from './pages/el-emar/grille-evaluation/grille-evaluation';
import { Candidatures } from './pages/el-emar/candidatures/candidatures';
import { Synthese } from './pages/el-emar/synthese/synthese';
import { Notifications } from './pages/el-emar/notifications/notifications';
import { Zones } from './pages/el-emar/zones/zones';

export const routes: Routes = [
  {
    path: '',
    component: Home
  },
  {
    path: 'el-emar',
    component: ElEmarLayout,
    children: [
      {
        path: '',
        redirectTo: 'tableau-de-bord',
        pathMatch: 'full'
      },
      {
        path: 'tableau-de-bord',
        component: TableauDeBord
      },
      {
        path: 'appels-a-candidature',
        component: AppelsACandidature
      },
      {
        path: 'lots',
        component: Lots
      },
      {
        path: 'documents-demandes',
        component: DocumentsDemandes
      },
      {
        path: 'champs-appreciation',
        component: ChampsAppreciation
      },
      {
        path: 'grille-evaluation',
        component: GrilleEvaluation
      },
      {
        path: 'candidatures',
        component: Candidatures
      },
      {
        path: 'synthese',
        component: Synthese
      },
      {
        path: 'notifications',
        component: Notifications
      },
        {
        path: 'zones',
        component: Zones
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];