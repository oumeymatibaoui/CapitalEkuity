package com.elemar.backendelemar.dto;

import java.util.List;

/**
 * Autorisations réellement accordées au compte authentifié.
 * Le rôle est toujours résolu côté backend depuis le JWT.
 */
public record CurrentRoleAccessResponse(
        Long utilisateurId,
        Long roleId,
        String roleCode,
        String roleNom,
        List<ModuleAccessResponse> modules,
        List<RoleCategorieAccessResponse> categories
) {
}
