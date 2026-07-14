package com.elemar.backendelemar.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ModuleAccessResponse {

    private Long moduleId;

    private String codeModule;

    private String groupe;

    private String libelle;

    private String description;

    private String routeFront;

    private String icone;

    private Integer ordreGroupe;

    private Integer ordreModule;

    private Boolean autorise;
}