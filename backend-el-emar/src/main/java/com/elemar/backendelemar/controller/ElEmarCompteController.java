package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.ChangePasswordRequest;
import com.elemar.backendelemar.dto.ElEmarCompteResponse;
import com.elemar.backendelemar.dto.ElEmarCompteUpdateRequest;
import com.elemar.backendelemar.dto.HistoriqueActionResponse;
import com.elemar.backendelemar.service.CurrentUserService;
import com.elemar.backendelemar.service.ElEmarCompteService;
import com.elemar.backendelemar.service.HistoriqueActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/el-emar/compte")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ElEmarCompteController {

    private final ElEmarCompteService elEmarCompteService;
    private final HistoriqueActionService historiqueActionService;
    private final CurrentUserService currentUserService;

    // =====================================================
    // TEST
    // =====================================================

    @GetMapping("/test")
    public String test() {
        return "ElEmarCompteController OK";
    }

    // =====================================================
    // MON COMPTE
    //
    // IMPORTANT :
    // aucun utilisateurId n'est envoyé dans l'URL.
    // L'identité vient uniquement du JWT.
    // =====================================================

    @GetMapping("/me")
    public ElEmarCompteResponse getMyCompte() {

        Long utilisateurId =
                currentUserService.getCurrentUserId();

        return elEmarCompteService.getCompte(
                utilisateurId
        );
    }

    // =====================================================
    // MODIFIER MON COMPTE
    // =====================================================

    @PutMapping("/me")
    public ElEmarCompteResponse updateMyCompte(
            @RequestBody ElEmarCompteUpdateRequest request
    ) {

        Long utilisateurId =
                currentUserService.getCurrentUserId();

        return elEmarCompteService.updateCompte(
                utilisateurId,
                request
        );
    }

    // =====================================================
    // CHANGER MON MOT DE PASSE
    // =====================================================

    @PutMapping("/me/password")
    public void changeMyPassword(
            @RequestBody ChangePasswordRequest request
    ) {

        Long utilisateurId =
                currentUserService.getCurrentUserId();

        elEmarCompteService.changePassword(
                utilisateurId,
                request
        );
    }

    // =====================================================
    // MON HISTORIQUE
    // =====================================================

    @GetMapping("/me/historique")
    public List<HistoriqueActionResponse> getMyHistorique() {

        Long utilisateurId =
                currentUserService.getCurrentUserId();

        return historiqueActionService
                .getHistoriqueByUtilisateur(
                        utilisateurId
                );
    }
}
