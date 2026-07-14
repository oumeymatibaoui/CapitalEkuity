package com.elemar.backendelemar.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LotEvaluationResponse {

    private Long applicationCandidatureId;

    private Long lotId;
    private String nomLot;

    private String statut;
    private LocalDateTime dateSoumission;

    private BigDecimal noteLot;

    private String decisionFinale;
    private String observationFinale;

    private List<ElEmarCritereEvaluationResponse> criteres;

    private List<ProjetReferenceResponse> references;
}