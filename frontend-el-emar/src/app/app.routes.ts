import { Routes } from '@angular/router';

import { Home } from './pages/home/home';

import {
  roleGuard
} from './core/guards/role.guard';

import {
  moduleAccessGuard
} from './core/guards/module-access.guard';

import {
  ElEmarLayout
} from './layouts/el-emar-layout/el-emar-layout';

import {
  NouvelleCandidature
} from './pages/cnd/nouvelle-candidature/nouvelle-candidature';

import {
  MesApplications
} from './pages/cnd/mes-applications/mes-applications';

import {
  NotificationsCnd
} from './pages/cnd/notifications-cnd/notifications-cnd';

import {
  TableauDeBord
} from './pages/el-emar/tableau-de-bord/tableau-de-bord';

import {
  AppelsACandidature
} from './pages/el-emar/appels-a-candidature/appels-a-candidature';

import {
  Lots
} from './pages/el-emar/lots/lots';


import {
  Candidatures
} from './pages/el-emar/candidatures/candidatures';

import {
  Synthese
} from './pages/el-emar/synthese/synthese';

import {
  Notifications
} from './pages/el-emar/notifications/notifications';

import {
  Zones
} from './pages/el-emar/zones/zones';

import {
  RolesAcces
} from './pages/el-emar/roles-acces/roles-acces';

import {
  ConfigurationEvaluation
} from './pages/el-emar/configuration-evaluation/configuration-evaluation';

import {
  Evaluation
} from './pages/el-emar/evaluation/evaluation';

import {
  EvaluationCandidatures
} from './pages/el-emar/evaluation-candidatures/evaluation-candidatures';

import {
  WorkflowDossier
} from './pages/el-emar/workflow-dossier/workflow-dossier';

import {
  TypesIntervenant
} from './pages/el-emar/types-intervenant/types-intervenant';

import {
  Classification
} from './pages/el-emar/classification/classification';

import {
  HistoriqueElEmar
} from './pages/el-emar/historique-el-emar/historique-el-emar';

import {
  CompteUtilisateur
} from './pages/el-emar/compte-utilisateur/compte-utilisateur';

import {
  CompteElEmar
} from './pages/el-emar/compte-el-emar/compte-el-emar';

import {
  AdministrationDashboard
} from './pages/el-emar/administration-dashboard/administration-dashboard';

import {
  ResetPassword
} from './pages/reset-password/reset-password';

import {
  WorkflowConfiguration
} from './pages/el-emar/workflow-configuration/workflow-configuration';


export const routes: Routes = [

  // =====================================================
  // PUBLIC
  // =====================================================

  {
    path: 'home',
    component: Home
  },

  {
    path: 'reset-password',
    component: ResetPassword
  },


  // =====================================================
  // CANDIDAT
  // =====================================================

  {
    path: 'cnd',

    component: ElEmarLayout,

    canActivate: [
      roleGuard
    ],

    data: {
      roles: ['CND']
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


  // =====================================================
  // INTERNE EL EMAR
  // =====================================================

  {
    path: 'el-emar',

    component: ElEmarLayout,

    /*
     * IMPORTANT :
     *
     * plus de liste fixe :
     *
     * ADMIN
     * GESTIONNAIRE
     * EVALUATEUR
     * ...
     *
     * Le rôle peut être créé dynamiquement.
     *
     * roleGuard vérifie simplement la session.
     * Chaque page vérifie ensuite son module.
     */
    canActivate: [
      roleGuard
    ],

    children: [

      // ===================================================
      // DASHBOARD
      // ===================================================

      {
        path: 'dashboard',

        component: TableauDeBord,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode: 'DASHBOARD'
        }
      },


      // ===================================================
      // ADMINISTRATION DASHBOARD
      // ===================================================

      {
        path: 'AdminProfile',

        component: AdministrationDashboard,

        canActivate: [
          moduleAccessGuard
        ],

        /*
         * Cette page contient principalement
         * la gestion utilisateurs.
         */
        data: {
          moduleCode: 'UTILISATEURS'
        }
      },


      // ===================================================
      // CAMPAGNES
      // ===================================================

      {
        path: 'campagnes',

        component: AppelsACandidature,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'SESSIONS_QUALIFICATION'
        }
      },


      // ===================================================
      // LISTE AGREEE
      // ===================================================

      {
        path: 'liste-agreee',

        component: Synthese,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'LISTE_AGREEE'
        }
      },


      // ===================================================
      // DOSSIERS
      // ===================================================

      {
        path: 'dossiers',

        component: Candidatures,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'DOSSIERS_QUALIFICATION'
        }
      },


      // ===================================================
      // INTERVENANTS
      // ===================================================

      {
        path: 'candidats',

        component: Candidatures,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'INTERVENANTS'
        }
      },


      // ===================================================
      // LOTS
      // ===================================================

      {
        path: 'lots',

        component: Lots,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode: 'LOTS'
        }
      },


      // ===================================================
      // TYPES INTERVENANT
      // ===================================================

      {
        path: 'types-intervenant',

        component: TypesIntervenant,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'TYPES_INTERVENANT'
        }
      },


      // ===================================================
      // ZONES
      // ===================================================

      {
        path: 'zones',

        component: Zones,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode: 'ZONES'
        }
      },


      // ===================================================
      // DOCUMENTS DEMANDES
      // ===================================================

      


      // ===================================================
      // CONFIGURATION WORKFLOW
      // ===================================================

      {
        path: 'workflow-configuration',

        component: WorkflowConfiguration,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'WORKFLOW_CONFIGURATION'
        }
      },


      // ===================================================
      // CRITERES / GRILLE
      // ===================================================

      {
        path: 'criteres',

        component:
          ConfigurationEvaluation,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'GRILLE_EVALUATION'
        }
      },


      // ===================================================
      // VERIFICATION DOCUMENTS
      // ===================================================


      // ===================================================
      // EVALUATIONS
      // ===================================================

      {
        path: 'evaluations',

        component: Evaluation,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'EVALUATIONS'
        }
      },


      // ===================================================
      // DETAIL EVALUATION
      // ===================================================

      {
        path:
          'evaluations/:candidatureRef',

        component:
          EvaluationCandidatures,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'EVALUATIONS'
        }
      },


      // ===================================================
      // WORKFLOW DOSSIER
      // ===================================================

      {
        path: 'workflow-dossier',

        component: WorkflowDossier,

        canActivate: [
          moduleAccessGuard
        ],

        /*
         * Le workflow dossier fait partie
         * du traitement des dossiers.
         */
        data: {
          moduleCode:
            'DOSSIERS_QUALIFICATION'
        }
      },


      // ===================================================
      // DECISIONS
      // ===================================================

      {
        path: 'decisions',

        component: Synthese,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'DECISIONS'
        }
      },


      // ===================================================
      // CLASSEMENT
      // ===================================================

      {
        path: 'classement-zone',

        component: Classification,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'CLASSEMENT_ZONE'
        }
      },


      {
        path:
          'classement-zone/:candidatureId',

        component: Classification,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'CLASSEMENT_ZONE'
        }
      },


      // ===================================================
      // NOTIFICATIONS
      // ===================================================

      {
        path: 'notifications',

        component: Notifications,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'NOTIFICATIONS'
        }
      },


      // ===================================================
      // HISTORIQUE
      // ===================================================

      {
        path: 'historique',

        component: HistoriqueElEmar,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'HISTORIQUE'
        }
      },


      // ===================================================
      // UTILISATEURS
      // ===================================================

      /*
       * Route canonique cohérente avec
       * module_navbar.route_front.
       */
      {
        path: 'utilisateurs',

        component: CompteElEmar,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'UTILISATEURS'
        }
      },


      /*
       * Compatibilité avec ton ancien code :
       *
       * /el-emar/Admin
       *
       * redirige maintenant vers :
       *
       * /el-emar/utilisateurs
       */
      {
        path: 'Admin',

        redirectTo:
          'utilisateurs',

        pathMatch:
          'full'
      },


      // ===================================================
      // ROLES ET ACCES
      // ===================================================

      {
        path: 'roles-acces',

        component: RolesAcces,

        canActivate: [
          moduleAccessGuard
        ],

        data: {
          moduleCode:
            'ROLES_ACCES'
        }
      },


      // ===================================================
      // MON COMPTE
      // ===================================================

      /*
       * Pas de permission métier :
       * un utilisateur authentifié doit
       * pouvoir consulter son propre compte.
       */
      {
        path: 'compte',

        component: CompteUtilisateur
      },


      // ===================================================
      // DEFAULT
      // ===================================================

      {
        path: '',

        redirectTo:
          'dashboard',

        pathMatch:
          'full'
      }
    ]
  },


  // =====================================================
  // DEFAULT GLOBAL
  // =====================================================

  {
    path: '',

    redirectTo:
      'home',

    pathMatch:
      'full'
  },


  // =====================================================
  // 404
  // =====================================================

  {
    path: '**',

    redirectTo:
      'home'
  }
];