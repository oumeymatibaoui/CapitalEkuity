package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoleRequest {

    private String nomRole;
    private String description;
    private String typeRole;

    /*
     * true  = rôle système protégé
     * false = rôle standard
     */
    private Boolean roleSysteme;
}