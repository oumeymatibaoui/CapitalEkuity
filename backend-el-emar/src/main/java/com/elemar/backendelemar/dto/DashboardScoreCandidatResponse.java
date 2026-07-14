package com.elemar.backendelemar.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardScoreCandidatResponse {

    private Long candidatureId;
    private Long applicationCandidatureId;

    private String raisonSociale;
    private String email;

    private Long lotId;
    private String lotNom;

    private Long typeIntervenantId;
    private String typeIntervenantLibelle;

    private BigDecimal score;
    private String decision;
    private String statut;
}