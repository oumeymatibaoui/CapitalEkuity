package com.elemar.backendelemar.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUtilisateurRoleRequest {

    private Long roleId;

    /*
     * Nouveau département.
     * Facultatif : si null, le département actuel est conservé.
     */
    private String typeUtilisateur;

    private Long modificateurId;
}