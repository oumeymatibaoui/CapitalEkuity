package com.elemar.backendelemar.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidatureInfoRequest {

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
}