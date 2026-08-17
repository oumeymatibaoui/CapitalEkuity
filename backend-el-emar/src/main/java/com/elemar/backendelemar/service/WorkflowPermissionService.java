package com.elemar.backendelemar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorkflowPermissionService {

    private final JdbcTemplate jdbcTemplate;

    // =====================================================
    // UTILISATEUR ACTIF
    // =====================================================

    public boolean utilisateurActif(
            Long utilisateurId
    ) {
        if (utilisateurId == null) {
            return false;
        }

        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM utilisateur u
                WHERE u.id = ?
                  AND COALESCE(u.actif, TRUE) = TRUE
                """,
                Long.class,
                utilisateurId
        );

        return count != null && count > 0;
    }

    // =====================================================
    // ADMINISTRATEUR
    // =====================================================

    /**
     * Seul ADMIN contourne les permissions fonctionnelles.
     *
     * IT reste soumis aux permissions configurées dans
     * role_module_acces afin qu'il ne puisse pas modifier
     * automatiquement les évaluations métier.
     */
    public boolean estAdministrateur(
            Long utilisateurId
    ) {
        if (utilisateurId == null) {
            return false;
        }

        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM utilisateur u

                LEFT JOIN role_acces r
                    ON r.id = u.role_id

                WHERE u.id = ?
                  AND COALESCE(u.actif, TRUE) = TRUE
                  AND UPPER(
                        COALESCE(
                            r.code_role,
                            CAST(u.type_utilisateur AS TEXT),
                            ''
                        )
                  ) = 'ADMIN'
                """,
                Long.class,
                utilisateurId
        );

        return count != null && count > 0;
    }

    // =====================================================
    // PERMISSION PAR MODULE
    // =====================================================

    public boolean aPermission(
            Long utilisateurId,
            String codeModule
    ) {
        if (
                utilisateurId == null
                        || codeModule == null
                        || codeModule.trim().isEmpty()
        ) {
            return false;
        }

        if (!utilisateurActif(utilisateurId)) {
            return false;
        }

        if (estAdministrateur(utilisateurId)) {
            return true;
        }

        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)

                FROM utilisateur u

                JOIN role_acces r
                    ON r.id = u.role_id

                JOIN role_module_acces rma
                    ON rma.role_id = r.id

                JOIN module_navbar m
                    ON m.id = rma.module_id

                WHERE u.id = ?
                  AND COALESCE(u.actif, TRUE) = TRUE
                  AND COALESCE(r.actif, TRUE) = TRUE
                  AND COALESCE(m.actif, TRUE) = TRUE
                  AND COALESCE(rma.autorise, FALSE) = TRUE
                  AND UPPER(m.code_module) = UPPER(?)
                """,
                Long.class,
                utilisateurId,
                codeModule.trim()
        );

        return count != null && count > 0;
    }

    // =====================================================
    // EXIGER PERMISSION
    // =====================================================

    public void exigerPermission(
            Long utilisateurId,
            String codeModule
    ) {
        exigerUtilisateurActif(utilisateurId);

        if (!aPermission(utilisateurId, codeModule)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Vous ne possédez pas l’autorisation : "
                            + codeModule
            );
        }
    }

    // =====================================================
    // EXIGER UTILISATEUR ACTIF
    // =====================================================

    public void exigerUtilisateurActif(
            Long utilisateurId
    ) {
        if (utilisateurId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant utilisateur obligatoire."
            );
        }

        if (!utilisateurActif(utilisateurId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Utilisateur introuvable ou compte inactif."
            );
        }
    }
    public boolean aAccesCategorie(
            Long utilisateurId,
            Long categorieId
    ) {
        if (
                utilisateurId == null
                        || categorieId == null
        ) {
            return false;
        }

        if (!utilisateurActif(utilisateurId)) {
            return false;
        }

        if (estAdministrateur(utilisateurId)) {
            return true;
        }

        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
    
                FROM utilisateur u
    
                JOIN role_categorie_evaluation_acces rca
                    ON rca.role_id = u.role_id
    
                JOIN categorie_evaluation ce
                    ON ce.id =
                       rca.categorie_evaluation_id
    
                WHERE u.id = ?
                  AND ce.id = ?
                  AND COALESCE(
                        ce.actif,
                        FALSE
                      ) = TRUE
                """,
                Long.class,
                utilisateurId,
                categorieId
        );

        return count != null && count > 0;
    }

    public void exigerAccesCategorie(
            Long utilisateurId,
            Long categorieId
    ) {
        exigerUtilisateurActif(
                utilisateurId
        );

        if (
                !aAccesCategorie(
                        utilisateurId,
                        categorieId
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Vous n’êtes pas autorisé à évaluer cette catégorie."
            );
        }
    }
}