package com.elemar.backendelemar.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LotRequest {

    private String codeLot;

    private String nomLot;

    private String description;

    private Boolean actif;
}