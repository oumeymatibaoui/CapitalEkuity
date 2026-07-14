package com.elemar.backendelemar.dto;

import com.elemar.backendelemar.enums.StatutCandidature;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidatureResponse {

    private Long id;

    private Long utilisateurId;
    private Long appelCandidatureId;
    private Long creeParUtilisateurId;

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

    private String lienAcces;
    private String tokenAcces;
    private LocalDateTime dateExpirationAcces;

    private StatutCandidature statut;
    private Boolean accesBloque;
    private LocalDateTime dateSoumission;

    private String rneNomFichier;
    private String rneCheminFichier;
    private String rneTypeContenu;
    private Long rneTailleFichier;
    private String rneStatut;

    private String cnssNomFichier;
    private String cnssCheminFichier;
    private String cnssTypeContenu;
    private Long cnssTailleFichier;
    private String cnssStatut;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}