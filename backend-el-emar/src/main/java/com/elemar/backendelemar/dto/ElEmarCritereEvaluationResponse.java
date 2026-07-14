package com.elemar.backendelemar.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ElEmarCritereEvaluationResponse {

    private Long reponseCritereId;
    private Long critereEvaluationId;

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