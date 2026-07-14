package com.elemar.backendelemar.dto;

import lombok.Data;

@Data
public class TypeIntervenantRequest {

    private String code;

    private String libelle;

    private String description;

    private Boolean actif;

    private Integer ordreAffichage;
}