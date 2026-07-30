package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUtilisateurRoleRequest {

    /*
     * Nouveau champ.
     */
    private Long roleId;

    /*
     * Ancien champ conservé pour compatibilité.
     */
    private String typeUtilisateur;

    private Long modificateurId;
}