package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.HistoriqueActionResponse;
import com.elemar.backendelemar.service.HistoriqueActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/historique-actions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class HistoriqueActionController {

    private final HistoriqueActionService historiqueActionService;

    @GetMapping("/test")
    public String test() {
        return "HistoriqueActionController OK";
    }

    @GetMapping
    public List<HistoriqueActionResponse> getAllHistorique() {
        return historiqueActionService.getAllHistorique();
    }

    @GetMapping("/candidature/{candidatureId}")
    public List<HistoriqueActionResponse> getHistoriqueByCandidature(
            @PathVariable Long candidatureId
    ) {
        return historiqueActionService.getHistoriqueByCandidature(candidatureId);
    }

    @GetMapping("/utilisateur/{utilisateurId}")
    public List<HistoriqueActionResponse> getHistoriqueByUtilisateur(
            @PathVariable Long utilisateurId
    ) {
        return historiqueActionService.getHistoriqueByUtilisateur(utilisateurId);
    }
}