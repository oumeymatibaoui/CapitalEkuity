package com.elemar.backendelemar.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjetReferenceResponse {

    private Long id;
    private Long zoneElEmarId;

    private String zoneElEmarNom;

    private String zoneElEmarCommentaire;

    private Boolean zoneValidee;
    private Long applicationCandidatureId;
    private Long lotId;
    private String lotNom;

    private String nomProjet;
    private String maitreOuvrage;
    private String ville;

    /**
     * Zone déclarée par le candidat.
     */
    private String zone;

    /**
     * Zone validée par El Emar.
     */


    private String adresseProjet;
    private String typeProjet;
    private BigDecimal surfaceM2;

    /**
     * String, pas Integer.
     * Exemple : R+2, R+5.
     */
    private String niveauxRPlus;

    private Integer nombreSousSols;
    private Integer anneeLivraison;

    private Boolean bimOuiNon;
    private Boolean seuilOk;

    private String missionRealisee;
    private BigDecimal montant;

    private String fichierP11;
    private String fichierP12;

    /**
     * Champs utilisés par El Emar pour ouvrir les PDF.
     */
    private String fichierP11Nom;
    private String fichierP11Url;
    private String fichierP12Nom;
    private String fichierP12Url;

    private Double latitude;
    private Double longitude;

}