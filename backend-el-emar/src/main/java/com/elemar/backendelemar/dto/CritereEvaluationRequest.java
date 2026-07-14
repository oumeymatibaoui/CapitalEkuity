package com.elemar.backendelemar.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CritereEvaluationRequest {

    private Long grilleEvaluationLotId;
    private Long lotId;

    private String codeCritere;
    private String section;

    private String libelleCritere;
    private Long categorieEvaluationId;    // Partie visible candidat
    private String labelCandidat;
    private String aideCandidat;
    private String raisonDonnee;

    // Instruction visible candidat, pas score
    private String noteCandidat;

    // Interne El Emar seulement
    private String noteEvaluateur;

    // Partie notation interne
    private BigDecimal pointsMax;
    private String baremeNotation;
    private String typeNotation;

    // Configuration du champ candidat
    private String typeChamp;
    private String optionsChamp;
    private Boolean obligatoire;

    private Integer ordreAffichage;
    private Boolean actif;

    // Pièces liées à ce critère
    private List<CriterePieceRequest> pieces;
}