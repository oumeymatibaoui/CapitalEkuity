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
public class CritereEvaluationRequest {

    private Long grilleEvaluationLotId;

    private Long lotId;

    /*
     * Seul champ utilisé pour associer la catégorie.
     * Aucun code ou libellé de catégorie n'est enregistré
     * dans critere_evaluation.
     */
    private Long categorieEvaluationId;

    private String codeCritere;
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

    private List<CriterePieceRequest> pieces;
}