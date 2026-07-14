package com.elemar.backendelemar.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LiaisonChampPieceRequest {

    // Utilisé quand on ajoute une pièce et on choisit les champs liés
    private Long champAppreciationId;

    // Utilisé quand on ajoute un champ et on choisit les pièces liées
    private Long documentDemandeId;

    private Boolean obligatoire;

    private String conditionReponse;

    private String messagePrestataire;

    private Integer ordreAffichage;

    private Boolean actif;
}