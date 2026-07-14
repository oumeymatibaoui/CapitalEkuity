package com.elemar.backendelemar.dto;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LotLightResponse {

    private Long id;

    private String codeLot;

    private String nomLot;
}