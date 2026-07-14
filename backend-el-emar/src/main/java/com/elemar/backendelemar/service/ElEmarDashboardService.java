package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ElEmarDashboardService {

    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(
            Long typeIntervenantId,
            Long lotId,
            String decision,
            String search
    ) {
        FilterSql filter = buildFilter(typeIntervenantId, lotId, decision, search);

        DashboardStatsResponse stats = getStats(filter);
        enrichStatsWithConformite(stats, filter);

        return DashboardResponse.builder()
                .stats(stats)
                .scoreIntervenants(getScores(filter))
                .decisions(buildDecisions(stats))
                .zones(getZones(filter))
                .noteBands(getNoteBands(filter))
                .typesIntervenant(getTypesIntervenant())
                .lots(getLots(typeIntervenantId))
                .build();
    }

    private String baseCte(FilterSql filter) {
        return """
                WITH latest_eval AS (
                    SELECT DISTINCT ON (e.reponse_critere_id)
                        e.reponse_critere_id,
                        e.statut,
                        e.note_obtenue
                    FROM evaluation_critere e
                    ORDER BY e.reponse_critere_id, e.id DESC
                ),
                notes_calculees AS (
                    SELECT
                        ac.id AS application_candidature_id,
                        CASE
                            WHEN SUM(COALESCE(ce.points_max, 0)) > 0 THEN
                                ROUND(
                                    (
                                        SUM(COALESCE(le.note_obtenue, 0))
                                        / SUM(COALESCE(ce.points_max, 0))
                                    ) * 100,
                                    2
                                )
                            ELSE 0
                        END AS note_calculee
                    FROM application_candidature ac
                    LEFT JOIN reponse_critere rc ON rc.application_candidature_id = ac.id
                    LEFT JOIN critere_evaluation ce ON ce.id = rc.critere_evaluation_id
                    LEFT JOIN latest_eval le ON le.reponse_critere_id = rc.id
                    GROUP BY ac.id
                ),
                latest_zone AS (
                    SELECT DISTINCT ON (cz.application_candidature_id)
                        cz.application_candidature_id,
                        cz.zone_id
                    FROM classement_zone cz
                    ORDER BY cz.application_candidature_id, cz.id DESC
                ),
                base AS (
                    SELECT
                        ac.id AS application_candidature_id,
                        c.id AS candidature_id,
                        c.raison_sociale,
                        c.email_principal,

                        l.id AS lot_id,
                        l.nom_lot,

                        ti.id AS type_intervenant_id,
                        ti.libelle AS type_intervenant_libelle,

                        z.id AS zone_id,
                        z.nom_zone,

                        COALESCE(ac.note_finale, nc.note_calculee, 0) AS score,
                        CAST(ac.decision_finale AS TEXT) AS decision_finale

                    FROM application_candidature ac
                    JOIN candidature c ON c.id = ac.candidature_id
                    LEFT JOIN lot l ON l.id = ac.lot_id
                    LEFT JOIN type_intervenant ti ON ti.id = l.type_intervenant_id
                    LEFT JOIN notes_calculees nc ON nc.application_candidature_id = ac.id
                    LEFT JOIN latest_zone lz ON lz.application_candidature_id = ac.id
                    LEFT JOIN zone z ON z.id = lz.zone_id
                    WHERE 1 = 1
                """ + filter.where + """
                )
                """;
    }

    private DashboardStatsResponse getStats(FilterSql filter) {
        String sql = baseCte(filter) + """
                SELECT
                    COUNT(DISTINCT candidature_id) AS total_candidatures,
                    COUNT(application_candidature_id) AS total_applications,

                    COALESCE(SUM(
                        CASE
                            WHEN UPPER(COALESCE(decision_finale, 'EN_COURS'))
                            IN ('ADMIS', 'ACCEPTE', 'ACCEPTEE')
                            THEN 1 ELSE 0
                        END
                    ), 0) AS admis,

                    COALESCE(SUM(
                        CASE
                            WHEN UPPER(COALESCE(decision_finale, 'EN_COURS'))
                            IN ('REJETE', 'REJETEE', 'REFUSE')
                            THEN 1 ELSE 0
                        END
                    ), 0) AS rejetes,

                    COALESCE(SUM(
                        CASE
                            WHEN UPPER(COALESCE(decision_finale, 'EN_COURS'))
                            IN ('A_CORRIGER', 'CORRECTION', 'DEMANDE_CORRECTION')
                            THEN 1 ELSE 0
                        END
                    ), 0) AS a_corriger,

                    COALESCE(SUM(
                        CASE
                            WHEN decision_finale IS NULL
                              OR UPPER(COALESCE(decision_finale, 'EN_COURS'))
                              IN ('EN_COURS', 'SOUMIS', 'SOUMISE')
                            THEN 1 ELSE 0
                        END
                    ), 0) AS en_cours,

                    COALESCE(SUM(
                        CASE
                            WHEN COALESCE(score, 0) < 100
                            THEN 1 ELSE 0
                        END
                    ), 0) AS score_inferieur_100,

                    COALESCE(AVG(COALESCE(score, 0)), 0) AS moyenne_score
                FROM base
                """;

        return jdbcTemplate.queryForObject(
                sql,
                (rs, rowNum) -> DashboardStatsResponse.builder()
                        .totalCandidatures(rs.getLong("total_candidatures"))
                        .totalApplications(rs.getLong("total_applications"))
                        .admis(rs.getLong("admis"))
                        .rejetes(rs.getLong("rejetes"))
                        .aCorriger(rs.getLong("a_corriger"))
                        .enCours(rs.getLong("en_cours"))
                        .scoreInferieur100(rs.getLong("score_inferieur_100"))
                        .moyenneScore(rs.getBigDecimal("moyenne_score"))
                        .totalControles(0L)
                        .piecesConformes(0L)
                        .piecesNonConformes(0L)
                        .tauxConformite(BigDecimal.ZERO)
                        .build(),
                filter.args.toArray()
        );
    }

    private void enrichStatsWithConformite(DashboardStatsResponse stats, FilterSql filter) {
        String sql = baseCte(filter) + """
                SELECT
                    COUNT(le.statut) AS total_controles,

                    COALESCE(SUM(
                        CASE
                            WHEN UPPER(COALESCE(le.statut, '')) = 'CONFORME'
                            THEN 1 ELSE 0
                        END
                    ), 0) AS pieces_conformes,

                    COALESCE(SUM(
                        CASE
                            WHEN le.statut IS NOT NULL
                             AND UPPER(COALESCE(le.statut, '')) <> 'CONFORME'
                            THEN 1 ELSE 0
                        END
                    ), 0) AS pieces_non_conformes

                FROM base b
                JOIN reponse_critere rc
                    ON rc.application_candidature_id = b.application_candidature_id
                JOIN latest_eval le
                    ON le.reponse_critere_id = rc.id
                """;

        jdbcTemplate.queryForObject(
                sql,
                (rs, rowNum) -> {
                    long total = rs.getLong("total_controles");
                    long conformes = rs.getLong("pieces_conformes");
                    long nonConformes = rs.getLong("pieces_non_conformes");

                    stats.setTotalControles(total);
                    stats.setPiecesConformes(conformes);
                    stats.setPiecesNonConformes(nonConformes);

                    BigDecimal taux = total > 0
                            ? BigDecimal.valueOf(conformes)
                            .multiply(BigDecimal.valueOf(100))
                            .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;

                    stats.setTauxConformite(taux);

                    return stats;
                },
                filter.args.toArray()
        );
    }

    private List<DashboardScoreIntervenantResponse> getScores(FilterSql filter) {
        String sql = baseCte(filter) + """
                SELECT
                    candidature_id,
                    application_candidature_id,
                    raison_sociale,
                    email_principal,
                    lot_id,
                    nom_lot,
                    type_intervenant_id,
                    type_intervenant_libelle,
                    zone_id,
                    nom_zone,
                    score,
                    decision_finale
                FROM base
                ORDER BY score DESC, raison_sociale ASC
                LIMIT 50
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> DashboardScoreIntervenantResponse.builder()
                        .candidatureId(rs.getLong("candidature_id"))
                        .applicationCandidatureId(rs.getLong("application_candidature_id"))
                        .raisonSociale(rs.getString("raison_sociale"))
                        .email(rs.getString("email_principal"))
                        .lotId(rs.getObject("lot_id") != null ? rs.getLong("lot_id") : null)
                        .lotNom(rs.getString("nom_lot"))
                        .typeIntervenantId(rs.getObject("type_intervenant_id") != null ? rs.getLong("type_intervenant_id") : null)
                        .typeIntervenantLibelle(rs.getString("type_intervenant_libelle"))
                        .zoneId(rs.getObject("zone_id") != null ? rs.getLong("zone_id") : null)
                        .zoneNom(rs.getString("nom_zone"))
                        .score(rs.getBigDecimal("score"))
                        .decision(rs.getString("decision_finale"))
                        .build(),
                filter.args.toArray()
        );
    }

    private List<DashboardZoneResponse> getZones(FilterSql filter) {
        String sql = baseCte(filter) + """
                SELECT
                    COALESCE(zone_id, 0) AS zone_id,
                    COALESCE(nom_zone, 'Non classé') AS zone_nom,
                    COUNT(*) AS total
                FROM base
                GROUP BY COALESCE(zone_id, 0), COALESCE(nom_zone, 'Non classé')
                ORDER BY total DESC, zone_nom ASC
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> DashboardZoneResponse.builder()
                        .zoneId(rs.getLong("zone_id"))
                        .zoneNom(rs.getString("zone_nom"))
                        .count(rs.getLong("total"))
                        .build(),
                filter.args.toArray()
        );
    }

    private List<DashboardNoteBandResponse> getNoteBands(FilterSql filter) {
        String sql = baseCte(filter) + """
                SELECT 'SUP_80' AS code, '≥ 80 / 100' AS label,
                       COALESCE(SUM(CASE WHEN score >= 80 THEN 1 ELSE 0 END), 0) AS count
                FROM base

                UNION ALL

                SELECT 'BETWEEN_60_79' AS code, '60 - 79 / 100' AS label,
                       COALESCE(SUM(CASE WHEN score >= 60 AND score < 80 THEN 1 ELSE 0 END), 0) AS count
                FROM base

                UNION ALL

                SELECT 'INF_60' AS code, '< 60 / 100' AS label,
                       COALESCE(SUM(CASE WHEN score < 60 THEN 1 ELSE 0 END), 0) AS count
                FROM base
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> DashboardNoteBandResponse.builder()
                        .code(rs.getString("code"))
                        .label(rs.getString("label"))
                        .count(rs.getLong("count"))
                        .build(),
                filter.args.toArray()
        );
    }

    private List<DashboardDecisionResponse> buildDecisions(DashboardStatsResponse stats) {
        return List.of(
                DashboardDecisionResponse.builder()
                        .code("ADMIS")
                        .label("Admis")
                        .count(stats.getAdmis())
                        .build(),
                DashboardDecisionResponse.builder()
                        .code("EN_COURS")
                        .label("En cours")
                        .count(stats.getEnCours())
                        .build(),
                DashboardDecisionResponse.builder()
                        .code("A_CORRIGER")
                        .label("À corriger")
                        .count(stats.getACorriger())
                        .build(),
                DashboardDecisionResponse.builder()
                        .code("REJETES")
                        .label("Rejetés")
                        .count(stats.getRejetes())
                        .build()
        );
    }

    private List<DashboardOptionResponse> getTypesIntervenant() {
        String sql = """
                SELECT id, libelle
                FROM type_intervenant
                WHERE COALESCE(actif, true) = true
                ORDER BY libelle ASC
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> DashboardOptionResponse.builder()
                        .id(rs.getLong("id"))
                        .label(rs.getString("libelle"))
                        .build()
        );
    }

    private List<DashboardOptionResponse> getLots(Long typeIntervenantId) {
        String sql;
        Object[] args;

        if (typeIntervenantId != null) {
            sql = """
                    SELECT id, nom_lot
                    FROM lot
                    WHERE COALESCE(actif, true) = true
                      AND type_intervenant_id = ?
                    ORDER BY nom_lot ASC
                    """;
            args = new Object[]{typeIntervenantId};
        } else {
            sql = """
                    SELECT id, nom_lot
                    FROM lot
                    WHERE COALESCE(actif, true) = true
                    ORDER BY nom_lot ASC
                    """;
            args = new Object[]{};
        }

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> DashboardOptionResponse.builder()
                        .id(rs.getLong("id"))
                        .label(rs.getString("nom_lot"))
                        .build(),
                args
        );
    }

    private FilterSql buildFilter(
            Long typeIntervenantId,
            Long lotId,
            String decision,
            String search
    ) {
        StringBuilder where = new StringBuilder();
        List<Object> args = new ArrayList<>();

        if (typeIntervenantId != null) {
            where.append(" AND ti.id = ? ");
            args.add(typeIntervenantId);
        }

        if (lotId != null) {
            where.append(" AND l.id = ? ");
            args.add(lotId);
        }

        if (decision != null && !decision.trim().isEmpty() && !"ALL".equalsIgnoreCase(decision)) {
            String value = decision.trim().toUpperCase();

            if ("ADMIS".equals(value)) {
                where.append("""
                        AND UPPER(COALESCE(CAST(ac.decision_finale AS TEXT), 'EN_COURS'))
                        IN ('ADMIS', 'ACCEPTE', 'ACCEPTEE')
                        """);
            } else if ("REJETES".equals(value)) {
                where.append("""
                        AND UPPER(COALESCE(CAST(ac.decision_finale AS TEXT), 'EN_COURS'))
                        IN ('REJETE', 'REJETEE', 'REFUSE')
                        """);
            } else if ("A_CORRIGER".equals(value)) {
                where.append("""
                        AND UPPER(COALESCE(CAST(ac.decision_finale AS TEXT), 'EN_COURS'))
                        IN ('A_CORRIGER', 'CORRECTION', 'DEMANDE_CORRECTION')
                        """);
            } else if ("EN_COURS".equals(value)) {
                where.append("""
                        AND (
                            ac.decision_finale IS NULL
                            OR UPPER(COALESCE(CAST(ac.decision_finale AS TEXT), 'EN_COURS'))
                            IN ('EN_COURS', 'SOUMIS', 'SOUMISE')
                        )
                        """);
            }
        }

        if (search != null && !search.trim().isEmpty()) {
            String term = "%" + search.trim().toLowerCase() + "%";

            where.append("""
                    AND (
                        LOWER(COALESCE(c.raison_sociale, '')) LIKE ?
                        OR LOWER(COALESCE(c.email_principal, '')) LIKE ?
                        OR LOWER(COALESCE(l.nom_lot, '')) LIKE ?
                        OR LOWER(COALESCE(ti.libelle, '')) LIKE ?
                        OR LOWER(COALESCE(z.nom_zone, '')) LIKE ?
                    )
                    """);

            args.add(term);
            args.add(term);
            args.add(term);
            args.add(term);
            args.add(term);
        }

        return new FilterSql(where.toString(), args);
    }

    private record FilterSql(String where, List<Object> args) {
    }
}