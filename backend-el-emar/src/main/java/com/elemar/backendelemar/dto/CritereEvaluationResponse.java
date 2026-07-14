package com.elemar.backendelemar.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CritereEvaluationResponse {

    private Long critereEvaluationId;

    private Long grilleEvaluationLotId;

    private Long lotId;
    private String lotNom;

    private Long categorieEvaluationId;
    private String categorieEvaluationCode;
    private String categorieEvaluationLibelle;

    private String codeCritere;
    private String section;
    private String libelleCritere;

    private String labelCandidat;
    private String aideCandidat;
    private String raisonDonnee;
    private String noteCandidat;

    private String noteEvaluateur;

    private BigDecimal pointsMax;
    private String baremeNotation;
    private String typeNotation;

    private String typeChamp;
    private String optionsChamp;
    private Boolean obligatoire;

    private Integer ordreAffichage;
    private Boolean actif;

    private List<CriterePieceResponse> pieces;
}