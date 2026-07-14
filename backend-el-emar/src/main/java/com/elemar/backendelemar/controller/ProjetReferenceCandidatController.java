package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.ProjetReferenceRequest;
import com.elemar.backendelemar.dto.ProjetReferenceResponse;
import com.elemar.backendelemar.service.ProjetReferenceCandidatService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/cnd/references")
@CrossOrigin(origins = "http://localhost:4200")
public class ProjetReferenceCandidatController {

    private final ProjetReferenceCandidatService service;

    @GetMapping("/{candidatureId}/lots/{lotId}")
    public List<ProjetReferenceResponse> getReferences(
            @PathVariable Long candidatureId,
            @PathVariable Long lotId
    ) {
        return service.getReferences(candidatureId, lotId);
    }

    @PutMapping("/{candidatureId}/lots/{lotId}")
    public List<ProjetReferenceResponse> saveReferences(
            @PathVariable Long candidatureId,
            @PathVariable Long lotId,
            @RequestBody List<ProjetReferenceRequest> requests
    ) {
        return service.saveReferences(candidatureId, lotId, requests);
    }

    @PostMapping("/{candidatureId}/lots/{lotId}/projets/{projetReferenceId}/files/{typeFichier}")
    public ProjetReferenceResponse uploadReferenceFile(
            @PathVariable Long candidatureId,
            @PathVariable Long lotId,
            @PathVariable Long projetReferenceId,
            @PathVariable String typeFichier,
            @RequestParam("file") MultipartFile file
    ) {
        return service.uploadReferenceFile(
                candidatureId,
                lotId,
                projetReferenceId,
                typeFichier,
                file
        );
    }
}