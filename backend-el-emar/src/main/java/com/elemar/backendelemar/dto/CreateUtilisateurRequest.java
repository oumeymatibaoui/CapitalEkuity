package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateUtilisateurRequest {

    private String nom;
    private String email;
    private String motDePasse;
    private String fonction;

    /*
     * Nouveau champ principal.
     */
    private Long roleId;

    /*
     * Ancien champ temporairement conservé.
     */
    private String typeUtilisateur;

    private Long createurId;
}