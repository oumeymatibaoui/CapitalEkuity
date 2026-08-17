package com.elemar.backendelemar.dto;

public record RoleCategorieAccessResponse(
        Long categorieId,
        Long typeIntervenantId,
        String typeIntervenantLibelle,
        Long lotId,
        String lotNom,
        String code,
        String libelle,
        String description,
        Integer ordreAffichage,
        Boolean autorise
) {
}