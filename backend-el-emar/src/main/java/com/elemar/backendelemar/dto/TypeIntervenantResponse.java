package com.elemar.backendelemar.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class TypeIntervenantResponse {

    private Long id;

    private String code;

    private String libelle;

    private String description;

    private Boolean actif;

    private Integer ordreAffichage;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}