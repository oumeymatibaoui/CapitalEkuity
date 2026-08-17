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
public class ElEmarCritereEvaluationResponse {

    private Long reponseCritereId;
    private Long critereEvaluationId;

    /*
     * Clé indispensable pour appliquer les catégories
     * autorisées du rôle dans Angular.
     */
    private Long categorieEvaluationId;
    private String categorieEvaluationCode;
    private String categorieEvaluationLibelle;

    private String codeCritere;
    private String section;
    private String libelle;

    private String aideCandidat;
    private String noteEvaluateur;
    private String typeChamp;

    private String reponse;

    private BigDecimal noteMax;
    private String statutEvaluation;
    private Boolean conforme;
    private BigDecimal noteObtenue;

    private String commentaireEvaluateur;

    private List<PieceEvaluationResponse> pieces;
}
