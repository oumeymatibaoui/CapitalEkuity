package com.elemar.backendelemar.service;

import com.elemar.backendelemar.entity.WorkflowEtapeElEmar;
import com.elemar.backendelemar.enums.StatutWorkflowEtape;
import com.elemar.backendelemar.repository.WorkflowEtapeElEmarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class WorkflowAccessService {

    private final WorkflowEtapeElEmarRepository workflowRepository;
    private final WorkflowPermissionService permissionService;
    private final JdbcTemplate jdbcTemplate;

    private static final List<StatutWorkflowEtape> STATUTS_ACTIFS = List.of(
            StatutWorkflowEtape.A_TRAITER,
            StatutWorkflowEtape.EN_COURS,
            StatutWorkflowEtape.REOUVERTE
    );

    // =====================================================
    // ÉTAPE ACTIVE GÉNÉRALE
    // =====================================================

    @Transactional(readOnly = true)
    public WorkflowEtapeElEmar verifierModification(
            Long candidatureId,
            Long utilisateurId,
            String permissionCode
    ) {
        if (candidatureId == null || candidatureId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant candidature obligatoire."
            );
        }

        permissionService.exigerUtilisateurActif(utilisateurId);

        if (permissionCode != null && !permissionCode.trim().isEmpty()) {
            permissionService.exigerPermission(
                    utilisateurId,
                    permissionCode.trim().toUpperCase()
            );
        }

        List<WorkflowEtapeElEmar> actives = workflowRepository
                .findActiveByCandidature(
                        candidatureId,
                        STATUTS_ACTIFS
                );

        if (actives.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Aucune étape active n'est disponible pour ce dossier."
            );
        }

        if (actives.size() > 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Plusieurs étapes actives ont été détectées. Le workflow doit être corrigé."
            );
        }

        WorkflowEtapeElEmar active = actives.get(0);

        if (active.getUtilisateurAffecte() == null
                || active.getUtilisateurAffecte().getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Aucun utilisateur n'est affecté à l'étape active."
            );
        }

        if (!Objects.equals(
                active.getUtilisateurAffecte().getId(),
                utilisateurId
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cette étape est actuellement affectée à un autre utilisateur."
            );
        }

        if (active.getStatut() != StatutWorkflowEtape.EN_COURS) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Commencez votre étape avant de modifier le dossier."
            );
        }

        return active;
    }

    // =====================================================
    // ÉTAPE MÉTIER PRÉCISE
    // =====================================================

    @Transactional(readOnly = true)
    public WorkflowEtapeElEmar verifierEtapeMetier(
            Long candidatureId,
            Long utilisateurId,
            String permissionCode,
            String codeEtapeAttendu
    ) {
        WorkflowEtapeElEmar active = verifierModification(
                candidatureId,
                utilisateurId,
                permissionCode
        );

        String expected = WorkflowStepCodes.normalize(codeEtapeAttendu);
        String actual = WorkflowStepCodes.normalize(active.getCodeEtape());

        if (!expected.equals(actual)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cette action n'est pas disponible pendant l'étape « "
                            + safe(active.getLibelleEtape())
                            + " »."
            );
        }

        return active;
    }

    /**
     * Compatibilité avec le code existant de décision.
     * La décision n'est PLUS liée à « la dernière étape ».
     */
    @Transactional(readOnly = true)
    public WorkflowEtapeElEmar verifierModificationFinale(
            Long candidatureId,
            Long utilisateurId,
            String permissionCode
    ) {
        return verifierEtapeMetier(
                candidatureId,
                utilisateurId,
                permissionCode,
                WorkflowStepCodes.DECISION_FINALE
        );
    }

    // =====================================================
    // CRITÈRE TECHNIQUE + CATÉGORIE
    // =====================================================

    @Transactional(readOnly = true)
    public WorkflowEtapeElEmar verifierModificationCritere(
            Long candidatureId,
            Long utilisateurId,
            Long reponseCritereId
    ) {
        if (reponseCritereId == null || reponseCritereId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant de la réponse critère obligatoire."
            );
        }

        WorkflowEtapeElEmar active = verifierEtapeMetier(
                candidatureId,
                utilisateurId,
                "EVAL_ACTION_NOTER_CRITERE",
                WorkflowStepCodes.EVALUATION_TECHNIQUE
        );

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                SELECT ce.categorie_evaluation_id
                FROM reponse_critere rc
                JOIN critere_evaluation ce
                  ON ce.id = rc.critere_evaluation_id
                WHERE rc.id = ?
                """,
                reponseCritereId
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Réponse critère introuvable."
            );
        }

        Object rawCategorieId = rows.get(0).get("categorie_evaluation_id");

        if (rawCategorieId == null) {
            if (!permissionService.estAdministrateur(utilisateurId)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Ce critère ne possède aucune catégorie d'évaluation. Corrigez sa configuration."
                );
            }
            return active;
        }

        permissionService.exigerAccesCategorie(
                utilisateurId,
                ((Number) rawCategorieId).longValue()
        );

        return active;
    }

    @Transactional(readOnly = true)
    public boolean peutModifier(
            Long candidatureId,
            Long utilisateurId,
            String permissionCode
    ) {
        try {
            verifierModification(candidatureId, utilisateurId, permissionCode);
            return true;
        } catch (ResponseStatusException exception) {
            return false;
        }
    }

    private String safe(String value) {
        String cleaned = value == null ? "" : value.trim();
        return cleaned.isEmpty() ? "étape active" : cleaned;
    }
}
