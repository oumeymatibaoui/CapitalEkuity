package com.elemar.backendelemar.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjetReferenceRequest {

    private Long id;

    private String nomProjet;
    private String maitreOuvrage;

    private String ville;
    private String zone;

    private String adresseProjet;
    private Double latitude;
    private Double longitude;

    private String typeProjet;
    private BigDecimal surfaceM2;

    /*
     * Object pour accepter depuis le front :
     * 2
     * "2"
     * "R+2"
     */
    private Object niveauxRPlus;

    private Integer nombreSousSols;
    private Integer anneeLivraison;

    private Boolean bimOuiNon;
    private Boolean seuilOk;

    private String missionRealisee;
    private BigDecimal montant;
}