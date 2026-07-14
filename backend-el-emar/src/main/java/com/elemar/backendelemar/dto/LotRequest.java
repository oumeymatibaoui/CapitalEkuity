package com.elemar.backendelemar.dto;

import lombok.Data;

@Data
public class LotRequest {
    private String codeLot;
    private String nomLot;
    private String description;
    private Boolean actif;
    private Long typeIntervenantId;
}