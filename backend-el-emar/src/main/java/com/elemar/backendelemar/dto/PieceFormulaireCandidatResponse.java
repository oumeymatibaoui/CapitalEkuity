package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PieceFormulaireCandidatResponse {

    private Long id;

    private String codePiece;
    private String nomPiece;

    private String raisonPiece;

    // Instruction visible candidat
    private String noteCandidat;

    private String formatAccepte;
    private Boolean obligatoire;

    private String conditionReponse;
    private Integer ordreAffichage;
}