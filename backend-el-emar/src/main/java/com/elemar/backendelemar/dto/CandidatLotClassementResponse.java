package com.elemar.backendelemar.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidatLotClassementResponse {

    private Long applicationCandidatureId;
    private Long candidatureId;

    private String raisonSociale;
    private String emailPrincipal;
    private String telephone;

    private String typeCandidat;

    private Long lotId;
    private String nomLot;

    private Long zoneId;
    private String nomZone;

    private BigDecimal noteLot;

    private String decisionFinale;
    private String statut;

    private Integer rangGlobal;
    private Integer rangParLot;
    private Integer rangParLotZone;

    private LocalDateTime dateSoumission;
}