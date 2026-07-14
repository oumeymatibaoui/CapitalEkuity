package com.elemar.backendelemar.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardScoreIntervenantResponse {

    private Long candidatureId;
    private Long applicationCandidatureId;

    private String raisonSociale;
    private String email;

    private Long lotId;
    private String lotNom;

    private Long typeIntervenantId;
    private String typeIntervenantLibelle;

    private Long zoneId;
    private String zoneNom;

    private BigDecimal score;
    private String decision;
}