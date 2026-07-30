package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRoleRequest {

    private String nomRole;
    private String description;
    private String typeRole;
    private Boolean actif;

    /*
     * Permet de transformer un rôle :
     * standard -> système
     * système  -> standard
     */
    private Boolean roleSysteme;
}