package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.CandidatureInfoRequest;
import com.elemar.backendelemar.dto.CandidatureResponse;
import com.elemar.backendelemar.dto.LotLightResponse;
import com.elemar.backendelemar.dto.LotOptionResponse;
import com.elemar.backendelemar.service.CandidatCandidatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/cnd/candidatures")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class CandidatCandidatureController {

    private final CandidatCandidatureService candidatureService;

    @GetMapping("/current/{utilisateurId}")
    public CandidatureResponse getCurrent(
            @PathVariable Long utilisateurId
    ) {
        return candidatureService.getOrCreateCurrent(utilisateurId);
    }

    @PutMapping("/{utilisateurId}/societe")
    public CandidatureResponse updateInformationsSociete(
            @PathVariable Long utilisateurId,
            @RequestBody CandidatureInfoRequest request
    ) {
        return candidatureService.updateInformationsSociete(utilisateurId, request);
    }

    @PostMapping("/{candidatureId}/piece-rne")
    public CandidatureResponse uploadRne(
            @PathVariable Long candidatureId,
            @RequestParam("file") MultipartFile file
    ) {
        return candidatureService.uploadRne(candidatureId, file);
    }

    @PostMapping("/{candidatureId}/piece-cnss")
    public CandidatureResponse uploadCnss(
            @PathVariable Long candidatureId,
            @RequestParam("file") MultipartFile file
    ) {
        return candidatureService.uploadCnss(candidatureId, file);
    }

    @PostMapping("/{candidatureId}/submit")
    public CandidatureResponse submitCandidature(
            @PathVariable Long candidatureId
    ) {
        return candidatureService.submitCandidature(candidatureId);
    }

    @GetMapping("/{candidatureId}/lots-autorises")
    public List<LotOptionResponse> getLotsAutorises(
            @PathVariable Long candidatureId
    ) {
        return candidatureService.getLotsAutorises(candidatureId);
    }
}