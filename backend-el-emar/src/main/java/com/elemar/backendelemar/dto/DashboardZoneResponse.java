package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardZoneResponse {

    private Long zoneId;
    private String zoneNom;
    private Long count;
}