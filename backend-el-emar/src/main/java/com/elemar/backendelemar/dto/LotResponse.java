package com.elemar.backendelemar.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class LotResponse {
    private Long id;
    private String codeLot;
    private String nomLot;
    private String description;
    private Boolean actif;

    private Long typeIntervenantId;
    private String typeIntervenantCode;
    private String typeIntervenantLibelle;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}