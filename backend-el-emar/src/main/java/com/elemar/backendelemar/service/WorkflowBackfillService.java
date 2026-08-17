package com.elemar.backendelemar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkflowBackfillService {

    private final JdbcTemplate jdbcTemplate;
    private final WorkflowElEmarService workflowService;
    private final WorkflowGovernanceService governanceService;

    /**
     * Crée le workflow seulement pour les candidatures SOUMIS qui n'en ont aucun.
     */
    @Transactional
    public int initialiserDossiersSoumisSansWorkflow(Long adminId) {
        governanceService.exigerAdminStructure(adminId);

        List<Long> candidatureIds = jdbcTemplate.queryForList(
                """
                SELECT c.id
                FROM candidature c
                WHERE UPPER(COALESCE(c.statut::text, '')) = 'SOUMIS'
                  AND NOT EXISTS (
                      SELECT 1
                      FROM workflow_etape_el_emar w
                      WHERE w.candidature_id = c.id
                  )
                ORDER BY c.id
                """,
                Long.class
        );

        int count = 0;
        for (Long candidatureId : candidatureIds) {
            workflowService.initialiserDepuisModele(candidatureId);
            count++;
        }

        return count;
    }

    /**
     * Reconstruit uniquement les circuits qui n'ont JAMAIS commencé.
     *
     * Avec un modèle dynamique, on ne compare plus le nombre d'étapes à 4.
     * L'action remplace simplement tout circuit encore totalement non démarré
     * par le modèle global actuellement enregistré.
     */
    @Transactional
    public int reconstruireDossiersNonDemarres(Long adminId) {
        governanceService.exigerAdminStructure(adminId);

        List<Long> ids = jdbcTemplate.queryForList(
                """
                SELECT w.candidature_id
                FROM workflow_etape_el_emar w
                JOIN candidature c ON c.id = w.candidature_id
                WHERE UPPER(COALESCE(c.statut::text, '')) = 'SOUMIS'
                GROUP BY w.candidature_id
                HAVING BOOL_AND(w.date_debut IS NULL)
                   AND BOOL_AND(w.date_fin IS NULL)
                   AND BOOL_AND(w.date_reouverture IS NULL)
                   AND BOOL_AND(
                       UPPER(w.statut::text) IN ('A_TRAITER', 'EN_ATTENTE')
                   )
                ORDER BY w.candidature_id
                """,
                Long.class
        );

        int count = 0;

        for (Long candidatureId : ids) {
            jdbcTemplate.update(
                    "DELETE FROM workflow_etape_el_emar WHERE candidature_id = ?",
                    candidatureId
            );

            workflowService.initialiserDepuisModele(candidatureId);
            count++;
        }

        return count;
    }
}
