package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.*;
import com.elemar.backendelemar.service.ElEmarEvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/el-emar/evaluations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ElEmarEvaluationController {

    private final ElEmarEvaluationService elEmarEvaluationService;
    @GetMapping("/classement-candidats-par-lot")
    public List<CandidatLotClassementResponse> getClassementCandidatsParLot(
            @RequestParam(defaultValue = "80") BigDecimal minNote,
            @RequestParam(defaultValue = "false") Boolean admisOnly
    ) {
        return elEmarEvaluationService.getClassementCandidatsParLot(minNote, admisOnly);
    }
    @PutMapping("/candidatures/{candidatureId}/solvabilite")
    public SaveSolvabiliteResponse saveSolvabilite(
            @PathVariable Long candidatureId,
            @RequestBody SaveSolvabiliteRequest request
    ) {
        return elEmarEvaluationService.saveSolvabilite(
                candidatureId,
                request
        );
    }
    @GetMapping("/candidatures")
    public List<ElEmarCandidatureListItemResponse> getCandidaturesSoumises(
            @RequestParam(required = false) Long typeIntervenantId
    ) {
        return elEmarEvaluationService.getCandidaturesSoumises(typeIntervenantId);
    }

    @GetMapping("/candidatures/{candidatureId}")
    public CandidatureDetailResponse getCandidatureDetail(
            @PathVariable Long candidatureId
    ) {
        return elEmarEvaluationService.getCandidatureDetail(candidatureId);
    }

    @PutMapping("/applications/{applicationCandidatureId}/reponses/{reponseCritereId}")
    public SaveCritereEvaluationResponse saveCritereEvaluation(
            @PathVariable Long applicationCandidatureId,
            @PathVariable Long reponseCritereId,
            @RequestParam(required = false) Long evaluateurId,
            @RequestBody SaveCritereEvaluationRequest request
    ) {
        if (request.getEvaluateurId() == null) {
            request.setEvaluateurId(evaluateurId);
        }

        return elEmarEvaluationService.saveCritereEvaluation(
                applicationCandidatureId,
                reponseCritereId,
                request
        );
    }

    @PutMapping("/applications/{applicationCandidatureId}/decision-finale")
    public SaveDecisionFinaleResponse saveDecisionFinaleParLot(
            @PathVariable Long applicationCandidatureId,
            @RequestParam(required = false) Long evaluateurId,
            @RequestBody SaveDecisionFinaleRequest request
    ) {
        if (request.getEvaluateurId() == null) {
            request.setEvaluateurId(evaluateurId);
        }

        return elEmarEvaluationService.saveDecisionFinaleParLot(
                applicationCandidatureId,
                request
        );
    }

    @GetMapping("/pieces/{pieceDeposeeId}/pdf")
    public ResponseEntity<Resource> openPieceCriterePdf(
            @PathVariable Long pieceDeposeeId
    ) {
        return elEmarEvaluationService.openPieceCriterePdf(pieceDeposeeId);
    }

    @GetMapping("/candidatures/{candidatureId}/rne/pdf")
    public ResponseEntity<Resource> openRnePdf(
            @PathVariable Long candidatureId
    ) {
        return elEmarEvaluationService.openRnePdf(candidatureId);
    }

    @GetMapping("/candidatures/{candidatureId}/cnss/pdf")
    public ResponseEntity<Resource> openCnssPdf(
            @PathVariable Long candidatureId
    ) {
        return elEmarEvaluationService.openCnssPdf(candidatureId);
    }

    @GetMapping("/references/{projetReferenceId}/files/{typeFichier}")
    public ResponseEntity<Resource> openReferenceFile(
            @PathVariable Long projetReferenceId,
            @PathVariable String typeFichier
    ) {
        return elEmarEvaluationService.openReferenceFile(
                projetReferenceId,
                typeFichier
        );
    }
    @PutMapping(
            "/candidatures/{candidatureId}/documents-statut"
    )
    public SaveDocumentsStatutResponse saveDocumentsStatut(
            @PathVariable Long candidatureId,
            @RequestBody SaveDocumentsStatutRequest request
    ) {
        return elEmarEvaluationService
                .saveDocumentsStatut(
                        candidatureId,
                        request
                );
    }
}