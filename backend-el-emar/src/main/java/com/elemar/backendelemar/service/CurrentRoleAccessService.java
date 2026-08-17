package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.CurrentRoleAccessResponse;
import com.elemar.backendelemar.dto.ModuleAccessResponse;
import com.elemar.backendelemar.dto.RoleCategorieAccessResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CurrentRoleAccessService {

    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public CurrentRoleAccessResponse getCurrentAccess(
            Long utilisateurId
    ) {
        if (utilisateurId == null || utilisateurId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Utilisateur non authentifié."
            );
        }

        UserRoleRow userRole = jdbcTemplate.query(
                """
                SELECT
                    u.id AS utilisateur_id,
                    u.role_id,
                    r.code_role,
                    r.nom_role
                FROM utilisateur u
                JOIN role_acces r
                    ON r.id = u.role_id
                WHERE u.id = ?
                  AND COALESCE(u.actif, FALSE) = TRUE
                  AND COALESCE(r.actif, FALSE) = TRUE
                LIMIT 1
                """,
                rs -> rs.next()
                        ? new UserRoleRow(
                        rs.getLong("utilisateur_id"),
                        rs.getLong("role_id"),
                        rs.getString("code_role"),
                        rs.getString("nom_role")
                )
                        : null,
                utilisateurId
        );

        if (userRole == null) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Aucun rôle actif n'est associé au compte connecté."
            );
        }

        List<ModuleAccessResponse> modules = loadAuthorizedModules(
                userRole.roleId()
        );

        List<RoleCategorieAccessResponse> categories =
                loadAuthorizedCategories(
                        userRole.roleId()
                );

        return new CurrentRoleAccessResponse(
                userRole.utilisateurId(),
                userRole.roleId(),
                normalize(userRole.roleCode()),
                userRole.roleNom(),
                modules,
                categories
        );
    }

    private List<ModuleAccessResponse> loadAuthorizedModules(
            Long roleId
    ) {
        String sql = """
                SELECT
                    m.id AS module_id,
                    m.code_module,
                    m.libelle,
                    m.description,
                    m.groupe,
                    m.route_front,
                    m.icone,
                    m.ordre_groupe,
                    m.ordre_module
                FROM role_module_acces rma
                JOIN module_navbar m
                    ON m.id = rma.module_id
                WHERE rma.role_id = ?
                  AND COALESCE(rma.autorise, FALSE) = TRUE
                  AND COALESCE(m.actif, FALSE) = TRUE
                ORDER BY
                    COALESCE(m.ordre_groupe, 0),
                    COALESCE(m.ordre_module, 0),
                    m.id
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    ModuleAccessResponse response =
                            new ModuleAccessResponse();

                    response.setModuleId(
                            rs.getLong("module_id")
                    );
                    response.setCodeModule(
                            rs.getString("code_module")
                    );
                    response.setLibelle(
                            rs.getString("libelle")
                    );
                    response.setDescription(
                            rs.getString("description")
                    );
                    response.setGroupe(
                            rs.getString("groupe")
                    );
                    response.setRouteFront(
                            rs.getString("route_front")
                    );
                    response.setIcone(
                            rs.getString("icone")
                    );
                    response.setOrdreGroupe(
                            nullableInteger(
                                    rs.getObject("ordre_groupe")
                            )
                    );
                    response.setOrdreModule(
                            nullableInteger(
                                    rs.getObject("ordre_module")
                            )
                    );
                    response.setAutorise(true);

                    return response;
                },
                roleId
        );
    }

    private List<RoleCategorieAccessResponse>
    loadAuthorizedCategories(
            Long roleId
    ) {
        String sql = """
                SELECT
                    ce.id AS categorie_id,
                    ce.type_intervenant_id,
                    COALESCE(
                        ti.libelle,
                        'Type non renseigné'
                    ) AS type_intervenant_libelle,
                    ce.lot_id,
                    CASE
                        WHEN ce.lot_id IS NULL
                            THEN 'Catégories communes'
                        ELSE COALESCE(
                            l.nom_lot,
                            'Domaine non renseigné'
                        )
                    END AS lot_nom,
                    ce.code,
                    ce.libelle,
                    ce.description,
                    ce.ordre_affichage
                FROM role_categorie_evaluation_acces rca
                JOIN categorie_evaluation ce
                    ON ce.id = rca.categorie_evaluation_id
                LEFT JOIN type_intervenant ti
                    ON ti.id = ce.type_intervenant_id
                LEFT JOIN lot l
                    ON l.id = ce.lot_id
                WHERE rca.role_id = ?
                  AND COALESCE(ce.actif, FALSE) = TRUE
                  AND (
                        ti.id IS NULL
                        OR COALESCE(ti.actif, FALSE) = TRUE
                      )
                  AND (
                        l.id IS NULL
                        OR COALESCE(l.actif, FALSE) = TRUE
                      )
                ORDER BY
                    COALESCE(ti.libelle, ''),
                    CASE
                        WHEN ce.lot_id IS NULL THEN 0
                        ELSE 1
                    END,
                    COALESCE(l.nom_lot, ''),
                    COALESCE(ce.ordre_affichage, 0),
                    ce.libelle,
                    ce.id
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) ->
                        new RoleCategorieAccessResponse(
                                rs.getLong("categorie_id"),
                                nullableLong(
                                        rs.getObject(
                                                "type_intervenant_id"
                                        )
                                ),
                                rs.getString(
                                        "type_intervenant_libelle"
                                ),
                                nullableLong(
                                        rs.getObject("lot_id")
                                ),
                                rs.getString("lot_nom"),
                                rs.getString("code"),
                                rs.getString("libelle"),
                                rs.getString("description"),
                                nullableInteger(
                                        rs.getObject(
                                                "ordre_affichage"
                                        )
                                ),
                                true
                        ),
                roleId
        );
    }

    private Long nullableLong(Object value) {
        return value == null
                ? null
                : ((Number) value).longValue();
    }

    private Integer nullableInteger(Object value) {
        return value == null
                ? null
                : ((Number) value).intValue();
    }

    private String normalize(String value) {
        return value == null
                ? ""
                : value.trim().toUpperCase();
    }

    private record UserRoleRow(
            Long utilisateurId,
            Long roleId,
            String roleCode,
            String roleNom
    ) {
    }
}
