package com.elemar.backendelemar.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateUtilisateurRequest {

    private String nom;

    private String email;

    private String fonction;

    /*
     * IT, ACHAT, COMITE ou TECHNIQUE
     */
    private String typeUtilisateur;

    /*
     * Identifiant du rôle dans role_acces
     */
    private Long roleId;

    private String motDePasse;

    /*
     * Utilisateur connecté qui crée le compte
     */
    private Long createurId;
}