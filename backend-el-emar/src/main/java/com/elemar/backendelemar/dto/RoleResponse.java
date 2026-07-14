package com.elemar.backendelemar.dto;



import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RoleResponse {

    private Long id;

    private String codeRole;

    private String nomRole;

    private String description;

    private String typeRole;

    private Boolean roleSysteme;

    private Boolean actif;

    private Long modulesAutorises;

    private Long totalModules;
}