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

    /*
     * IMPORTANT :
     * REQUIRED permet d'utiliser la transaction existante.
     *
     * Si cette méthode est appelée depuis updateUtilisateur(),
     * elle participe à la même transaction.
     *
     * Cela évite le blocage causé par REQUIRES_NEW lorsqu'on
     * modifie un utilisateur puis qu'on insère un historique
     * qui référence ce même utilisateur.
     */
    @Transactional(
            propagation = Propagation.REQUIRED
    )
    public void enregistrerAction(
            Long utilisateurId,
            Long candidatureId,
            Long applicationCandidatureId,
            String action,
            String description
    ) {
        if (
                action == null
                        || action.isBlank()
        ) {
            throw new IllegalArgumentException(
                    "L'action de l'historique est obligatoire."
            );
        }

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
                action.trim(),
                cleanNullable(description)
        );
    }

    @Transactional(readOnly = true)
    public List<HistoriqueActionResponse>
    getHistoriqueByUtilisateur(
            Long utilisateurId
    ) {
        if (utilisateurId == null) {
            throw new IllegalArgumentException(
                    "L'identifiant utilisateur est obligatoire."
            );
        }

        String sql = """
                SELECT
                    h.id,
                    h.utilisateur_id,
                    u.nom AS utilisateur_nom,
                    u.email AS utilisateur_email,
                    CAST(
                        u.type_utilisateur AS TEXT
                    ) AS type_utilisateur,

                    h.candidature_id,
                    c.raison_sociale,
                    c.email_principal
                        AS email_candidature,

                    h.application_candidature_id,
                    ac.lot_id,
                    l.nom_lot,

                    h.action,
                    h.description,
                    h.date_action

                FROM historique_action h

                LEFT JOIN utilisateur u
                    ON u.id = h.utilisateur_id

                LEFT JOIN candidature c
                    ON c.id = h.candidature_id

                LEFT JOIN application_candidature ac
                    ON ac.id =
                       h.application_candidature_id

                LEFT JOIN lot l
                    ON l.id = ac.lot_id

                WHERE h.utilisateur_id = ?

                ORDER BY
                    h.date_action DESC,
                    h.id DESC
                """;

        return jdbcTemplate.query(
                sql,
                this::mapHistorique,
                utilisateurId
        );
    }

    @Transactional(readOnly = true)
    public List<HistoriqueActionResponse>
    getHistoriqueByCandidature(
            Long candidatureId
    ) {
        if (candidatureId == null) {
            throw new IllegalArgumentException(
                    "L'identifiant de la candidature est obligatoire."
            );
        }

        String sql = """
                SELECT
                    h.id,
                    h.utilisateur_id,
                    u.nom AS utilisateur_nom,
                    u.email AS utilisateur_email,
                    CAST(
                        u.type_utilisateur AS TEXT
                    ) AS type_utilisateur,

                    h.candidature_id,
                    c.raison_sociale,
                    c.email_principal
                        AS email_candidature,

                    h.application_candidature_id,
                    ac.lot_id,
                    l.nom_lot,

                    h.action,
                    h.description,
                    h.date_action

                FROM historique_action h

                LEFT JOIN utilisateur u
                    ON u.id = h.utilisateur_id

                LEFT JOIN candidature c
                    ON c.id = h.candidature_id

                LEFT JOIN application_candidature ac
                    ON ac.id =
                       h.application_candidature_id

                LEFT JOIN lot l
                    ON l.id = ac.lot_id

                WHERE h.candidature_id = ?

                ORDER BY
                    h.date_action DESC,
                    h.id DESC
                """;

        return jdbcTemplate.query(
                sql,
                this::mapHistorique,
                candidatureId
        );
    }

    @Transactional(readOnly = true)
    public List<HistoriqueActionResponse>
    getAllHistorique() {
        String sql = """
                SELECT
                    h.id,
                    h.utilisateur_id,
                    u.nom AS utilisateur_nom,
                    u.email AS utilisateur_email,
                    CAST(
                        u.type_utilisateur AS TEXT
                    ) AS type_utilisateur,

                    h.candidature_id,
                    c.raison_sociale,
                    c.email_principal
                        AS email_candidature,

                    h.application_candidature_id,
                    ac.lot_id,
                    l.nom_lot,

                    h.action,
                    h.description,
                    h.date_action

                FROM historique_action h

                LEFT JOIN utilisateur u
                    ON u.id = h.utilisateur_id

                LEFT JOIN candidature c
                    ON c.id = h.candidature_id

                LEFT JOIN application_candidature ac
                    ON ac.id =
                       h.application_candidature_id

                LEFT JOIN lot l
                    ON l.id = ac.lot_id

                ORDER BY
                    h.date_action DESC,
                    h.id DESC
                """;

        return jdbcTemplate.query(
                sql,
                this::mapHistorique
        );
    }

    private HistoriqueActionResponse mapHistorique(
            java.sql.ResultSet rs,
            int rowNum
    ) throws java.sql.SQLException {

        java.sql.Timestamp dateAction =
                rs.getTimestamp("date_action");

        return HistoriqueActionResponse
                .builder()

                .id(
                        getLongOrNull(
                                rs.getObject("id")
                        )
                )

                .utilisateurId(
                        getLongOrNull(
                                rs.getObject(
                                        "utilisateur_id"
                                )
                        )
                )

                .utilisateurNom(
                        rs.getString(
                                "utilisateur_nom"
                        )
                )

                .utilisateurEmail(
                        rs.getString(
                                "utilisateur_email"
                        )
                )

                .typeUtilisateur(
                        rs.getString(
                                "type_utilisateur"
                        )
                )

                .candidatureId(
                        getLongOrNull(
                                rs.getObject(
                                        "candidature_id"
                                )
                        )
                )

                .raisonSociale(
                        rs.getString(
                                "raison_sociale"
                        )
                )

                .emailCandidature(
                        rs.getString(
                                "email_candidature"
                        )
                )

                .applicationCandidatureId(
                        getLongOrNull(
                                rs.getObject(
                                        "application_candidature_id"
                                )
                        )
                )

                .lotId(
                        getLongOrNull(
                                rs.getObject("lot_id")
                        )
                )

                .lotNom(
                        rs.getString("nom_lot")
                )

                .action(
                        rs.getString("action")
                )

                .description(
                        rs.getString("description")
                )

                .dateAction(
                        dateAction != null
                                ? dateAction
                                .toLocalDateTime()
                                : null
                )

                .build();
    }

    private Long getLongOrNull(
            Object value
    ) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        try {
            return Long.valueOf(
                    String.valueOf(value)
            );
        } catch (
                NumberFormatException exception
        ) {
            return null;
        }
    }

    private String cleanNullable(
            String value
    ) {
        if (value == null) {
            return null;
        }

        String cleaned =
                value.trim();

        return cleaned.isBlank()
                ? null
                : cleaned;
    }
}