package com.elemar.backendelemar.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponse {

    private Long totalCandidatures;
    private Long totalApplications;

    private Long admis;
    private Long rejetes;
    private Long aCorriger;
    private Long enCours;

    private Long scoreInferieur100;

    private Long totalControles;
    private Long piecesConformes;
    private Long piecesNonConformes;

    private BigDecimal tauxConformite;
    private BigDecimal moyenneScore;
}