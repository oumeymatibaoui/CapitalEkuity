export type UserRole =
  | 'IT'
  | 'ADMIN'
  | 'EL_EMAR'
  | 'EVALUATEUR'
  | 'DECIDEUR'
  | 'CND'
  | 'DA';

export interface NavItem {
  code: string;
  label: string;
  route: string;
  icon: string;
  group: string;
  roles: UserRole[];
  disabled?: boolean;
}

export const NAV_ITEMS: NavItem[] = [

  // =========================
  // SUPERVISION
  // =========================
    {
    code: 'DASHBOARD',
    label: 'Dashboard',
    route: '/el-emar/dashboard',
    icon: 'ti ti-dashboard',
    group: 'Supervision',
    roles: ['IT', 'ADMIN', 'EL_EMAR', 'DECIDEUR']
  },
  {
    code: 'LISTE_AGREEE',
    label: 'Liste agréée',
    route: '/el-emar/liste-agreee',
    icon: 'ti ti-list-check',
    group: 'Supervision',
    roles: ['IT', 'ADMIN', 'EL_EMAR', 'DECIDEUR']
  },
  

  
  // =========================
// =========================
// PARAMÉTRAGE DE LA QUALIFICATION
// =========================

{
  code: 'INTERVENANTS',
  label: 'Intervenants',
  route: '/el-emar/candidats',
  icon: 'ti ti-users',
  group: 'Paramétrage de la qualification',
  roles: ['IT', 'ADMIN', 'EL_EMAR']
},

{
  code: 'LOTS',
  label: 'Domaines d’intervention',
  route: '/el-emar/lots',
  icon: 'ti ti-category',
  group: 'Paramétrage de la qualification',
  roles: ['IT', 'ADMIN', 'EL_EMAR']
},

{
  code: 'ZONES',
  label: 'Zones de classement',
  route: '/el-emar/zones',
  icon: 'ti ti-map',
  group: 'Paramétrage de la qualification',
  roles: ['IT', 'ADMIN', 'EL_EMAR']
},

{
  code: 'TYPES_INTERVENANT',
  label: 'Types d’intervenants',
  route: '/el-emar/types-intervenant',
  icon: 'ti ti-user-plus',
  group: 'Paramétrage de la qualification',
  roles: ['IT', 'ADMIN', 'EL_EMAR']
},

{
  code: 'GRILLE_EVALUATION',
  label: 'Critères de notation',
  route: '/el-emar/criteres',
  icon: 'ti ti-scale',
  group: 'Paramétrage de la qualification',
  roles: ['IT', 'ADMIN', 'EL_EMAR', 'EVALUATEUR']
},
  // =========================
  // INSTRUCTION ET DECISION
  // =========================
  {
    code: 'EVALUATIONS',
    label: 'Évaluation des dossiers',
    route: '/el-emar/evaluations',
    icon: 'ti ti-clipboard-list',
    group: 'Instruction et décision',
    roles: ['IT', 'ADMIN', 'EL_EMAR', 'EVALUATEUR', 'DECIDEUR']
  },

  {
    code: 'CLASSEMENT_ZONE',
    label: 'Classement par zone',
    route: '/el-emar/classement-zone',
    icon: 'ti ti-map-check',
    group: 'Instruction et décision',
    roles: ['IT', 'ADMIN', 'EL_EMAR', 'DECIDEUR']
  },

  // =========================
  // GOUVERNANCE ET ADMINISTRATION
  // =========================
  // {
  //   code: 'UTILISATEURS',
  //   label: 'Comptes utilisateurs',
  //   route: '/el-emar/Admin',
  //   icon: 'ti ti-user-cog',
  //   group: 'Gouvernance et administration',
  //   roles: ['IT', 'ADMIN']
  // },

  // {
  //   code: 'ROLES_ACCES',
  //   label: 'Rôles et accès',
  //   route: '/el-emar/roles-acces',
  //   icon: 'ti ti-shield-lock',
  //   group: 'Gouvernance et administration',
  //   roles: ['IT', 'ADMIN']
  // },

  // {
  //   code: 'HISTORIQUE',
  //   label: 'Traçabilité',
  //   route: '/el-emar/historique',
  //   icon: 'ti ti-history',
  //   group: 'Gouvernance et administration',
  //   roles: ['IT', 'ADMIN', 'EL_EMAR']
  // },

  // {
  //   code: 'NOTIFICATIONS',
  //   label: 'Notifications',
  //   route: '/el-emar/notifications',
  //   icon: 'ti ti-bell',
  //   group: 'Gouvernance et administration',
  //   roles: ['IT', 'ADMIN', 'EL_EMAR', 'EVALUATEUR', 'DECIDEUR']
  // },

  // =========================
  // COMPTE PERSONNEL EL EMAR
  // =========================
  // {
  //   code: 'MON_COMPTE_EL_EMAR',
  //   label: 'Mon compte',
  //   route: '/el-emar/compte',
  //   icon: 'ti ti-user-circle',
  //   group: 'Compte',
  //   roles: ['EL_EMAR', 'IT', 'ADMIN', 'EVALUATEUR', 'DECIDEUR', 'DA']
  // },

  // =========================
  // ESPACE INTERVENANT / CANDIDAT
  // =========================
  {
    code: 'CND_FORMULAIRE_CANDIDATURE',
    label: 'Formulaire de candidature',
    route: '/cnd/nouvelle-candidature',
    icon: 'ti ti-forms',
    group: 'Espace intervenant',
    roles: ['IT', 'CND']
  },

  {
    code: 'CND_MES_APPLICATIONS',
    label: 'Historique',
    route: '/cnd/mes-applications',
    icon: 'ti ti-folder-check',
    group: 'Espace intervenant',
    roles: ['IT', 'CND']
  },

  {
    code: 'CND_NOTIFICATIONS',
    label: 'Notifications',
    route: '/cnd/notifications',
    icon: 'ti ti-bell',
    group: 'Espace intervenant',
    roles: ['IT', 'CND']
  },

  // {
  //   code: 'MON_COMPTE_CND',
  //   label: 'Mon compte',
  //   route: '/cnd/compte',
  //   icon: 'ti ti-user-circle',
  //   group: 'Compte',
  //   roles: ['CND']
  // }

];