package com.elemar.backendelemar.service;

import com.elemar.backendelemar.entity.WorkflowEtapeElEmar;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@RequiredArgsConstructor
public class EvaluationElementLockService {

    public static final String DOCUMENTS = "DOCUMENTS";
    public static final String SOLVABILITE = "SOLVABILITE";
    public static final String CRITERE = "CRITERE";
    public static final String ZONE_REFERENCE = "ZONE_REFERENCE";
    public static final String DECISION = "DECISION";

    /**
     * LOT est conservé uniquement comme constante de compatibilité avec
     * d'anciennes lignes. La nouvelle architecture ne crée plus ce verrou.
     */
    public static final String LOT = "LOT";

    private final JdbcTemplate jdbcTemplate;
    private final CurrentUserService currentUserService;
    private final WorkflowAccessService workflowAccessService;
    private final WorkflowPermissionService permissionService;
    private final HistoriqueActionService historiqueActionService;

    public record LockContext(
            Long utilisateurId,
            Long candidatureId,
            Long applicationCandidatureId,
            String elementType,
            String elementKey,
            String codeEtape
    ) {
    }

    // =====================================================
    // PRÉPARATION DES SAUVEGARDES
    // =====================================================

    @Transactional
    public LockContext preparerDocuments(Long candidatureId) {
        Long utilisateurId = currentUserId();
        validatePositive(candidatureId, "Identifiant candidature obligatoire.");

        verrouTransaction(candidatureId, DOCUMENTS, candidatureId.toString());

        WorkflowEtapeElEmar step = workflowAccessService.verifierEtapeMetier(
                candidatureId,
                utilisateurId,
                "EVAL_ACTION_MODIFIER_RNE_CNSS",
                WorkflowStepCodes.RECEVABILITE_ADMINISTRATIVE
        );

        verifierDocumentsNonFinalises(candidatureId);
        exigerNonVerrouille(candidatureId, DOCUMENTS, candidatureId.toString());

        return context(
                utilisateurId,
                candidatureId,
                null,
                DOCUMENTS,
                candidatureId.toString(),
                step
        );
    }

    @Transactional
    public LockContext preparerSolvabilite(Long candidatureId) {
        Long utilisateurId = currentUserId();
        validatePositive(candidatureId, "Identifiant candidature obligatoire.");

        verrouTransaction(candidatureId, SOLVABILITE, candidatureId.toString());

        WorkflowEtapeElEmar step = workflowAccessService.verifierEtapeMetier(
                candidatureId,
                utilisateurId,
                "EVAL_ACTION_VALIDER_SOLVABILITE",
                WorkflowStepCodes.RECEVABILITE_ADMINISTRATIVE
        );

        verifierSolvabiliteNonFinalisee(candidatureId);
        exigerNonVerrouille(candidatureId, SOLVABILITE, candidatureId.toString());

        return context(
                utilisateurId,
                candidatureId,
                null,
                SOLVABILITE,
                candidatureId.toString(),
                step
        );
    }

    @Transactional
    public LockContext preparerCritere(
            Long applicationCandidatureId,
            Long reponseCritereId
    ) {
        validatePositive(
                applicationCandidatureId,
                "Identifiant du domaine obligatoire."
        );
        validatePositive(
                reponseCritereId,
                "Identifiant de la réponse critère obligatoire."
        );

        Long utilisateurId = currentUserId();
        Long candidatureId = candidatureIdDepuisApplication(applicationCandidatureId);

        verifierReponseDansApplication(
                reponseCritereId,
                applicationCandidatureId
        );

        verrouTransaction(
                candidatureId,
                CRITERE,
                reponseCritereId.toString()
        );

        WorkflowEtapeElEmar step = workflowAccessService.verifierModificationCritere(
                candidatureId,
                utilisateurId,
                reponseCritereId
        );

        verifierCritereNonFinalise(reponseCritereId);
        exigerNonVerrouille(
                candidatureId,
                CRITERE,
                reponseCritereId.toString()
        );

        return context(
                utilisateurId,
                candidatureId,
                applicationCandidatureId,
                CRITERE,
                reponseCritereId.toString(),
                step
        );
    }

    @Transactional
    public LockContext preparerDecision(Long applicationCandidatureId) {
        validatePositive(
                applicationCandidatureId,
                "Identifiant du domaine obligatoire."
        );

        Long utilisateurId = currentUserId();
        Long candidatureId = candidatureIdDepuisApplication(applicationCandidatureId);

        verrouTransaction(
                candidatureId,
                DECISION,
                applicationCandidatureId.toString()
        );

        verifierLotSansDecision(applicationCandidatureId);

        WorkflowEtapeElEmar step = workflowAccessService.verifierEtapeMetier(
                candidatureId,
                utilisateurId,
                "EVAL_ACTION_VALIDER_DECISION",
                WorkflowStepCodes.DECISION_FINALE
        );

        exigerNonVerrouille(
                candidatureId,
                DECISION,
                applicationCandidatureId.toString()
        );

        /*
         * IMPORTANT : ne plus vérifier / créer de verrou LOT ici.
         * Après la décision, l'étape CLASSEMENT_ZONE doit rester possible.
         */
        return context(
                utilisateurId,
                candidatureId,
                applicationCandidatureId,
                DECISION,
                applicationCandidatureId.toString(),
                step
        );
    }

    @Transactional
    public LockContext preparerZone(
            Long referenceProjetId,
            Long applicationCandidatureId
    ) {
        validatePositive(
                referenceProjetId,
                "Identifiant de la référence obligatoire."
        );
        validatePositive(
                applicationCandidatureId,
                "Identifiant du domaine obligatoire."
        );

        Long utilisateurId = currentUserId();
        Long candidatureId = candidatureIdDepuisApplication(applicationCandidatureId);

        verifierReferenceDansApplication(
                referenceProjetId,
                applicationCandidatureId
        );

        verrouTransaction(
                candidatureId,
                ZONE_REFERENCE,
                referenceProjetId.toString()
        );

        WorkflowEtapeElEmar step = workflowAccessService.verifierEtapeMetier(
                candidatureId,
                utilisateurId,
                "EVAL_ACTION_AFFECTER_ZONE",
                WorkflowStepCodes.CLASSEMENT_ZONE
        );

        /*
         * Le classement intervient APRÈS la décision.
         * On autorise le classement uniquement pour un domaine admis.
         */
        verifierLotAdmis(applicationCandidatureId);

        verifierReferenceNonFinalisee(referenceProjetId);
        exigerNonVerrouille(
                candidatureId,
                ZONE_REFERENCE,
                referenceProjetId.toString()
        );

        return context(
                utilisateurId,
                candidatureId,
                applicationCandidatureId,
                ZONE_REFERENCE,
                referenceProjetId.toString(),
                step
        );
    }

    // =====================================================
    // VERROUILLAGE APRÈS SUCCÈS
    // =====================================================

    @Transactional
    public void verrouiller(LockContext context) {
        if (context == null) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Contexte de verrouillage introuvable."
            );
        }

        int inserted = jdbcTemplate.update(
                """
                INSERT INTO evaluation_element_lock (
                    candidature_id,
                    application_candidature_id,
                    element_type,
                    element_key,
                    verrouille_par_id,
                    verrouille_le,
                    actif
                )
                SELECT ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, TRUE
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM evaluation_element_lock l
                    WHERE l.candidature_id = ?
                      AND l.element_type = ?
                      AND l.element_key = ?
                      AND l.actif IS TRUE
                )
                """,
                context.candidatureId(),
                context.applicationCandidatureId(),
                context.elementType(),
                context.elementKey(),
                context.utilisateurId(),
                context.candidatureId(),
                context.elementType(),
                context.elementKey()
        );

        if (inserted == 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cet élément vient d'être enregistré et verrouillé."
            );
        }
    }

    // =====================================================
    // RÉOUVERTURE PAR CODE D'ÉTAPE
    // =====================================================

    /**
     * La réouverture ne dépend plus de l'utilisateur ayant créé les verrous.
     * C'est indispensable car le même Gestionnaire ACHAT peut être affecté
     * à RECEVABILITE_ADMINISTRATIVE et CLASSEMENT_ZONE.
     */
    @Transactional
    public int reinitialiserPourReouverture(
            Long candidatureId,
            Collection<String> codesEtapes,
            Long responsableId,
            String motif
    ) {
        if (candidatureId == null
                || responsableId == null
                || codesEtapes == null
                || codesEtapes.isEmpty()) {
            return 0;
        }

        permissionService.exigerUtilisateurActif(responsableId);

        Set<String> elementTypes = new LinkedHashSet<>();

        for (String code : codesEtapes) {
            switch (WorkflowStepCodes.normalize(code)) {
                case WorkflowStepCodes.RECEVABILITE_ADMINISTRATIVE -> {
                    elementTypes.add(DOCUMENTS);
                    elementTypes.add(SOLVABILITE);
                }
                case WorkflowStepCodes.EVALUATION_TECHNIQUE ->
                        elementTypes.add(CRITERE);
                case WorkflowStepCodes.DECISION_FINALE ->
                        elementTypes.add(DECISION);
                case WorkflowStepCodes.CLASSEMENT_ZONE ->
                        elementTypes.add(ZONE_REFERENCE);
                default -> {
                    // Aucun élément métier associé.
                }
            }
        }

        if (elementTypes.isEmpty()) {
            return 0;
        }

        String placeholders = String.join(
                ",",
                Collections.nCopies(elementTypes.size(), "?")
        );

        List<Object> params = new ArrayList<>();
        params.add(candidatureId);
        params.addAll(elementTypes);

        List<Map<String, Object>> locks = jdbcTemplate.queryForList(
                """
                SELECT
                    id,
                    application_candidature_id,
                    element_type,
                    element_key
                FROM evaluation_element_lock
                WHERE candidature_id = ?
                  AND actif IS TRUE
                  AND element_type IN (%s)
                FOR UPDATE
                """.formatted(placeholders),
                params.toArray()
        );

        for (Map<String, Object> lock : locks) {
            reinitialiserDonneeMetier(lock, candidatureId);
        }

        List<Object> updateParams = new ArrayList<>();
        updateParams.add(responsableId);
        updateParams.add(clean(motif));
        updateParams.add(candidatureId);
        updateParams.addAll(elementTypes);

        int updated = jdbcTemplate.update(
                """
                UPDATE evaluation_element_lock
                SET actif = FALSE,
                    deverrouille_par_id = ?,
                    deverrouille_le = CURRENT_TIMESTAMP,
                    motif_deverrouillage = ?
                WHERE candidature_id = ?
                  AND actif IS TRUE
                  AND element_type IN (%s)
                """.formatted(placeholders),
                updateParams.toArray()
        );

        historiqueActionService.enregistrerAction(
                responsableId,
                candidatureId,
                null,
                "EVALUATION_ELEMENTS_REINITIALISES",
                updated
                        + " élément(s) métier réinitialisé(s) pour réouverture. Étapes : "
                        + String.join(", ", codesEtapes)
                        + " | Motif : "
                        + safe(motif)
        );

        return updated;
    }

    private void reinitialiserDonneeMetier(
            Map<String, Object> lock,
            Long candidatureId
    ) {
        String type = String.valueOf(lock.get("element_type"));
        String key = String.valueOf(lock.get("element_key"));
        Object rawApplicationId = lock.get("application_candidature_id");
        Long applicationId = rawApplicationId instanceof Number number
                ? number.longValue()
                : null;

        switch (type) {
            case DOCUMENTS -> jdbcTemplate.update(
                    """
                    UPDATE candidature
                    SET rne_statut = 'A_VERIFIER',
                        cnss_statut = 'A_VERIFIER',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    candidatureId
            );

            case SOLVABILITE -> jdbcTemplate.update(
                    """
                    UPDATE candidature
                    SET solvabilite_date_validation = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    candidatureId
            );

            case CRITERE -> jdbcTemplate.update(
                    """
                    UPDATE evaluation_critere
                    SET statut = 'A_VERIFIER',
                        note_obtenue = 0,
                        commentaire_evaluateur = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE reponse_critere_id = ?
                    """,
                    Long.valueOf(key)
            );

            case DECISION -> jdbcTemplate.update(
                    """
                    UPDATE application_candidature
                    SET decision_finale = NULL,
                        observation_finale = NULL,
                        date_decision = NULL,
                        evaluateur_decision_id = NULL
                    WHERE id = ?
                    """,
                    Long.valueOf(key)
            );

            case ZONE_REFERENCE -> {
                jdbcTemplate.update(
                        """
                        UPDATE projet_reference
                        SET zone_validee = FALSE
                        WHERE id = ?
                        """,
                        Long.valueOf(key)
                );

                if (applicationId != null) {
                    jdbcTemplate.update(
                            """
                            UPDATE classement_zone
                            SET actif = FALSE
                            WHERE application_candidature_id = ?
                              AND COALESCE(actif, FALSE) IS TRUE
                            """,
                            applicationId
                    );
                }
            }

            default -> {
                // Aucun reset métier.
            }
        }
    }

    // =====================================================
    // CONTRÔLES MÉTIER
    // =====================================================

    private LockContext context(
            Long utilisateurId,
            Long candidatureId,
            Long applicationCandidatureId,
            String type,
            String key,
            WorkflowEtapeElEmar step
    ) {
        return new LockContext(
                utilisateurId,
                candidatureId,
                applicationCandidatureId,
                type,
                key,
                step != null ? step.getCodeEtape() : null
        );
    }

    private Long currentUserId() {
        Long utilisateurId = currentUserService.getCurrentUserId();
        permissionService.exigerUtilisateurActif(utilisateurId);
        return utilisateurId;
    }

    private void verifierDocumentsNonFinalises(Long candidatureId) {
        Map<String, Object> row;

        try {
            row = jdbcTemplate.queryForMap(
                    """
                    SELECT
                        UPPER(COALESCE(rne_statut, 'A_VERIFIER')) AS rne_statut,
                        UPPER(COALESCE(cnss_statut, 'A_VERIFIER')) AS cnss_statut
                    FROM candidature
                    WHERE id = ?
                    FOR UPDATE
                    """,
                    candidatureId
            );
        } catch (EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Candidature introuvable."
            );
        }

        String rne = String.valueOf(row.get("rne_statut"));
        String cnss = String.valueOf(row.get("cnss_statut"));

        if (estStatutDocumentFinal(rne) && estStatutDocumentFinal(cnss)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Le contrôle administratif est déjà enregistré."
            );
        }
    }

    private boolean estStatutDocumentFinal(String value) {
        return "CONFORME".equalsIgnoreCase(value)
                || "NON_CONFORME".equalsIgnoreCase(value);
    }

    private void verifierSolvabiliteNonFinalisee(Long candidatureId) {
        Boolean finalisee = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM candidature c
                    WHERE c.id = ?
                      AND c.solvabilite_date_validation IS NOT NULL
                )
                """,
                Boolean.class,
                candidatureId
        );

        if (Boolean.TRUE.equals(finalisee)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La solvabilité est déjà enregistrée."
            );
        }
    }

    private void verifierCritereNonFinalise(Long reponseCritereId) {
        Boolean finalise = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM evaluation_critere ec
                    WHERE ec.reponse_critere_id = ?
                      AND (
                            UPPER(COALESCE(ec.statut, 'A_VERIFIER')) <> 'A_VERIFIER'
                            OR NULLIF(TRIM(COALESCE(ec.commentaire_evaluateur, '')), '') IS NOT NULL
                          )
                )
                """,
                Boolean.class,
                reponseCritereId
        );

        if (Boolean.TRUE.equals(finalise)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce critère est déjà enregistré."
            );
        }
    }

    private void verifierReferenceNonFinalisee(Long referenceProjetId) {
        Boolean finalisee = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM projet_reference pr
                    WHERE pr.id = ?
                      AND COALESCE(pr.zone_validee, FALSE) IS TRUE
                )
                """,
                Boolean.class,
                referenceProjetId
        );

        if (Boolean.TRUE.equals(finalisee)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La zone de cette référence est déjà enregistrée."
            );
        }
    }

    private void verifierLotSansDecision(Long applicationCandidatureId) {
        Boolean decided = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM application_candidature ac
                    WHERE ac.id = ?
                      AND ac.decision_finale IS NOT NULL
                )
                """,
                Boolean.class,
                applicationCandidatureId
        );

        if (Boolean.TRUE.equals(decided)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La décision finale de ce domaine est déjà enregistrée."
            );
        }
    }

    private void verifierLotAdmis(Long applicationCandidatureId) {
        String decision;
        try {
            decision = jdbcTemplate.queryForObject(
                    """
                    SELECT UPPER(TRIM(COALESCE(decision_finale::text, '')))
                    FROM application_candidature
                    WHERE id = ?
                    """,
                    String.class,
                    applicationCandidatureId
            );
        } catch (EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Application candidature introuvable."
            );
        }

        if (decision == null || decision.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La décision finale doit être enregistrée avant le classement par zone."
            );
        }

        if (!"ADMIS".equals(decision)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Un domaine rejeté ne peut pas être classé par zone."
            );
        }
    }

    private void exigerNonVerrouille(
            Long candidatureId,
            String elementType,
            String elementKey
    ) {
        Boolean locked = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM evaluation_element_lock l
                    WHERE l.candidature_id = ?
                      AND l.element_type = ?
                      AND l.element_key = ?
                      AND l.actif IS TRUE
                )
                """,
                Boolean.class,
                candidatureId,
                elementType,
                elementKey
        );

        if (Boolean.TRUE.equals(locked)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    messageVerrouille(elementType)
            );
        }
    }

    private String messageVerrouille(String elementType) {
        return switch (elementType) {
            case DOCUMENTS -> "Le contrôle administratif est déjà enregistré.";
            case SOLVABILITE -> "La solvabilité est déjà enregistrée.";
            case CRITERE -> "Ce critère est déjà enregistré.";
            case ZONE_REFERENCE -> "La zone de cette référence est déjà enregistrée.";
            case DECISION -> "La décision finale est déjà enregistrée.";
            default -> "Cet élément est déjà enregistré.";
        };
    }

    private void verifierReponseDansApplication(
            Long reponseCritereId,
            Long applicationCandidatureId
    ) {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM reponse_critere rc
                    WHERE rc.id = ?
                      AND rc.application_candidature_id = ?
                )
                """,
                Boolean.class,
                reponseCritereId,
                applicationCandidatureId
        );

        if (!Boolean.TRUE.equals(exists)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "La réponse critère n'appartient pas à ce domaine."
            );
        }
    }

    private void verifierReferenceDansApplication(
            Long referenceProjetId,
            Long applicationCandidatureId
    ) {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM projet_reference pr
                    WHERE pr.id = ?
                      AND pr.application_candidature_id = ?
                )
                """,
                Boolean.class,
                referenceProjetId,
                applicationCandidatureId
        );

        if (!Boolean.TRUE.equals(exists)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "La référence n'appartient pas à ce domaine."
            );
        }
    }

    private Long candidatureIdDepuisApplication(Long applicationCandidatureId) {
        try {
            return jdbcTemplate.queryForObject(
                    """
                    SELECT candidature_id
                    FROM application_candidature
                    WHERE id = ?
                    """,
                    Long.class,
                    applicationCandidatureId
            );
        } catch (EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Application candidature introuvable."
            );
        }
    }

    private void verrouTransaction(
            Long candidatureId,
            String elementType,
            String elementKey
    ) {
        String key = candidatureId + ":" + elementType + ":" + elementKey;
        jdbcTemplate.queryForList(
                "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
                key
        );
    }

    private void validatePositive(Long value, String message) {
        if (value == null || value <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    message
            );
        }
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private String safe(String value) {
        String cleaned = clean(value);
        return cleaned == null ? "-" : cleaned;
    }
}
