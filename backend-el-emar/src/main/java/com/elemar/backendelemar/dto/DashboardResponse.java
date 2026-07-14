package com.elemar.backendelemar.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardResponse {

    private DashboardStatsResponse stats;

    private List<DashboardScoreIntervenantResponse> scoreIntervenants;
    private List<DashboardDecisionResponse> decisions;
    private List<DashboardZoneResponse> zones;
    private List<DashboardNoteBandResponse> noteBands;

    private List<DashboardOptionResponse> typesIntervenant;
    private List<DashboardOptionResponse> lots;
}