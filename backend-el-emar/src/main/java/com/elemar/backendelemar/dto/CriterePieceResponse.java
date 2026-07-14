package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CriterePieceResponse {

    private Long id;
    private Long critereEvaluationId;

    private String codePiece;
    private String nomPiece;

    private String raisonPiece;

    // Instruction visible candidat
    private String noteCandidat;

    // Remarque interne El Emar
    private String noteEvaluateur;

    private String formatAccepte;
    private Boolean obligatoire;
    private String conditionReponse;

    private Integer ordreAffichage;
    private Boolean actif;
}