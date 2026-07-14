import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { roleGuard } from './core/guards/role.guard';

import { ElEmarLayout } from './layouts/el-emar-layout/el-emar-layout';

import { NouvelleCandidature } from './pages/cnd/nouvelle-candidature/nouvelle-candidature';
import { MesApplications } from './pages/cnd/mes-applications/mes-applications';
import { NotificationsCnd } from './pages/cnd/notifications-cnd/notifications-cnd';

import { TableauDeBord } from './pages/el-emar/tableau-de-bord/tableau-de-bord';
import { AppelsACandidature } from './pages/el-emar/appels-a-candidature/appels-a-candidature';
import { Lots } from './pages/el-emar/lots/lots';
import { DocumentsDemandes } from './pages/el-emar/documents-demandes/documents-demandes';
// import { ChampsAppreciation } from './pages/el-emar/champs-appreciation/champs-appreciation';
import { Candidatures } from './pages/el-emar/candidatures/candidatures';
import { Synthese } from './pages/el-emar/synthese/synthese';
import { Notifications } from './pages/el-emar/notifications/notifications';
import { Zones } from './pages/el-emar/zones/zones';
import { RolesAcces } from './pages/el-emar/roles-acces/roles-acces';
import { ConfigurationEvaluation } from './pages/el-emar/configuration-evaluation/configuration-evaluation';
import { Evaluation } from './pages/el-emar/evaluation/evaluation';
import { EvaluationCandidatures } from './pages/el-emar/evaluation-candidatures/evaluation-candidatures';
import { TypesIntervenant } from './pages/el-emar/types-intervenant/types-intervenant';
import { Classification } from './pages/el-emar/classification/classification';
import { HistoriqueElEmar } from './pages/el-emar/historique-el-emar/historique-el-emar';

import { CompteUtilisateur } from './pages/el-emar/compte-utilisateur/compte-utilisateur';
import { CompteElEmar } from './pages/el-emar/compte-el-emar/compte-el-emar';
import { ResetPassword } from './pages/reset-password/reset-password';

export const routes: Routes = [

  {
    path: 'home',
    component: Home
  },
{
  path: 'reset-password',
  component: ResetPassword
},
  // =========================
  // ESPACE CND / INTERVENANT
  // =========================
  {
    path: 'cnd',
    component: ElEmarLayout,
    canActivate: [roleGuard],
    data: {
      roles: ['IT', 'CND']
    },
    children: [
      {
        path: 'nouvelle-candidature',
        component: NouvelleCandidature
      },
      {
        path: 'mes-applications',
        component: MesApplications
      },
      {
        path: 'notifications',
        component: NotificationsCnd
      },
      {
        path: 'compte',
        component: CompteUtilisateur
      },
      {
        path: '',
        redirectTo: 'nouvelle-candidature',
        pathMatch: 'full'
      }
    ]
  },

  // =========================
  // ESPACE EL EMAR
  // =========================
  {
    path: 'el-emar',
    component: ElEmarLayout,
    canActivate: [roleGuard],
    data: {
      roles: ['IT', 'ADMIN', 'EL_EMAR', 'EVALUATEUR', 'DECIDEUR', 'DA']
    },
    children: [

      {
        path: 'dashboard',
        component: TableauDeBord
      },

      {
        path: 'campagnes',
        component: AppelsACandidature
      },

      {
        path: 'liste-agreee',
        component: Synthese
      },

      {
        path: 'dossiers',
        component: Candidatures
      },

      {
        path: 'candidats',
        component: Candidatures
      },

      {
        path: 'lots',
        component: Lots
      },

      {
        path: 'types-intervenant',
        component: TypesIntervenant
      },

      {
        path: 'zones',
        component: Zones
      },

      {
        path: 'documents-demandes',
        component: DocumentsDemandes
      },

      // {
      //   path: 'champs-appreciation',
      //   component: ChampsAppreciation
      // },

      {
        path: 'criteres',
        component: ConfigurationEvaluation
      },

      {
        path: 'verification-documents',
        component: DocumentsDemandes
      },

      // =========================
      // ÉVALUATION EL EMAR
      // =========================
      {
        path: 'evaluations',
        component: Evaluation
      },

      {
        path: 'evaluations/:candidatureId',
        component: EvaluationCandidatures
      },

      {
        path: 'decisions',
        component: Synthese
      },

      {
        path: 'classement-zone',
        component: Classification
      },

      {
        path: 'classement-zone/:candidatureId',
        component: Classification
      },

      {
        path: 'notifications',
        component: Notifications
      },

      {
        path: 'historique',
        component: HistoriqueElEmar
      },

      {
        path: 'utilisateurs',
        component: CompteElEmar
      },

      {
        path: 'compte',
        component: CompteUtilisateur
      },

      {
        path: 'roles-acces',
        component: RolesAcces
      },

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },

  {
    path: '**',
    redirectTo: 'home'
  }

];