package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CritereEvaluationResponse {

    /*
     * Le nom du champ est critereEvaluationId.
     * Le service doit donc utiliser :
     * .critereEvaluationId(critere.getId())
     */
    private Long critereEvaluationId;

    private Long grilleEvaluationLotId;

    private Long lotId;
    private String lotNom;

    /*
     * Ces informations sont retournées par le GET,
     * mais elles sont lues depuis categorie_evaluation.
     */
    private Long categorieEvaluationId;
    private String categorieEvaluationCode;
    private String categorieEvaluationLibelle;

    private String codeCritere;

    /*
     * Conservé temporairement pour compatibilité front.
     * Sa valeur est calculée depuis la catégorie.
     */
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