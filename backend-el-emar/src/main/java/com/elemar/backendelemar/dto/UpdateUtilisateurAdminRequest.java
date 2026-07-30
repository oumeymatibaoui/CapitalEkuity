package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUtilisateurAdminRequest {

    private String nom;
    private String email;
    private String fonction;

    private Long roleId;
    private Boolean actif;

    /*
     * Utilisateur connecté qui réalise la modification.
     */
    private Long modificateurId;
}