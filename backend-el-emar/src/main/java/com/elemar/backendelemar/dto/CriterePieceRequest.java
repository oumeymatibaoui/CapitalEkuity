package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CriterePieceRequest {

    private String codePiece;
    private String nomPiece;

    private String raisonPiece;

    // Instruction visible candidat, pas une note/score
    private String noteCandidat;

    // Remarque interne El Emar
    private String noteEvaluateur;

    private String formatAccepte;
    private Boolean obligatoire;

    // Exemple : Oui, Non, >=5...
    private String conditionReponse;

    private Integer ordreAffichage;
    private Boolean actif;
}