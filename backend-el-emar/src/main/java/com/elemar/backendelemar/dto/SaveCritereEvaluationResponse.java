package com.elemar.backendelemar.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveCritereEvaluationResponse {

    private Long reponseCritereId;

    private Long applicationCandidatureId;

    private String statutEvaluation;

    private Boolean conforme;

    private BigDecimal noteObtenue;

    private BigDecimal noteLot;

    private BigDecimal noteGlobale;

    private String commentaireEvaluateur;
}