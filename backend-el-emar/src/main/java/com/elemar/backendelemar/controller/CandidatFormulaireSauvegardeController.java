package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.*;
import com.elemar.backendelemar.service.CandidatFormulaireSauvegardeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/cnd/formulaire-candidature")
@CrossOrigin(origins = "http://localhost:4200")
public class CandidatFormulaireSauvegardeController {

    private final CandidatFormulaireSauvegardeService service;

    @PutMapping("/{candidatureId}/lots/{lotId}/reponses")
    public FormulaireLotSavedResponse saveReponses(
            @PathVariable Long candidatureId,
            @PathVariable Long lotId,
            @RequestBody FormulaireLotSaveRequest request
    ) {
        return service.saveReponses(candidatureId, lotId, request);
    }

    @PostMapping("/{candidatureId}/lots/{lotId}/pieces/{criterePieceId}")
    public PieceCritereDeposeeResponse uploadPieceCritere(
            @PathVariable Long candidatureId,
            @PathVariable Long lotId,
            @PathVariable Long criterePieceId,
            @RequestParam("file") MultipartFile file
    ) {
        return service.uploadPieceCritere(candidatureId, lotId, criterePieceId, file);
    }

    @GetMapping("/{candidatureId}/lots/{lotId}")
    public FormulaireLotSavedResponse getSavedFormulaire(
            @PathVariable Long candidatureId,
            @PathVariable Long lotId
    ) {
        return service.getSavedFormulaire(candidatureId, lotId);
    }

    @GetMapping("/{candidatureId}/lots-remplis")
    public List<Long> getLotsRemplis(
            @PathVariable Long candidatureId
    ) {
        return service.getLotsRemplis(candidatureId);
    }
}