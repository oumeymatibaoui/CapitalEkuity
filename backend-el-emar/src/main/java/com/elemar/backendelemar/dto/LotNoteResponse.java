package com.elemar.backendelemar.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LotNoteResponse {
    private Long applicationCandidatureId;
    private Long lotId;
    private String nomLot;
    private BigDecimal noteLot;
    private String statutLot;
    private String decisionFinale;
}