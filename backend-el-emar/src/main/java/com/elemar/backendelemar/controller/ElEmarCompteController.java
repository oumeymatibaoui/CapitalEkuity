package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.ChangePasswordRequest;
import com.elemar.backendelemar.dto.ElEmarCompteResponse;
import com.elemar.backendelemar.dto.ElEmarCompteUpdateRequest;
import com.elemar.backendelemar.dto.HistoriqueActionResponse;
import com.elemar.backendelemar.service.ElEmarCompteService;
import com.elemar.backendelemar.service.HistoriqueActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/el-emar/compte")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ElEmarCompteController {

    private final ElEmarCompteService elEmarCompteService;
    private final HistoriqueActionService historiqueActionService;

    @GetMapping("/test")
    public String test() {
        return "ElEmarCompteController OK";
    }

    @GetMapping("/{utilisateurId}")
    public ElEmarCompteResponse getCompte(
            @PathVariable Long utilisateurId
    ) {
        return elEmarCompteService.getCompte(utilisateurId);
    }

    @PutMapping("/{utilisateurId}")
    public ElEmarCompteResponse updateCompte(
            @PathVariable Long utilisateurId,
            @RequestBody ElEmarCompteUpdateRequest request
    ) {
        return elEmarCompteService.updateCompte(utilisateurId, request);
    }

    @PutMapping("/{utilisateurId}/password")
    public void changePassword(
            @PathVariable Long utilisateurId,
            @RequestBody ChangePasswordRequest request
    ) {
        elEmarCompteService.changePassword(utilisateurId, request);
    }

    @GetMapping("/{utilisateurId}/historique")
    public List<HistoriqueActionResponse> getHistorique(
            @PathVariable Long utilisateurId
    ) {
        return historiqueActionService.getHistoriqueByUtilisateur(utilisateurId);
    }
}