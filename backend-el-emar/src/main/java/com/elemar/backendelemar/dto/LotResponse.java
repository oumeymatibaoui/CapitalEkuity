package com.elemar.backendelemar.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LotResponse {

    private Long id;

    private String codeLot;

    private String nomLot;

    private String description;

    private Boolean actif;

    private LocalDateTime createdAt;
}