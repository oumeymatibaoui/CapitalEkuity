package com.elemar.backendelemar.dto;

import com.elemar.backendelemar.enums.DecisionFinale;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveDecisionFinaleRequest {

    private DecisionFinale decisionFinale;

    private String observationFinale;

    private Long evaluateurId;
}