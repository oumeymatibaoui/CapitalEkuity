package com.elemar.backendelemar.dto;

import lombok.*;

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

    private Long candidatureId;

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

    private String statut;
    private LocalDateTime dateSoumission;

    private String rneNomFichier;
    private String rnePdfUrl;

    private String cnssNomFichier;
    private String cnssPdfUrl;

    private BigDecimal noteGlobale;

    private List<LotEvaluationResponse> lots;
}