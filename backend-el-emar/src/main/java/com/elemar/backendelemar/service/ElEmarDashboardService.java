package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.DashboardResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardActivityResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardAlertResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardCommitteeStatsResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardConfigurationStatsResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardContextResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardDecisionResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardEvaluationStatsResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardIntervenantResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardItStatsResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardNoteBandResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardOptionResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardOverviewResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardQuickActionResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardZoneResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ElEmarDashboardService {

    private static final String ADMIN = "ADMIN";
    private static final String IT = "IT";
    private static final String ACHAT = "ACHAT";
    private static final String TECHNIQUE = "TECHNIQUE";
    private static final String COMITE = "COMITE";

    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(
            Long authenticatedUserId,
            Long typeIntervenantId,
            Long lotId,
            String decision,
            String search
    ) {
        DashboardContextResponse context = loadContext(authenticatedUserId);
        String profile = context.getProfile();
        boolean admin = context.isAdmin();

        DataFilter filter = buildDataFilter(
                typeIntervenantId,
                lotId,
                decision,
                search,
                profile,
                authenticatedUserId,
                admin
        );

        DashboardOverviewResponse overview = IT.equals(profile)
                ? emptyOverview()
                : getOverview(filter);

        DashboardItStatsResponse itStats = admin || IT.equals(profile)
                ? getItStats()
                : emptyItStats();

        DashboardConfigurationStatsResponse configurationStats = admin || ACHAT.equals(profile)
                ? getConfigurationStats()
                : emptyConfigurationStats();

        DashboardEvaluationStatsResponse evaluationStats = admin || TECHNIQUE.equals(profile)
                ? getEvaluationStats(authenticatedUserId, admin, filter)
                : emptyEvaluationStats();

        DashboardCommitteeStatsResponse committeeStats = admin || COMITE.equals(profile)
                ? getCommitteeStats(filter)
                : emptyCommitteeStats();

        List<DashboardIntervenantResponse> intervenants = IT.equals(profile)
                ? List.of()
                : getIntervenants(filter);

        List<DashboardDecisionResponse> decisions = admin || COMITE.equals(profile)
                ? buildDecisions(committeeStats)
                : List.of();

        List<DashboardZoneResponse> zones = admin || COMITE.equals(profile)
                ? getZones(filter)
                : List.of();

        List<DashboardNoteBandResponse> noteBands = admin || TECHNIQUE.equals(profile) || COMITE.equals(profile)
                ? getNoteBands(filter)
                : List.of();

        return DashboardResponse.builder()
                .context(context)
                .overview(overview)
                .it(itStats)
                .configuration(configurationStats)
                .evaluation(evaluationStats)
                .committee(committeeStats)
                .alerts(buildAlerts(
                        profile,
                        itStats,
                        configurationStats,
                        evaluationStats,
                        committeeStats
                ))
                .activities(getRecentActivities(
                        authenticatedUserId,
                        admin || IT.equals(profile)
                ))
                .quickActions(getAuthorizedQuickActions(context, profile))
                .intervenants(intervenants)
                .decisions(decisions)
                .zones(zones)
                .noteBands(noteBands)
                .typesIntervenant(IT.equals(profile) ? List.of() : getTypesIntervenant())
                .lots(IT.equals(profile) ? List.of() : getLots(typeIntervenantId))
                .build();
    }

    // =====================================================
    // CONTEXTE ET PROFIL
    // =====================================================

    private DashboardContextResponse loadContext(Long authenticatedUserId) {
        if (authenticatedUserId == null || authenticatedUserId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Utilisateur non authentifié."
            );
        }

        String sql = """
                SELECT
                    u.id AS utilisateur_id,
                    u.nom,
                    u.email,
                    COALESCE(u.actif, FALSE) AS actif,
                    CAST(u.statut_compte AS TEXT) AS statut_compte,
                    CAST(u.type_utilisateur AS TEXT) AS type_utilisateur,
                    r.id AS role_id,
                    r.code_role,
                    r.nom_role
                FROM utilisateur u
                LEFT JOIN role_acces r
                  ON r.id = u.role_id
                 AND COALESCE(r.actif, TRUE) = TRUE
                WHERE u.id = ?
                LIMIT 1
                """;

        List<UserContextRow> rows = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    String typeUtilisateur = normalize(rs.getString("type_utilisateur"));
                    String roleCode = normalize(rs.getString("code_role"));
                    String profile = resolveProfile(roleCode, typeUtilisateur);

                    DashboardContextResponse context = DashboardContextResponse.builder()
                            .utilisateurId(rs.getLong("utilisateur_id"))
                            .nom(rs.getString("nom"))
                            .email(rs.getString("email"))
                            .typeUtilisateur(typeUtilisateur)
                            .roleId(nullableLong(rs, "role_id"))
                            .roleCode(roleCode.isBlank() ? typeUtilisateur : roleCode)
                            .roleNom(rs.getString("nom_role"))
                            .profile(profile)
                            .admin(ADMIN.equals(profile))
                            .build();

                    boolean active = rs.getBoolean("actif")
                            && "ACTIF".equals(normalize(rs.getString("statut_compte")));

                    return new UserContextRow(context, active);
                },
                authenticatedUserId
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Aucun compte ne correspond à l'identifiant contenu dans le JWT."
            );
        }

        UserContextRow row = rows.get(0);

        if (!row.active()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Le compte connecté n'est pas actif."
            );
        }

        if ("CND".equals(row.context().getTypeUtilisateur())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Le tableau de bord interne n'est pas accessible aux intervenants."
            );
        }

        return row.context();
    }

    private String resolveProfile(String roleCode, String typeUtilisateur) {
        String role = normalize(roleCode);

        return switch (role) {
            case ADMIN -> ADMIN;
            case IT -> IT;
            case "DA", ACHAT -> ACHAT;
            case "EVALUATEUR", TECHNIQUE -> TECHNIQUE;
            case "DECIDEUR", COMITE -> COMITE;
            default -> switch (normalize(typeUtilisateur)) {
                case ADMIN -> ADMIN;
                case IT -> IT;
                case "DA" -> ACHAT;
                case "EL_EMAR" -> TECHNIQUE;
                default -> throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Profil interne non pris en charge."
                );
            };
        };
    }

    // =====================================================
    // BASE ACTIVE PARTAGÉE
    // =====================================================

    private String baseCte(DataFilter filter) {
        return """
                WITH active_intervenants AS (
                    SELECT
                        c.*,
                        COALESCE(
                            NULLIF(TRIM(c.raison_sociale), ''),
                            NULLIF(TRIM(c.nom_entreprise), ''),
                            'Intervenant'
                        ) AS display_name
                    FROM candidature c
                    WHERE COALESCE(c.actif, TRUE) = TRUE
                      AND COALESCE(c.acces_bloque, FALSE) = FALSE
                      AND NOT EXISTS (
                          SELECT 1
                          FROM utilisateur cu
                          WHERE cu.candidature_id = c.id
                            AND CAST(cu.type_utilisateur AS TEXT) = 'CND'
                            AND (
                                COALESCE(cu.actif, FALSE) = FALSE
                                OR CAST(cu.statut_compte AS TEXT) <> 'ACTIF'
                            )
                      )
                ),
                active_lots AS (
                    SELECT
                        l.id,
                        l.code_lot,
                        l.nom_lot,
                        l.type_intervenant_id,
                        ti.libelle AS type_intervenant_libelle
                    FROM lot l
                    JOIN type_intervenant ti
                      ON ti.id = l.type_intervenant_id
                    WHERE COALESCE(l.actif, TRUE) = TRUE
                      AND COALESCE(ti.actif, TRUE) = TRUE
                ),
                active_grids AS (
                    SELECT g.*
                    FROM grille_evaluation_lot g
                    JOIN active_lots al ON al.id = g.lot_id
                    WHERE COALESCE(g.actif, TRUE) = TRUE
                ),
                active_criteria AS (
                    SELECT cr.*
                    FROM critere_evaluation cr
                    JOIN active_grids ag
                      ON ag.id = cr.grille_evaluation_lot_id
                     AND ag.lot_id = cr.lot_id
                    JOIN active_lots al ON al.id = cr.lot_id
                    LEFT JOIN categorie_evaluation ce
                      ON ce.id = cr.categorie_evaluation_id
                    WHERE COALESCE(cr.actif, TRUE) = TRUE
                      AND (
                          cr.categorie_evaluation_id IS NULL
                          OR (
                              COALESCE(ce.actif, TRUE) = TRUE
                              AND ce.type_intervenant_id = al.type_intervenant_id
                              AND (ce.lot_id = al.id OR ce.lot_id IS NULL)
                          )
                      )
                ),
                latest_eval AS (
                    SELECT DISTINCT ON (e.reponse_critere_id)
                        e.reponse_critere_id,
                        e.statut,
                        e.note_obtenue,
                        e.updated_at
                    FROM evaluation_critere e
                    ORDER BY e.reponse_critere_id, e.id DESC
                ),
                criteria_totals AS (
                    SELECT
                        ac.lot_id,
                        COALESCE(SUM(ac.points_max), 0) AS total_points
                    FROM active_criteria ac
                    GROUP BY ac.lot_id
                ),
                notes_obtenues AS (
                    SELECT
                        rc.application_candidature_id,
                        COALESCE(SUM(le.note_obtenue), 0) AS points_obtenus
                    FROM reponse_critere rc
                    JOIN active_criteria ac
                      ON ac.id = rc.critere_evaluation_id
                    LEFT JOIN latest_eval le
                      ON le.reponse_critere_id = rc.id
                    GROUP BY rc.application_candidature_id
                ),
                latest_zone AS (
                    SELECT DISTINCT ON (cz.application_candidature_id)
                        cz.application_candidature_id,
                        cz.zone_id,
                        cz.categorie
                    FROM classement_zone cz
                    WHERE COALESCE(cz.actif, TRUE) = TRUE
                    ORDER BY cz.application_candidature_id, cz.id DESC
                ),
                base AS (
                    SELECT
                        cl.id AS candidature_lot_id,
                        c.id AS candidature_id,
                        c.display_name AS raison_sociale,
                        c.email_principal,
                        c.type_intervenant_id AS candidature_type_id,
                        al.id AS lot_id,
                        al.nom_lot,
                        al.type_intervenant_id,
                        al.type_intervenant_libelle,
                        app.id AS application_candidature_id,
                        CAST(app.statut AS TEXT) AS statut_application,
                        app.note_finale,
                        CAST(app.decision_finale AS TEXT) AS decision_finale,
                        z.id AS zone_id,
                        z.nom_zone,
                        lz.categorie AS classement,
                        CASE
                            WHEN app.note_finale IS NOT NULL THEN app.note_finale
                            WHEN app.id IS NOT NULL
                                 AND COALESCE(ct.total_points, 0) > 0
                                THEN ROUND(
                                    (COALESCE(no.points_obtenus, 0) / ct.total_points) * 100,
                                    2
                                )
                            ELSE 0
                        END AS score,
                        CASE
                            WHEN app.id IS NULL THEN 'NON_DEMARRE'
                            WHEN app.note_finale IS NOT NULL THEN 'TERMINEE'
                            WHEN CAST(app.statut AS TEXT) IN ('EN_NOTATION', 'EN_VERIFICATION', 'EN_COURS')
                                THEN 'EN_COURS'
                            WHEN CAST(app.statut AS TEXT) IN ('SOUMIS', 'A_CORRIGER')
                                THEN CAST(app.statut AS TEXT)
                            ELSE 'A_TRAITER'
                        END AS statut_evaluation
                    FROM candidature_lot cl
                    JOIN active_intervenants c
                      ON c.id = cl.candidature_id
                    JOIN active_lots al
                      ON al.id = cl.lot_id
                    LEFT JOIN LATERAL (
                        SELECT ac1.*
                        FROM application_candidature ac1
                        WHERE ac1.candidature_id = cl.candidature_id
                          AND ac1.lot_id = cl.lot_id
                        ORDER BY ac1.id DESC
                        LIMIT 1
                    ) app ON TRUE
                    LEFT JOIN criteria_totals ct
                      ON ct.lot_id = al.id
                    LEFT JOIN notes_obtenues no
                      ON no.application_candidature_id = app.id
                    LEFT JOIN latest_zone lz
                      ON lz.application_candidature_id = app.id
                    LEFT JOIN zone z
                      ON z.id = lz.zone_id
                    WHERE COALESCE(cl.actif, TRUE) = TRUE
                """ + filter.where() + """
                )
                """;
    }

    private DataFilter buildDataFilter(
            Long typeIntervenantId,
            Long lotId,
            String decision,
            String search,
            String profile,
            Long utilisateurId,
            boolean admin
    ) {
        StringBuilder where = new StringBuilder();
        List<Object> args = new ArrayList<>();

        if (typeIntervenantId != null && typeIntervenantId > 0) {
            where.append(" AND al.type_intervenant_id = ? ");
            args.add(typeIntervenantId);
        }

        if (lotId != null && lotId > 0) {
            where.append(" AND al.id = ? ");
            args.add(lotId);
        }

        String normalizedDecision = normalize(decision);

        if (!normalizedDecision.isBlank() && !"ALL".equals(normalizedDecision)) {
            switch (normalizedDecision) {
                case "ADMIS" -> where.append(" AND CAST(app.decision_finale AS TEXT) = 'ADMIS' ");
                case "REJETE", "REJETES" -> where.append(
                        " AND CAST(app.decision_finale AS TEXT) IN ('REJETE', 'IRRECEVABLE') "
                );
                case "A_CORRIGER" -> where.append(
                        " AND CAST(app.decision_finale AS TEXT) = 'A_CORRIGER' "
                );
                case "EN_COURS" -> where.append(
                        " AND app.id IS NOT NULL AND app.decision_finale IS NULL "
                );
                default -> throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Filtre de décision invalide."
                );
            }
        }

        if (search != null && !search.isBlank()) {
            String term = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
            where.append("""
                    AND (
                        LOWER(COALESCE(c.display_name, '')) LIKE ?
                        OR LOWER(COALESCE(c.email_principal, '')) LIKE ?
                        OR LOWER(COALESCE(al.nom_lot, '')) LIKE ?
                        OR LOWER(COALESCE(al.type_intervenant_libelle, '')) LIKE ?
                        OR LOWER(COALESCE(z.nom_zone, '')) LIKE ?
                    )
                    """);
            args.add(term);
            args.add(term);
            args.add(term);
            args.add(term);
            args.add(term);
        }

        if (!admin && (TECHNIQUE.equals(profile) || COMITE.equals(profile))) {
            where.append("""
                    AND EXISTS (
                        SELECT 1
                        FROM workflow_etape_el_emar ws
                        WHERE ws.candidature_id = c.id
                          AND ws.utilisateur_affecte_id = ?
                          AND ws.statut <> 'ANNULEE'
                    )
                    """);
            args.add(utilisateurId);
        }

        return new DataFilter(where.toString(), args);
    }

    // =====================================================
    // SYNTHÈSE ACTIVE
    // =====================================================

    private DashboardOverviewResponse getOverview(DataFilter filter) {
        String sql = baseCte(filter) + """
                SELECT
                    COUNT(DISTINCT candidature_id) AS intervenants_actifs,
                    COUNT(DISTINCT application_candidature_id) AS dossiers_actifs,
                    COUNT(DISTINCT application_candidature_id) FILTER (
                        WHERE statut_evaluation IN ('EN_COURS', 'SOUMIS', 'A_TRAITER')
                    ) AS evaluations_en_cours,
                    COUNT(DISTINCT application_candidature_id) FILTER (
                        WHERE note_finale IS NOT NULL
                          AND decision_finale IS NULL
                    ) AS decisions_en_attente,
                    COUNT(DISTINCT application_candidature_id) FILTER (
                        WHERE decision_finale = 'ADMIS'
                          AND zone_id IS NULL
                    ) AS classements_en_attente,
                    COALESCE(
                        AVG(score) FILTER (WHERE application_candidature_id IS NOT NULL),
                        0
                    ) AS note_moyenne
                FROM base
                """;

        DashboardOverviewResponse result = jdbcTemplate.queryForObject(
                sql,
                (rs, rowNum) -> DashboardOverviewResponse.builder()
                        .intervenantsActifs(rs.getLong("intervenants_actifs"))
                        .dossiersActifs(rs.getLong("dossiers_actifs"))
                        .evaluationsEnCours(rs.getLong("evaluations_en_cours"))
                        .decisionsEnAttente(rs.getLong("decisions_en_attente"))
                        .classementsEnAttente(rs.getLong("classements_en_attente"))
                        .noteMoyenne(defaultDecimal(rs.getBigDecimal("note_moyenne")))
                        .build(),
                filter.args().toArray()
        );

        return result == null ? emptyOverview() : result;
    }

    // =====================================================
    // DÉPARTEMENT IT
    // =====================================================

    private DashboardItStatsResponse getItStats() {
        String sql = """
                WITH active_internal_users AS (
                    SELECT u.*
                    FROM utilisateur u
                    WHERE CAST(u.type_utilisateur AS TEXT) <> 'CND'
                      AND COALESCE(u.actif, FALSE) = TRUE
                      AND CAST(u.statut_compte AS TEXT) = 'ACTIF'
                ),
                active_roles AS (
                    SELECT r.*
                    FROM role_acces r
                    WHERE COALESCE(r.actif, TRUE) = TRUE
                ),
                active_modules AS (
                    SELECT m.*
                    FROM module_navbar m
                    WHERE COALESCE(m.actif, TRUE) = TRUE
                )
                SELECT
                    (SELECT COUNT(*) FROM active_internal_users) AS utilisateurs_actifs,
                    (SELECT COUNT(*) FROM active_roles) AS roles_actifs,
                    (SELECT COUNT(*) FROM active_modules) AS modules_actifs,
                    (
                        SELECT COUNT(*)
                        FROM active_internal_users u
                        LEFT JOIN active_roles r ON r.id = u.role_id
                        WHERE r.id IS NULL
                    ) AS utilisateurs_sans_role,
                    (
                        SELECT COUNT(*)
                        FROM active_roles r
                        WHERE NOT EXISTS (
                            SELECT 1
                            FROM role_module_acces rma
                            JOIN active_modules m ON m.id = rma.module_id
                            WHERE rma.role_id = r.id
                              AND COALESCE(rma.autorise, FALSE) = TRUE
                        )
                    ) AS roles_sans_acces
                """;

        DashboardItStatsResponse result = jdbcTemplate.queryForObject(
                sql,
                (rs, rowNum) -> DashboardItStatsResponse.builder()
                        .utilisateursActifs(rs.getLong("utilisateurs_actifs"))
                        .rolesActifs(rs.getLong("roles_actifs"))
                        .modulesActifs(rs.getLong("modules_actifs"))
                        .utilisateursSansRole(rs.getLong("utilisateurs_sans_role"))
                        .rolesSansAcces(rs.getLong("roles_sans_acces"))
                        .build()
        );

        return result == null ? emptyItStats() : result;
    }

    // =====================================================
    // DÉPARTEMENT ACHAT / CONFIGURATION
    // =====================================================

    private DashboardConfigurationStatsResponse getConfigurationStats() {
        String sql = """
                WITH active_types AS (
                    SELECT ti.*
                    FROM type_intervenant ti
                    WHERE COALESCE(ti.actif, TRUE) = TRUE
                ),
                active_lots AS (
                    SELECT l.*
                    FROM lot l
                    JOIN active_types ti ON ti.id = l.type_intervenant_id
                    WHERE COALESCE(l.actif, TRUE) = TRUE
                ),
                active_categories AS (
                    SELECT ce.*
                    FROM categorie_evaluation ce
                    JOIN active_types ti ON ti.id = ce.type_intervenant_id
                    LEFT JOIN active_lots l ON l.id = ce.lot_id
                    WHERE COALESCE(ce.actif, TRUE) = TRUE
                      AND (ce.lot_id IS NULL OR l.id IS NOT NULL)
                ),
                active_grids AS (
                    SELECT g.*
                    FROM grille_evaluation_lot g
                    JOIN active_lots l ON l.id = g.lot_id
                    WHERE COALESCE(g.actif, TRUE) = TRUE
                ),
                active_criteria_raw AS (
                    SELECT
                        cr.*,
                        CASE
                            WHEN cr.categorie_evaluation_id IS NULL THEN FALSE
                            WHEN ac.id IS NULL THEN FALSE
                            ELSE TRUE
                        END AS categorie_valide
                    FROM critere_evaluation cr
                    JOIN active_grids g
                      ON g.id = cr.grille_evaluation_lot_id
                     AND g.lot_id = cr.lot_id
                    LEFT JOIN active_categories ac
                      ON ac.id = cr.categorie_evaluation_id
                    WHERE COALESCE(cr.actif, TRUE) = TRUE
                ),
                grid_quality AS (
                    SELECT
                        g.id AS grille_id,
                        g.lot_id,
                        g.total_points,
                        COUNT(cr.id) AS critere_count,
                        COALESCE(SUM(cr.points_max), 0) AS somme_criteres
                    FROM active_grids g
                    LEFT JOIN active_criteria_raw cr
                      ON cr.grille_evaluation_lot_id = g.id
                    GROUP BY g.id, g.lot_id, g.total_points
                )
                SELECT
                    (SELECT COUNT(*) FROM active_types) AS types_actifs,
                    (SELECT COUNT(*) FROM active_lots) AS lots_actifs,
                    (SELECT COUNT(*) FROM active_categories) AS categories_actives,
                    (SELECT COUNT(*) FROM active_grids) AS grilles_actives,
                    (SELECT COUNT(*) FROM active_criteria_raw) AS criteres_actifs,
                    (
                        SELECT COUNT(*)
                        FROM active_lots l
                        WHERE NOT EXISTS (
                            SELECT 1
                            FROM active_grids g
                            WHERE g.lot_id = l.id
                        )
                    ) AS lots_sans_grille,
                    (
                        SELECT COUNT(*)
                        FROM grid_quality gq
                        WHERE gq.critere_count = 0
                    ) AS grilles_sans_critere,
                    (
                        SELECT COUNT(*)
                        FROM grid_quality gq
                        WHERE gq.critere_count > 0
                          AND (
                              COALESCE(gq.total_points, 0) <> 100
                              OR gq.somme_criteres <> COALESCE(gq.total_points, 0)
                          )
                    ) AS grilles_total_invalide,
                    (
                        SELECT COUNT(*)
                        FROM active_criteria_raw cr
                        WHERE cr.categorie_valide = FALSE
                    ) AS criteres_sans_categorie
                """;

        DashboardConfigurationStatsResponse result = jdbcTemplate.queryForObject(
                sql,
                (rs, rowNum) -> DashboardConfigurationStatsResponse.builder()
                        .typesActifs(rs.getLong("types_actifs"))
                        .lotsActifs(rs.getLong("lots_actifs"))
                        .categoriesActives(rs.getLong("categories_actives"))
                        .grillesActives(rs.getLong("grilles_actives"))
                        .criteresActifs(rs.getLong("criteres_actifs"))
                        .lotsSansGrille(rs.getLong("lots_sans_grille"))
                        .grillesSansCritere(rs.getLong("grilles_sans_critere"))
                        .grillesTotalInvalide(rs.getLong("grilles_total_invalide"))
                        .criteresSansCategorie(rs.getLong("criteres_sans_categorie"))
                        .build()
        );

        return result == null ? emptyConfigurationStats() : result;
    }

    // =====================================================
    // DÉPARTEMENT TECHNIQUE / ÉVALUATION
    // =====================================================

    private DashboardEvaluationStatsResponse getEvaluationStats(
            Long utilisateurId,
            boolean admin,
            DataFilter filter
    ) {
        String userScope = admin ? "" : " AND w.utilisateur_affecte_id = ? ";
        Object[] workflowArgs = admin ? new Object[]{} : new Object[]{utilisateurId};

        String workflowSql = """
                WITH active_intervenants AS (
                    SELECT c.id
                    FROM candidature c
                    WHERE COALESCE(c.actif, TRUE) = TRUE
                      AND COALESCE(c.acces_bloque, FALSE) = FALSE
                      AND NOT EXISTS (
                          SELECT 1
                          FROM utilisateur cu
                          WHERE cu.candidature_id = c.id
                            AND CAST(cu.type_utilisateur AS TEXT) = 'CND'
                            AND (
                                COALESCE(cu.actif, FALSE) = FALSE
                                OR CAST(cu.statut_compte AS TEXT) <> 'ACTIF'
                            )
                      )
                )
                SELECT
                    COUNT(DISTINCT w.candidature_id) AS dossiers_affectes,
                    COUNT(DISTINCT w.candidature_id) FILTER (
                        WHERE w.statut IN ('EN_ATTENTE', 'A_TRAITER')
                    ) AS evaluations_a_commencer,
                    COUNT(DISTINCT w.candidature_id) FILTER (
                        WHERE w.statut = 'EN_COURS'
                    ) AS evaluations_en_cours,
                    COUNT(DISTINCT w.candidature_id) FILTER (
                        WHERE w.statut = 'TERMINEE'
                    ) AS evaluations_terminees,
                    COUNT(DISTINCT w.candidature_id) FILTER (
                        WHERE w.statut = 'REOUVERTE'
                    ) AS evaluations_reouvertes
                FROM workflow_etape_el_emar w
                JOIN active_intervenants ai ON ai.id = w.candidature_id
                JOIN utilisateur assigned_user
                  ON assigned_user.id = w.utilisateur_affecte_id
                 AND COALESCE(assigned_user.actif, FALSE) = TRUE
                 AND CAST(assigned_user.statut_compte AS TEXT) = 'ACTIF'
                WHERE w.statut <> 'ANNULEE'
                """ + userScope;

        long[] workflow = jdbcTemplate.queryForObject(
                workflowSql,
                (rs, rowNum) -> new long[]{
                        rs.getLong("dossiers_affectes"),
                        rs.getLong("evaluations_a_commencer"),
                        rs.getLong("evaluations_en_cours"),
                        rs.getLong("evaluations_terminees"),
                        rs.getLong("evaluations_reouvertes")
                },
                workflowArgs
        );

        if (workflow == null) {
            workflow = new long[]{0, 0, 0, 0, 0};
        }

        String criteriaSql = baseCte(filter) + """
                SELECT
                    COUNT(DISTINCT rc.id) FILTER (
                        WHERE le.reponse_critere_id IS NULL
                           OR UPPER(le.statut) = 'A_VERIFIER'
                    ) AS criteres_a_verifier,
                    COUNT(DISTINCT rc.id) FILTER (
                        WHERE UPPER(le.statut) = 'CONFORME'
                    ) AS criteres_conformes,
                    COUNT(DISTINCT rc.id) FILTER (
                        WHERE UPPER(le.statut) = 'NON_CONFORME'
                    ) AS criteres_non_conformes,
                    COALESCE(
                        (
                            SELECT AVG(base_score.score)
                            FROM (
                                SELECT DISTINCT
                                    application_candidature_id,
                                    score
                                FROM base
                                WHERE application_candidature_id IS NOT NULL
                            ) base_score
                        ),
                        0
                    ) AS note_moyenne
                FROM base b
                LEFT JOIN reponse_critere rc
                  ON rc.application_candidature_id = b.application_candidature_id
                LEFT JOIN active_criteria ac
                  ON ac.id = rc.critere_evaluation_id
                LEFT JOIN latest_eval le
                  ON le.reponse_critere_id = rc.id
                WHERE rc.id IS NULL OR ac.id IS NOT NULL
                """;

        EvaluationQualityRow quality = jdbcTemplate.queryForObject(
                criteriaSql,
                (rs, rowNum) -> new EvaluationQualityRow(
                        rs.getLong("criteres_a_verifier"),
                        rs.getLong("criteres_conformes"),
                        rs.getLong("criteres_non_conformes"),
                        defaultDecimal(rs.getBigDecimal("note_moyenne"))
                ),
                filter.args().toArray()
        );

        if (quality == null) {
            quality = new EvaluationQualityRow(0, 0, 0, BigDecimal.ZERO);
        }

        return DashboardEvaluationStatsResponse.builder()
                .dossiersAffectes(workflow[0])
                .evaluationsACommencer(workflow[1])
                .evaluationsEnCours(workflow[2])
                .evaluationsTerminees(workflow[3])
                .evaluationsReouvertes(workflow[4])
                .criteresAVerifier(quality.toVerify())
                .criteresConformes(quality.conforming())
                .criteresNonConformes(quality.nonConforming())
                .noteMoyenne(quality.averageScore())
                .build();
    }

    // =====================================================
    // COMITÉ / DÉCISION ET CLASSEMENT
    // =====================================================

    private DashboardCommitteeStatsResponse getCommitteeStats(DataFilter filter) {
        String sql = baseCte(filter) + """
                SELECT
                    COUNT(DISTINCT application_candidature_id) FILTER (
                        WHERE note_finale IS NOT NULL
                    ) AS dossiers_evalues,
                    COUNT(DISTINCT application_candidature_id) FILTER (
                        WHERE note_finale IS NOT NULL
                          AND decision_finale IS NULL
                    ) AS decisions_en_attente,
                    COUNT(DISTINCT application_candidature_id) FILTER (
                        WHERE decision_finale = 'ADMIS'
                    ) AS admis,
                    COUNT(DISTINCT application_candidature_id) FILTER (
                        WHERE decision_finale IN ('REJETE', 'IRRECEVABLE')
                    ) AS rejetes,
                    COUNT(DISTINCT application_candidature_id) FILTER (
                        WHERE decision_finale = 'A_CORRIGER'
                    ) AS a_corriger,
                    COUNT(DISTINCT application_candidature_id) FILTER (
                        WHERE decision_finale = 'ADMIS'
                          AND zone_id IS NULL
                    ) AS classements_en_attente,
                    COUNT(DISTINCT application_candidature_id) FILTER (
                        WHERE decision_finale = 'ADMIS'
                          AND zone_id IS NOT NULL
                    ) AS dossiers_classes
                FROM base
                """;

        DashboardCommitteeStatsResponse result = jdbcTemplate.queryForObject(
                sql,
                (rs, rowNum) -> DashboardCommitteeStatsResponse.builder()
                        .dossiersEvalues(rs.getLong("dossiers_evalues"))
                        .decisionsEnAttente(rs.getLong("decisions_en_attente"))
                        .admis(rs.getLong("admis"))
                        .rejetes(rs.getLong("rejetes"))
                        .aCorriger(rs.getLong("a_corriger"))
                        .classementsEnAttente(rs.getLong("classements_en_attente"))
                        .dossiersClasses(rs.getLong("dossiers_classes"))
                        .build(),
                filter.args().toArray()
        );

        return result == null ? emptyCommitteeStats() : result;
    }

    // =====================================================
    // LISTES ET RÉPARTITIONS
    // =====================================================

    private List<DashboardIntervenantResponse> getIntervenants(DataFilter filter) {
        String sql = baseCte(filter) + """
                SELECT
                    candidature_id,
                    application_candidature_id,
                    raison_sociale,
                    email_principal,
                    type_intervenant_id,
                    type_intervenant_libelle,
                    lot_id,
                    nom_lot,
                    score,
                    decision_finale,
                    zone_id,
                    nom_zone,
                    classement,
                    statut_evaluation
                FROM base
                ORDER BY
                    CASE WHEN application_candidature_id IS NULL THEN 1 ELSE 0 END,
                    score DESC,
                    raison_sociale ASC,
                    nom_lot ASC
                LIMIT 60
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> DashboardIntervenantResponse.builder()
                        .candidatureId(rs.getLong("candidature_id"))
                        .applicationCandidatureId(nullableLong(rs, "application_candidature_id"))
                        .raisonSociale(rs.getString("raison_sociale"))
                        .email(rs.getString("email_principal"))
                        .typeIntervenantId(nullableLong(rs, "type_intervenant_id"))
                        .typeIntervenantLibelle(rs.getString("type_intervenant_libelle"))
                        .lotId(nullableLong(rs, "lot_id"))
                        .lotNom(rs.getString("nom_lot"))
                        .score(defaultDecimal(rs.getBigDecimal("score")))
                        .decision(rs.getString("decision_finale"))
                        .zoneId(nullableLong(rs, "zone_id"))
                        .zoneNom(rs.getString("nom_zone"))
                        .classement(rs.getString("classement"))
                        .statutEvaluation(rs.getString("statut_evaluation"))
                        .build(),
                filter.args().toArray()
        );
    }

    private List<DashboardDecisionResponse> buildDecisions(
            DashboardCommitteeStatsResponse stats
    ) {
        return List.of(
                decision("ADMIS", "Admis", stats.getAdmis()),
                decision("EN_ATTENTE", "Décision en attente", stats.getDecisionsEnAttente()),
                decision("A_CORRIGER", "À corriger", stats.getACorriger()),
                decision("REJETE", "Rejetés", stats.getRejetes())
        );
    }

    private DashboardDecisionResponse decision(
            String code,
            String label,
            long count
    ) {
        return DashboardDecisionResponse.builder()
                .code(code)
                .label(label)
                .count(count)
                .build();
    }

    private List<DashboardZoneResponse> getZones(DataFilter filter) {
        String sql = baseCte(filter) + """
                SELECT
                    zone_id,
                    nom_zone,
                    COUNT(DISTINCT application_candidature_id) AS total
                FROM base
                WHERE decision_finale = 'ADMIS'
                  AND zone_id IS NOT NULL
                GROUP BY zone_id, nom_zone
                ORDER BY total DESC, nom_zone ASC
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> DashboardZoneResponse.builder()
                        .zoneId(rs.getLong("zone_id"))
                        .zoneNom(rs.getString("nom_zone"))
                        .count(rs.getLong("total"))
                        .build(),
                filter.args().toArray()
        );
    }

    private List<DashboardNoteBandResponse> getNoteBands(DataFilter filter) {
        String sql = baseCte(filter) + """
                SELECT 'SUP_80' AS code,
                       '80 à 100' AS label,
                       COUNT(DISTINCT application_candidature_id) FILTER (
                           WHERE application_candidature_id IS NOT NULL
                             AND score >= 80
                       ) AS total
                FROM base
                UNION ALL
                SELECT 'BETWEEN_60_79',
                       '60 à 79',
                       COUNT(DISTINCT application_candidature_id) FILTER (
                           WHERE application_candidature_id IS NOT NULL
                             AND score >= 60
                             AND score < 80
                       )
                FROM base
                UNION ALL
                SELECT 'INF_60',
                       'Moins de 60',
                       COUNT(DISTINCT application_candidature_id) FILTER (
                           WHERE application_candidature_id IS NOT NULL
                             AND score < 60
                       )
                FROM base
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> DashboardNoteBandResponse.builder()
                        .code(rs.getString("code"))
                        .label(rs.getString("label"))
                        .count(rs.getLong("total"))
                        .build(),
                filter.args().toArray()
        );
    }

    // =====================================================
    // PRIORITÉS PAR PROFIL
    // =====================================================

    private List<DashboardAlertResponse> buildAlerts(
            String profile,
            DashboardItStatsResponse it,
            DashboardConfigurationStatsResponse configuration,
            DashboardEvaluationStatsResponse evaluation,
            DashboardCommitteeStatsResponse committee
    ) {
        List<DashboardAlertResponse> alerts = new ArrayList<>();

        if (ADMIN.equals(profile) || IT.equals(profile)) {
            addAlert(
                    alerts,
                    "UTILISATEURS_SANS_ROLE",
                    it.getUtilisateursSansRole(),
                    "CRITICAL",
                    "Comptes sans rôle",
                    "Des comptes actifs ne disposent pas encore d'un rôle d'accès.",
                    "/el-emar/utilisateurs"
            );
            addAlert(
                    alerts,
                    "ROLES_SANS_ACCES",
                    it.getRolesSansAcces(),
                    "WARNING",
                    "Rôles sans module",
                    "Des rôles actifs ne donnent accès à aucun module actif.",
                    "/el-emar/roles-acces"
            );
        }

        if (ADMIN.equals(profile) || ACHAT.equals(profile)) {
            addAlert(
                    alerts,
                    "LOTS_SANS_GRILLE",
                    configuration.getLotsSansGrille(),
                    "CRITICAL",
                    "Domaines sans grille",
                    "Des domaines actifs ne disposent pas d'une grille d'évaluation active.",
                    "/el-emar/criteres"
            );
            addAlert(
                    alerts,
                    "GRILLES_SANS_CRITERE",
                    configuration.getGrillesSansCritere(),
                    "CRITICAL",
                    "Grilles sans critère",
                    "Des grilles actives ne contiennent aucun critère actif.",
                    "/el-emar/criteres"
            );
            addAlert(
                    alerts,
                    "GRILLES_TOTAL_INVALIDE",
                    configuration.getGrillesTotalInvalide(),
                    "WARNING",
                    "Totaux de grille à corriger",
                    "La somme des critères actifs doit correspondre au total de la grille.",
                    "/el-emar/criteres"
            );
            addAlert(
                    alerts,
                    "CRITERES_SANS_CATEGORIE",
                    configuration.getCriteresSansCategorie(),
                    "WARNING",
                    "Critères sans catégorie active",
                    "Des critères actifs doivent être rattachés à une catégorie active.",
                    "/el-emar/criteres"
            );
        }

        if (ADMIN.equals(profile) || TECHNIQUE.equals(profile)) {
            addAlert(
                    alerts,
                    "EVALUATIONS_A_COMMENCER",
                    evaluation.getEvaluationsACommencer(),
                    "INFO",
                    "Évaluations à commencer",
                    "Des dossiers affectés attendent le début de l'évaluation.",
                    "/el-emar/evaluations"
            );
            addAlert(
                    alerts,
                    "EVALUATIONS_REOUVERTES",
                    evaluation.getEvaluationsReouvertes(),
                    "WARNING",
                    "Évaluations réouvertes",
                    "Des dossiers doivent être repris après une demande de correction.",
                    "/el-emar/evaluations"
            );
            addAlert(
                    alerts,
                    "CRITERES_A_VERIFIER",
                    evaluation.getCriteresAVerifier(),
                    "INFO",
                    "Critères à vérifier",
                    "Des réponses actives attendent encore une vérification.",
                    "/el-emar/evaluations"
            );
        }

        if (ADMIN.equals(profile) || COMITE.equals(profile)) {
            addAlert(
                    alerts,
                    "DECISIONS_EN_ATTENTE",
                    committee.getDecisionsEnAttente(),
                    "WARNING",
                    "Décisions en attente",
                    "Des dossiers évalués attendent une décision de qualification.",
                    "/el-emar/decisions"
            );
            addAlert(
                    alerts,
                    "CLASSEMENTS_EN_ATTENTE",
                    committee.getClassementsEnAttente(),
                    "WARNING",
                    "Classements à compléter",
                    "Des intervenants admis ne sont pas encore classés par zone.",
                    "/el-emar/classement-zone"
            );
        }

        return alerts.stream().limit(8).toList();
    }

    private void addAlert(
            List<DashboardAlertResponse> alerts,
            String code,
            long count,
            String level,
            String title,
            String message,
            String route
    ) {
        if (count <= 0) {
            return;
        }

        alerts.add(DashboardAlertResponse.builder()
                .code(code)
                .level(level)
                .title(title)
                .message(message)
                .count(count)
                .actionLabel("Ouvrir")
                .route(route)
                .build());
    }

    // =====================================================
    // ACTIONS RAPIDES ET ACTIVITÉS
    // =====================================================

    private List<DashboardQuickActionResponse> getAuthorizedQuickActions(
            DashboardContextResponse context,
            String profile
    ) {
        List<String> requestedCodes = profileModuleCodes(profile);

        if (requestedCodes.isEmpty()) {
            return List.of();
        }

        String sql;
        Object[] args;

        if (context.isAdmin()) {
            sql = """
                    SELECT
                        m.code_module,
                        m.libelle,
                        m.description,
                        m.route_front,
                        m.icone
                    FROM module_navbar m
                    WHERE COALESCE(m.actif, TRUE) = TRUE
                    ORDER BY m.ordre_groupe, m.ordre_module, m.id
                    """;
            args = new Object[]{};
        } else {
            if (context.getRoleId() == null) {
                return List.of();
            }

            sql = """
                    SELECT
                        m.code_module,
                        m.libelle,
                        m.description,
                        m.route_front,
                        m.icone
                    FROM role_module_acces rma
                    JOIN module_navbar m ON m.id = rma.module_id
                    WHERE rma.role_id = ?
                      AND COALESCE(rma.autorise, FALSE) = TRUE
                      AND COALESCE(m.actif, TRUE) = TRUE
                    ORDER BY m.ordre_groupe, m.ordre_module, m.id
                    """;
            args = new Object[]{context.getRoleId()};
        }

        List<DashboardQuickActionResponse> available = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> DashboardQuickActionResponse.builder()
                        .code(normalize(rs.getString("code_module")))
                        .label(rs.getString("libelle"))
                        .description(rs.getString("description"))
                        .icon(rs.getString("icone"))
                        .route(rs.getString("route_front"))
                        .moduleCode(normalize(rs.getString("code_module")))
                        .build(),
                args
        );

        Map<String, DashboardQuickActionResponse> byCode = new HashMap<>();
        available.forEach(action -> byCode.put(normalize(action.getModuleCode()), action));

        List<DashboardQuickActionResponse> ordered = new ArrayList<>();
        for (String code : requestedCodes) {
            DashboardQuickActionResponse action = byCode.get(code);
            if (action != null) {
                ordered.add(action);
            }
        }

        return ordered;
    }

    private List<String> profileModuleCodes(String profile) {
        return switch (profile) {
            case IT -> List.of(
                    "UTILISATEURS",
                    "ROLES_ACCES",
                    "HISTORIQUE",
                    "NOTIFICATIONS"
            );
            case ACHAT -> List.of(
                    "INTERVENANTS",
                    "LOTS",
                    "ZONES",
                    "DOCUMENTS_DEMANDES",
                    "CHAMPS_APPRECIATION",
                    "GRILLE_EVALUATION"
            );
            case TECHNIQUE -> List.of(
                    "DOSSIERS_QUALIFICATION",
                    "VERIFICATION_DOCUMENTS",
                    "EVALUATIONS",
                    "NOTIFICATIONS"
            );
            case COMITE -> List.of(
                    "EVALUATIONS",
                    "DECISIONS",
                    "CLASSEMENT_ZONE",
                    "LISTE_AGREEE"
            );
            case ADMIN -> List.of(
                    "INTERVENANTS",
                    "LOTS",
                    "GRILLE_EVALUATION",
                    "EVALUATIONS",
                    "DECISIONS",
                    "CLASSEMENT_ZONE",
                    "UTILISATEURS",
                    "ROLES_ACCES"
            );
            default -> List.of();
        };
    }

    private List<DashboardActivityResponse> getRecentActivities(
            Long utilisateurId,
            boolean global
    ) {
        String userScope = global ? "" : " AND h.utilisateur_id = ? ";
        Object[] args = global ? new Object[]{} : new Object[]{utilisateurId};

        String sql = """
                SELECT
                    h.id,
                    h.action,
                    COALESCE(NULLIF(TRIM(h.description), ''), h.action) AS description,
                    u.nom AS utilisateur_nom,
                    h.date_action
                FROM historique_action h
                LEFT JOIN utilisateur u ON u.id = h.utilisateur_id
                WHERE (
                    h.utilisateur_id IS NULL
                    OR (
                        COALESCE(u.actif, FALSE) = TRUE
                        AND CAST(u.statut_compte AS TEXT) = 'ACTIF'
                    )
                )
                  AND (
                    h.candidature_id IS NULL
                    OR EXISTS (
                        SELECT 1
                        FROM candidature c
                        WHERE c.id = h.candidature_id
                          AND COALESCE(c.actif, TRUE) = TRUE
                          AND COALESCE(c.acces_bloque, FALSE) = FALSE
                    )
                  )
                """ + userScope + """
                ORDER BY h.date_action DESC, h.id DESC
                LIMIT 10
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    Timestamp date = rs.getTimestamp("date_action");
                    return DashboardActivityResponse.builder()
                            .id(rs.getLong("id"))
                            .action(rs.getString("action"))
                            .description(rs.getString("description"))
                            .utilisateurNom(rs.getString("utilisateur_nom"))
                            .dateAction(date == null ? null : date.toLocalDateTime().toString())
                            .build();
                },
                args
        );
    }

    // =====================================================
    // OPTIONS DE FILTRE ACTIVES
    // =====================================================

    private List<DashboardOptionResponse> getTypesIntervenant() {
        return jdbcTemplate.query(
                """
                SELECT id, libelle
                FROM type_intervenant
                WHERE COALESCE(actif, TRUE) = TRUE
                ORDER BY ordre_affichage, libelle
                """,
                (rs, rowNum) -> DashboardOptionResponse.builder()
                        .id(rs.getLong("id"))
                        .label(rs.getString("libelle"))
                        .build()
        );
    }

    private List<DashboardOptionResponse> getLots(Long typeIntervenantId) {
        String sql = """
                SELECT l.id, l.nom_lot
                FROM lot l
                JOIN type_intervenant ti ON ti.id = l.type_intervenant_id
                WHERE COALESCE(l.actif, TRUE) = TRUE
                  AND COALESCE(ti.actif, TRUE) = TRUE
                """ + (typeIntervenantId == null || typeIntervenantId <= 0
                ? ""
                : " AND l.type_intervenant_id = ? ") + """
                ORDER BY ti.ordre_affichage, l.nom_lot
                """;

        Object[] args = typeIntervenantId == null || typeIntervenantId <= 0
                ? new Object[]{}
                : new Object[]{typeIntervenantId};

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> DashboardOptionResponse.builder()
                        .id(rs.getLong("id"))
                        .label(rs.getString("nom_lot"))
                        .build(),
                args
        );
    }

    // =====================================================
    // VALEURS VIDES ET OUTILS
    // =====================================================

    private DashboardOverviewResponse emptyOverview() {
        return DashboardOverviewResponse.builder()
                .noteMoyenne(BigDecimal.ZERO)
                .build();
    }

    private DashboardItStatsResponse emptyItStats() {
        return DashboardItStatsResponse.builder().build();
    }

    private DashboardConfigurationStatsResponse emptyConfigurationStats() {
        return DashboardConfigurationStatsResponse.builder().build();
    }

    private DashboardEvaluationStatsResponse emptyEvaluationStats() {
        return DashboardEvaluationStatsResponse.builder()
                .noteMoyenne(BigDecimal.ZERO)
                .build();
    }

    private DashboardCommitteeStatsResponse emptyCommitteeStats() {
        return DashboardCommitteeStatsResponse.builder().build();
    }

    private Long nullableLong(
            java.sql.ResultSet rs,
            String column
    ) throws java.sql.SQLException {
        Object value = rs.getObject(column);
        return value == null ? null : rs.getLong(column);
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value == null
                ? BigDecimal.ZERO
                : value.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalize(String value) {
        return value == null
                ? ""
                : value.trim().toUpperCase(Locale.ROOT);
    }

    private record UserContextRow(
            DashboardContextResponse context,
            boolean active
    ) {
    }

    private record DataFilter(
            String where,
            List<Object> args
    ) {
    }

    private record EvaluationQualityRow(
            long toVerify,
            long conforming,
            long nonConforming,
            BigDecimal averageScore
    ) {
    }
}
