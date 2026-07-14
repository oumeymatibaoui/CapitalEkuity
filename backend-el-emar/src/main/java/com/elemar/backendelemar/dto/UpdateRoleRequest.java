package com.elemar.backendelemar.dto;



import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateRoleRequest {

    private String nomRole;

    private String description;

    private String typeRole;

    private Boolean actif;
}