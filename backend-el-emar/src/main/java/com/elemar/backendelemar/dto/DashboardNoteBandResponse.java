package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardNoteBandResponse {

    private String code;
    private String label;
    private Long count;
}