package com.elemar.backendelemar.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CritereFormulaireCandidatResponse {

    private Long id;

    private String codeCritere;

    // Question affichée au candidat
    private String labelCandidat;

    // Aide / explication simple
    private String aideCandidat;

    // Pourquoi cette donnée est demandée
    private String raisonDonnee;

    // Instruction visible candidat
    private String noteCandidat;

    // Configuration du champ
    private String typeChamp;
    private String optionsChamp;
    private Boolean obligatoire;
    private Integer ordreAffichage;

    private List<PieceFormulaireCandidatResponse> pieces;
}