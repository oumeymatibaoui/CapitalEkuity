package com.elemar.backendelemar.dto;

import com.elemar.backendelemar.enums.TypeUtilisateur;

public record LoginResponse(
        Long id,
        String nom,
        String email,
        TypeUtilisateur typeUtilisateur,
        Long roleId,
        String roleCode,
        String roleNom,
        String token
) {

    /**
     * Constructeur compatible avec l'ancien code.
     */
    public LoginResponse(
            Long id,
            String nom,
            String email,
            TypeUtilisateur typeUtilisateur
    ) {
        this(
                id,
                nom,
                email,
                typeUtilisateur,
                null, // roleId
                typeUtilisateur != null ? typeUtilisateur.name() : null, // roleCode
                null, // roleNom
                null  // token
        );
    }
}