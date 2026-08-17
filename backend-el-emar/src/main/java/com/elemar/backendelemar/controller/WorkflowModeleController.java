package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.WorkflowModeleEtapeResponse;
import com.elemar.backendelemar.dto.WorkflowModeleUpdateRequest;
import com.elemar.backendelemar.service.CurrentUserService;
import com.elemar.backendelemar.service.WorkflowBackfillService;
import com.elemar.backendelemar.service.WorkflowModeleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/el-emar/workflow-modele")
@RequiredArgsConstructor
public class WorkflowModeleController {

    private final WorkflowModeleService modeleService;
    private final WorkflowBackfillService backfillService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public ResponseEntity<List<WorkflowModeleEtapeResponse>> getModele() {
        return ResponseEntity.ok(
                modeleService.getModele(
                        currentUserService.getCurrentUserId()
                )
        );
    }

    @PutMapping
    public ResponseEntity<List<WorkflowModeleEtapeResponse>> enregistrer(
            @RequestBody WorkflowModeleUpdateRequest request
    ) {
        return ResponseEntity.ok(
                modeleService.enregistrerModele(
                        currentUserService.getCurrentUserId(),
                        request
                )
        );
    }

    @PostMapping("/initialiser-dossiers-sans-workflow")
    public ResponseEntity<Map<String, Integer>> initialiserDossiersSansWorkflow() {
        int count = backfillService.initialiserDossiersSoumisSansWorkflow(
                currentUserService.getCurrentUserId()
        );
        return ResponseEntity.ok(Map.of("nombreInitialise", count));
    }

    @PostMapping("/reconstruire-dossiers-non-demarres")
    public ResponseEntity<Map<String, Integer>> reconstruireDossiersNonDemarres() {
        int count = backfillService.reconstruireDossiersNonDemarres(
                currentUserService.getCurrentUserId()
        );
        return ResponseEntity.ok(Map.of("nombreReconstruit", count));
    }
}
