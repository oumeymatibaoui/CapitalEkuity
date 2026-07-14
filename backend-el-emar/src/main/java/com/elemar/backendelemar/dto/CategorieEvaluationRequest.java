package com.elemar.backendelemar.dto;

import lombok.Data;

@Data
public class CategorieEvaluationRequest {

    private Long typeIntervenantId;

    private Long lotId;

    private String code;

    private String libelle;

    private String description;

    private Boolean actif;

    private Integer ordreAffichage;
    private Long categorieEvaluationId;
}