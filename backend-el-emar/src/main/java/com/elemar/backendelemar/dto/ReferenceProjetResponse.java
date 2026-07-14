package com.elemar.backendelemar.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReferenceProjetResponse {

    private Long id;

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
    private Long zoneElEmarId;
    private String zoneElEmarNom;
    private Boolean zoneValidee;

    private String adresseProjet;
    private String typeProjet;
    private BigDecimal surfaceM2;

    /**
     * Important : String, pas Integer.
     */
    private String niveauxRPlus;

    private Integer nombreSousSols;
    private Integer anneeLivraison;
    private Boolean bimOuiNon;
    private Boolean seuilOk;
    private String missionRealisee;
    private BigDecimal montant;

    private String fichierP11Nom;
    private String fichierP11Url;
    private String fichierP12Nom;
    private String fichierP12Url;
}