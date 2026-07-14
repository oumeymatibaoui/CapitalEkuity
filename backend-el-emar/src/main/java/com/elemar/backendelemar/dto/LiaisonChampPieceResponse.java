package com.elemar.backendelemar.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LiaisonChampPieceResponse {

    private Long id;

    private Long champAppreciationId;

    private String labelChamp;

    private String codePxx;

    private Long lotId;

    private String lotNom;

    private Long documentDemandeId;

    private String codeDocument;

    private String nomDocument;

    private Boolean obligatoire;

    private String conditionReponse;

    private String messagePrestataire;

    private Integer ordreAffichage;

    private Boolean actif;
}