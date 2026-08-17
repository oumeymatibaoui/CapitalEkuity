package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.RoleCategorieAccessResponse;
import com.elemar.backendelemar.dto.UpdateRoleCategoriesRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.PreparedStatement;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RoleCategorieAccessService {

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedJdbcTemplate;

    @Transactional(readOnly = true)
    public List<RoleCategorieAccessResponse> getCategoriesByRole(
            Long roleId
    ) {
        verifyRole(roleId);

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
                    ce.ordre_affichage,
                    CASE
                        WHEN rca.role_id IS NULL THEN FALSE
                        ELSE TRUE
                    END AS autorise
                FROM categorie_evaluation ce
                LEFT JOIN type_intervenant ti
                    ON ti.id = ce.type_intervenant_id
                LEFT JOIN lot l
                    ON l.id = ce.lot_id
                LEFT JOIN role_categorie_evaluation_acces rca
                    ON rca.categorie_evaluation_id = ce.id
                   AND rca.role_id = ?
                WHERE COALESCE(ce.actif, FALSE) = TRUE
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
                                rs.getBoolean("autorise")
                        ),
                roleId
        );
    }

    /**
     * La liste reçue représente l'état final des catégories du rôle.
     * Une liste vide retire toutes les catégories du rôle.
     */
    @Transactional
    public List<RoleCategorieAccessResponse> updateCategoriesForRole(
            Long roleId,
            UpdateRoleCategoriesRequest request
    ) {
        verifyRole(roleId);

        Set<Long> requestedIds = normalizeIds(
                request == null
                        ? null
                        : request.categorieIds()
        );

        verifyActiveCategories(requestedIds);

        Set<Long> existingIds = new HashSet<>(
                jdbcTemplate.queryForList(
                        """
                        SELECT categorie_evaluation_id
                        FROM role_categorie_evaluation_acces
                        WHERE role_id = ?
                        """,
                        Long.class,
                        roleId
                )
        );

        Set<Long> idsToDelete = new HashSet<>(existingIds);
        idsToDelete.removeAll(requestedIds);

        Set<Long> idsToInsert = new HashSet<>(requestedIds);
        idsToInsert.removeAll(existingIds);

        deleteAccess(roleId, idsToDelete);
        insertAccess(roleId, idsToInsert);

        return getCategoriesByRole(roleId);
    }

    /**
     * Utilisé avant la suppression définitive d'un rôle.
     */
    @Transactional
    public void deleteAllForRole(Long roleId) {
        if (roleId == null || roleId <= 0) {
            return;
        }

        jdbcTemplate.update(
                """
                DELETE FROM role_categorie_evaluation_acces
                WHERE role_id = ?
                """,
                roleId
        );
    }

    private void verifyRole(Long roleId) {
        if (roleId == null || roleId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant du rôle obligatoire."
            );
        }

        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM role_acces
                WHERE id = ?
                """,
                Long.class,
                roleId
        );

        if (count == null || count == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Rôle introuvable."
            );
        }
    }

    private void verifyActiveCategories(
            Set<Long> requestedIds
    ) {
        if (requestedIds.isEmpty()) {
            return;
        }

        List<Long> foundIds = namedJdbcTemplate.queryForList(
                """
                SELECT ce.id
                FROM categorie_evaluation ce
                LEFT JOIN type_intervenant ti
                    ON ti.id = ce.type_intervenant_id
                LEFT JOIN lot l
                    ON l.id = ce.lot_id
                WHERE ce.id IN (:ids)
                  AND COALESCE(ce.actif, FALSE) = TRUE
                  AND (
                        ti.id IS NULL
                        OR COALESCE(ti.actif, FALSE) = TRUE
                      )
                  AND (
                        l.id IS NULL
                        OR COALESCE(l.actif, FALSE) = TRUE
                      )
                """,
                new MapSqlParameterSource(
                        "ids",
                        requestedIds
                ),
                Long.class
        );

        Set<Long> validIds = new HashSet<>(foundIds);

        if (!validIds.equals(requestedIds)) {
            Set<Long> invalidIds = new HashSet<>(requestedIds);
            invalidIds.removeAll(validIds);

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Catégories inactives ou inexistantes : "
                            + invalidIds
            );
        }
    }

    private Set<Long> normalizeIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptySet();
        }

        Set<Long> result = new HashSet<>();

        for (Long id : ids) {
            if (id != null && id > 0) {
                result.add(id);
            }
        }

        return result;
    }

    private void insertAccess(
            Long roleId,
            Set<Long> categoryIds
    ) {
        if (categoryIds.isEmpty()) {
            return;
        }

        List<Long> ids = List.copyOf(categoryIds);

        jdbcTemplate.batchUpdate(
                """
                INSERT INTO role_categorie_evaluation_acces
                (
                    role_id,
                    categorie_evaluation_id
                )
                SELECT ?, ?
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM role_categorie_evaluation_acces
                    WHERE role_id = ?
                      AND categorie_evaluation_id = ?
                )
                """,
                ids,
                ids.size(),
                (
                        PreparedStatement statement,
                        Long categoryId
                ) -> {
                    statement.setLong(1, roleId);
                    statement.setLong(2, categoryId);
                    statement.setLong(3, roleId);
                    statement.setLong(4, categoryId);
                }
        );
    }

    private void deleteAccess(
            Long roleId,
            Set<Long> categoryIds
    ) {
        if (categoryIds.isEmpty()) {
            return;
        }

        List<Long> ids = List.copyOf(categoryIds);

        jdbcTemplate.batchUpdate(
                """
                DELETE FROM role_categorie_evaluation_acces
                WHERE role_id = ?
                  AND categorie_evaluation_id = ?
                """,
                ids,
                ids.size(),
                (
                        PreparedStatement statement,
                        Long categoryId
                ) -> {
                    statement.setLong(1, roleId);
                    statement.setLong(2, categoryId);
                }
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
}
