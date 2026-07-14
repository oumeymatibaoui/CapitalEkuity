package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LotOptionResponse {

    private Long id;
    private String codeLot;
    private String nomLot;

    private Long typeIntervenantId;
    private String typeIntervenantCode;
    private String typeIntervenantLibelle;

    private Boolean actif;
}