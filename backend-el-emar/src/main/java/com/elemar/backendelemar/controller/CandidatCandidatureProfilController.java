package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.LotLightResponse;
import com.elemar.backendelemar.dto.UpdateCandidatureProfilRequest;
import com.elemar.backendelemar.entity.Candidature;
import com.elemar.backendelemar.service.CandidatCandidatureProfilService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/candidat/candidature")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class CandidatCandidatureProfilController {

    private final CandidatCandidatureProfilService service;

    @GetMapping("/{userId}")
    public Candidature getProfil(
            @PathVariable Long userId
    ) {
        return service.getProfilByUserId(userId);
    }

    @PutMapping("/{userId}")
    public Candidature updateProfil(
            @PathVariable Long userId,
            @RequestBody UpdateCandidatureProfilRequest request
    ) {
        return service.updateProfilByUserId(userId, request);
    }
}