package com.elemar.backendelemar.dto;

import com.elemar.backendelemar.enums.TypeUtilisateur;

public record LoginResponse(
        Long id,
        String nom,
        String email,
        TypeUtilisateur typeUtilisateur
) {
}