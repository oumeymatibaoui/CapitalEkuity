package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidatureDetailResponse {

    // =====================================================
    // IDENTIFIANT
    // =====================================================

    private Long candidatureId;
    private String candidatureRef;

    // =====================================================
    // INFORMATIONS GÉNÉRALES
    // =====================================================

    private String raisonSociale;
    private String formeJuridique;
    private String rneMatriculeFiscal;

    private LocalDate dateCreationBureau;

    private String adresseSiege;
    private String telephone;
    private String emailPrincipal;
    private String siteInternet;
    private String ville;

    private String representantLegal;
    private String fonctionRepresentant;

    private String specialites;
    private String agrementsCertifications;
    private String banquePrincipale;
    private String localisation;


    // =====================================================
    // STATUT DE LA CANDIDATURE
    // =====================================================

    private String statut;
    private LocalDateTime dateSoumission;


    // =====================================================
    // DOCUMENT RNE
    // =====================================================

    private String rneNomFichier;
    private String rnePdfUrl;
    private String rneStatut;


    // =====================================================
    // DOCUMENT CNSS
    // =====================================================

    private String cnssNomFichier;
    private String cnssPdfUrl;
    private String cnssStatut;


    // =====================================================
    // RECEVABILITÉ DU DOSSIER
    // =====================================================

    private Boolean dossierRecevable;
    private String motifNonRecevable;


    // =====================================================
    // SOLVABILITÉ PRIVÉE EL EMAR
    // =====================================================

    private String solvabiliteStatut;
    private String solvabiliteCommentaire;
    private Long solvabiliteEvaluateurId;
    private LocalDateTime solvabiliteDateValidation;


    // =====================================================
    // NOTES ET LOTS
    // =====================================================

    private BigDecimal noteGlobale;

    private List<LotEvaluationResponse> lots;
}