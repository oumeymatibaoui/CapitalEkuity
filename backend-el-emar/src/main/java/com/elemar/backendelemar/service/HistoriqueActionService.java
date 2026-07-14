package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.HistoriqueActionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HistoriqueActionService {

    private final JdbcTemplate jdbcTemplate;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void enregistrerAction(
            Long utilisateurId,
            Long candidatureId,
            Long applicationCandidatureId,
            String action,
            String description
    ) {
        String sql = """
                INSERT INTO historique_action (
                    utilisateur_id,
                    candidature_id,
                    application_candidature_id,
                    action,
                    description,
                    date_action
                )
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """;

        jdbcTemplate.update(
                sql,
                utilisateurId,
                candidatureId,
                applicationCandidatureId,
                action,
                description
        );
    }

    @Transactional(readOnly = true)
    public List<HistoriqueActionResponse> getHistoriqueByUtilisateur(Long utilisateurId) {
        String sql = """
                SELECT
                    h.id,
                    h.utilisateur_id,
                    u.nom AS utilisateur_nom,
                    u.email AS utilisateur_email,
                    CAST(u.type_utilisateur AS TEXT) AS type_utilisateur,

                    h.candidature_id,
                    c.raison_sociale,
                    c.email_principal AS email_candidature,

                    h.application_candidature_id,
                    ac.lot_id,
                    l.nom_lot,

                    h.action,
                    h.description,
                    h.date_action

                FROM historique_action h
                LEFT JOIN utilisateur u ON u.id = h.utilisateur_id
                LEFT JOIN candidature c ON c.id = h.candidature_id
                LEFT JOIN application_candidature ac ON ac.id = h.application_candidature_id
                LEFT JOIN lot l ON l.id = ac.lot_id

                WHERE h.utilisateur_id = ?

                ORDER BY h.date_action DESC, h.id DESC
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> HistoriqueActionResponse.builder()
                        .id(rs.getLong("id"))
                        .utilisateurId(getLongOrNull(rs.getObject("utilisateur_id")))
                        .utilisateurNom(rs.getString("utilisateur_nom"))
                        .utilisateurEmail(rs.getString("utilisateur_email"))
                        .typeUtilisateur(rs.getString("type_utilisateur"))
                        .candidatureId(getLongOrNull(rs.getObject("candidature_id")))
                        .raisonSociale(rs.getString("raison_sociale"))
                        .emailCandidature(rs.getString("email_candidature"))
                        .applicationCandidatureId(getLongOrNull(rs.getObject("application_candidature_id")))
                        .lotId(getLongOrNull(rs.getObject("lot_id")))
                        .lotNom(rs.getString("nom_lot"))
                        .action(rs.getString("action"))
                        .description(rs.getString("description"))
                        .dateAction(
                                rs.getTimestamp("date_action") != null
                                        ? rs.getTimestamp("date_action").toLocalDateTime()
                                        : null
                        )
                        .build(),
                utilisateurId
        );
    }

    @Transactional(readOnly = true)
    public List<HistoriqueActionResponse> getHistoriqueByCandidature(Long candidatureId) {
        String sql = """
                SELECT
                    h.id,
                    h.utilisateur_id,
                    u.nom AS utilisateur_nom,
                    u.email AS utilisateur_email,
                    CAST(u.type_utilisateur AS TEXT) AS type_utilisateur,

                    h.candidature_id,
                    c.raison_sociale,
                    c.email_principal AS email_candidature,

                    h.application_candidature_id,
                    ac.lot_id,
                    l.nom_lot,

                    h.action,
                    h.description,
                    h.date_action

                FROM historique_action h
                LEFT JOIN utilisateur u ON u.id = h.utilisateur_id
                LEFT JOIN candidature c ON c.id = h.candidature_id
                LEFT JOIN application_candidature ac ON ac.id = h.application_candidature_id
                LEFT JOIN lot l ON l.id = ac.lot_id

                WHERE h.candidature_id = ?

                ORDER BY h.date_action DESC, h.id DESC
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> HistoriqueActionResponse.builder()
                        .id(rs.getLong("id"))
                        .utilisateurId(getLongOrNull(rs.getObject("utilisateur_id")))
                        .utilisateurNom(rs.getString("utilisateur_nom"))
                        .utilisateurEmail(rs.getString("utilisateur_email"))
                        .typeUtilisateur(rs.getString("type_utilisateur"))
                        .candidatureId(getLongOrNull(rs.getObject("candidature_id")))
                        .raisonSociale(rs.getString("raison_sociale"))
                        .emailCandidature(rs.getString("email_candidature"))
                        .applicationCandidatureId(getLongOrNull(rs.getObject("application_candidature_id")))
                        .lotId(getLongOrNull(rs.getObject("lot_id")))
                        .lotNom(rs.getString("nom_lot"))
                        .action(rs.getString("action"))
                        .description(rs.getString("description"))
                        .dateAction(
                                rs.getTimestamp("date_action") != null
                                        ? rs.getTimestamp("date_action").toLocalDateTime()
                                        : null
                        )
                        .build(),
                candidatureId
        );
    }

    @Transactional(readOnly = true)
    public List<HistoriqueActionResponse> getAllHistorique() {
        String sql = """
                SELECT
                    h.id,
                    h.utilisateur_id,
                    u.nom AS utilisateur_nom,
                    u.email AS utilisateur_email,
                    CAST(u.type_utilisateur AS TEXT) AS type_utilisateur,

                    h.candidature_id,
                    c.raison_sociale,
                    c.email_principal AS email_candidature,

                    h.application_candidature_id,
                    ac.lot_id,
                    l.nom_lot,

                    h.action,
                    h.description,
                    h.date_action

                FROM historique_action h
                LEFT JOIN utilisateur u ON u.id = h.utilisateur_id
                LEFT JOIN candidature c ON c.id = h.candidature_id
                LEFT JOIN application_candidature ac ON ac.id = h.application_candidature_id
                LEFT JOIN lot l ON l.id = ac.lot_id

                ORDER BY h.date_action DESC, h.id DESC
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> HistoriqueActionResponse.builder()
                        .id(rs.getLong("id"))
                        .utilisateurId(getLongOrNull(rs.getObject("utilisateur_id")))
                        .utilisateurNom(rs.getString("utilisateur_nom"))
                        .utilisateurEmail(rs.getString("utilisateur_email"))
                        .typeUtilisateur(rs.getString("type_utilisateur"))
                        .candidatureId(getLongOrNull(rs.getObject("candidature_id")))
                        .raisonSociale(rs.getString("raison_sociale"))
                        .emailCandidature(rs.getString("email_candidature"))
                        .applicationCandidatureId(getLongOrNull(rs.getObject("application_candidature_id")))
                        .lotId(getLongOrNull(rs.getObject("lot_id")))
                        .lotNom(rs.getString("nom_lot"))
                        .action(rs.getString("action"))
                        .description(rs.getString("description"))
                        .dateAction(
                                rs.getTimestamp("date_action") != null
                                        ? rs.getTimestamp("date_action").toLocalDateTime()
                                        : null
                        )
                        .build()
        );
    }

    private Long getLongOrNull(Object value) {
        if (value == null) {
            return null;
        }

        return ((Number) value).longValue();
    }
}