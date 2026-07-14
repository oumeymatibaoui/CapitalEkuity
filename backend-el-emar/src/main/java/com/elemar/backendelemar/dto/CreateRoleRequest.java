package com.elemar.backendelemar.dto;



import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateRoleRequest {

    private String nomRole;

    private String description;

    private String typeRole;
}