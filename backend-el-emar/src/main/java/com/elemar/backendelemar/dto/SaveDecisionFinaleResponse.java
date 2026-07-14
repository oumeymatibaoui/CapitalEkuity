package com.elemar.backendelemar.dto;

import com.elemar.backendelemar.enums.DecisionFinale;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveDecisionFinaleResponse {

    private Long candidatureId;

    private Long applicationCandidatureId;

    private DecisionFinale decisionFinale;

    private String observationFinale;

    private BigDecimal noteLot;

    private BigDecimal noteGlobale;

    private String statutLot;
}