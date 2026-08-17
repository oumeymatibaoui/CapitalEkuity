package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.ReaffecterWorkflowRequest;
import com.elemar.backendelemar.dto.ReouvrirWorkflowRequest;
import com.elemar.backendelemar.dto.TransmettreWorkflowRequest;
import com.elemar.backendelemar.dto.WorkflowCandidatureResponse;
import com.elemar.backendelemar.dto.WorkflowEtapeResponse;
import com.elemar.backendelemar.dto.WorkflowUtilisateurAffectableResponse;
import com.elemar.backendelemar.service.CurrentUserService;
import com.elemar.backendelemar.service.WorkflowElEmarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/el-emar/workflow")
@RequiredArgsConstructor
public class WorkflowElEmarController {

    private final WorkflowElEmarService workflowService;
    private final CurrentUserService currentUserService;

    // =====================================================
    // CONSULTATION D'UN DOSSIER
    // =====================================================

    @GetMapping("/candidatures/{candidatureId}")
    public ResponseEntity<WorkflowCandidatureResponse> getWorkflow(
            @PathVariable Long candidatureId
    ) {
        return ResponseEntity.ok(
                workflowService.getWorkflow(
                        candidatureId,
                        currentUserService.getCurrentUserId()
                )
        );
    }

    // =====================================================
    // MES ÉTAPES
    // =====================================================

    @GetMapping("/mes-etapes")
    public ResponseEntity<List<WorkflowEtapeResponse>> getMesEtapes() {
        return ResponseEntity.ok(
                workflowService.getMesEtapes(
                        currentUserService.getCurrentUserId()
                )
        );
    }

    // =====================================================
    // COMMENCER
    // =====================================================

    @PatchMapping("/etapes/{etapeId}/demarrer")
    public ResponseEntity<WorkflowEtapeResponse> demarrer(
            @PathVariable Long etapeId
    ) {
        return ResponseEntity.ok(
                workflowService.demarrer(
                        etapeId,
                        currentUserService.getCurrentUserId()
                )
        );
    }

    // =====================================================
    // TRANSMETTRE
    // =====================================================

    @PatchMapping("/etapes/{etapeId}/transmettre")
    public ResponseEntity<WorkflowCandidatureResponse> transmettre(
            @PathVariable Long etapeId,
            @RequestBody(required = false)
            TransmettreWorkflowRequest request
    ) {
        if (request == null) {
            request = new TransmettreWorkflowRequest();
        }

        request.setUtilisateurId(
                currentUserService.getCurrentUserId()
        );

        return ResponseEntity.ok(
                workflowService.transmettre(
                        etapeId,
                        request
                )
        );
    }

    // =====================================================
    // RÉOUVRIR — ADMIN IT UNIQUEMENT
    // =====================================================

    @PatchMapping("/etapes/{etapeId}/reouvrir")
    public ResponseEntity<WorkflowCandidatureResponse> reouvrir(
            @PathVariable Long etapeId,
            @RequestBody ReouvrirWorkflowRequest request
    ) {
        request.setResponsableId(
                currentUserService.getCurrentUserId()
        );

        return ResponseEntity.ok(
                workflowService.reouvrir(
                        etapeId,
                        request
                )
        );
    }

    // =====================================================
    // RÉAFFECTER — ADMIN IT OU ADMIN ACHAT
    // =====================================================

    @PatchMapping("/etapes/{etapeId}/reaffecter")
    public ResponseEntity<WorkflowEtapeResponse> reaffecter(
            @PathVariable Long etapeId,
            @RequestBody ReaffecterWorkflowRequest request
    ) {
        request.setResponsableId(
                currentUserService.getCurrentUserId()
        );

        return ResponseEntity.ok(
                workflowService.reaffecter(
                        etapeId,
                        request
                )
        );
    }

    // =====================================================
    // UTILISATEURS AFFECTABLES À L'ÉTAPE
    // =====================================================

    @GetMapping("/etapes/{etapeId}/utilisateurs-affectables")
    public ResponseEntity<List<WorkflowUtilisateurAffectableResponse>>
    getUtilisateursAffectables(
            @PathVariable Long etapeId
    ) {
        return ResponseEntity.ok(
                workflowService.getUtilisateursAffectables(
                        etapeId,
                        currentUserService.getCurrentUserId()
                )
        );
    }
}
