package com.elemar.backendelemar.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CategorieEvaluationResponse {

    private Long id;

    private Long typeIntervenantId;

    private String typeIntervenantCode;

    private String typeIntervenantLibelle;

    private Long lotId;

    private String lotCode;

    private String lotNom;

    private String code;

    private String libelle;

    private String description;

    private Boolean actif;

    private Integer ordreAffichage;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
    private Long categorieEvaluationId;
    private String categorieEvaluationCode;
    private String categorieEvaluationLibelle;
}