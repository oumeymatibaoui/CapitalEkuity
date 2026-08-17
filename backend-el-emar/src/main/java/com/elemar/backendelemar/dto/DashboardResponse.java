package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    private DashboardContextResponse context;
    private DashboardOverviewResponse overview;
    private DashboardItStatsResponse it;
    private DashboardConfigurationStatsResponse configuration;
    private DashboardEvaluationStatsResponse evaluation;
    private DashboardCommitteeStatsResponse committee;

    private List<DashboardAlertResponse> alerts;
    private List<DashboardActivityResponse> activities;
    private List<DashboardQuickActionResponse> quickActions;
    private List<DashboardIntervenantResponse> intervenants;
    private List<DashboardDecisionResponse> decisions;
    private List<DashboardZoneResponse> zones;
    private List<DashboardNoteBandResponse> noteBands;
    private List<DashboardOptionResponse> typesIntervenant;
    private List<DashboardOptionResponse> lots;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardContextResponse {
        private Long utilisateurId;
        private String nom;
        private String email;
        private String typeUtilisateur;
        private Long roleId;
        private String roleCode;
        private String roleNom;
        private String profile;
        private boolean admin;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardOverviewResponse {
        private long intervenantsActifs;
        private long dossiersActifs;
        private long evaluationsEnCours;
        private long decisionsEnAttente;
        private long classementsEnAttente;
        private BigDecimal noteMoyenne;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardItStatsResponse {
        private long utilisateursActifs;
        private long rolesActifs;
        private long modulesActifs;
        private long utilisateursSansRole;
        private long rolesSansAcces;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardConfigurationStatsResponse {
        private long typesActifs;
        private long lotsActifs;
        private long categoriesActives;
        private long grillesActives;
        private long criteresActifs;
        private long lotsSansGrille;
        private long grillesSansCritere;
        private long grillesTotalInvalide;
        private long criteresSansCategorie;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardEvaluationStatsResponse {
        private long dossiersAffectes;
        private long evaluationsACommencer;
        private long evaluationsEnCours;
        private long evaluationsTerminees;
        private long evaluationsReouvertes;
        private long criteresAVerifier;
        private long criteresConformes;
        private long criteresNonConformes;
        private BigDecimal noteMoyenne;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardCommitteeStatsResponse {
        private long dossiersEvalues;
        private long decisionsEnAttente;
        private long admis;
        private long rejetes;
        private long aCorriger;
        private long classementsEnAttente;
        private long dossiersClasses;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardAlertResponse {
        private String code;
        private String level;
        private String title;
        private String message;
        private long count;
        private String actionLabel;
        private String route;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardActivityResponse {
        private Long id;
        private String action;
        private String description;
        private String utilisateurNom;
        private String dateAction;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardQuickActionResponse {
        private String code;
        private String label;
        private String description;
        private String icon;
        private String route;
        private String moduleCode;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardIntervenantResponse {
        private Long candidatureId;
        private Long applicationCandidatureId;
        private String raisonSociale;
        private String email;
        private Long typeIntervenantId;
        private String typeIntervenantLibelle;
        private Long lotId;
        private String lotNom;
        private BigDecimal score;
        private String decision;
        private Long zoneId;
        private String zoneNom;
        private String classement;
        private String statutEvaluation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardDecisionResponse {
        private String code;
        private String label;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardZoneResponse {
        private Long zoneId;
        private String zoneNom;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardNoteBandResponse {
        private String code;
        private String label;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardOptionResponse {
        private Long id;
        private String label;
    }
}
