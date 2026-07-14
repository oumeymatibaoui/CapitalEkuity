package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.CreateUtilisateurRequest;
import com.elemar.backendelemar.dto.UpdateUtilisateurRoleRequest;
import com.elemar.backendelemar.dto.UtilisateurAdminResponse;
import com.elemar.backendelemar.service.UtilisateurAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/el-emar/utilisateurs")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class UtilisateurAdminController {

    private final UtilisateurAdminService utilisateurAdminService;

    @GetMapping("/test")
    public String test() {
        return "UtilisateurAdminController OK";
    }

    @GetMapping
    public List<UtilisateurAdminResponse> getAllUsers() {
        return utilisateurAdminService.getAllUsers();
    }

    @PostMapping
    public UtilisateurAdminResponse createUser(
            @RequestBody CreateUtilisateurRequest request
    ) {
        return utilisateurAdminService.createUser(request);
    }

    @PatchMapping("/{utilisateurId}/role")
    public UtilisateurAdminResponse updateRole(
            @PathVariable Long utilisateurId,
            @RequestBody UpdateUtilisateurRoleRequest request
    ) {
        return utilisateurAdminService.updateRole(utilisateurId, request);
    }

    @PatchMapping("/{utilisateurId}/toggle-actif")
    public UtilisateurAdminResponse toggleActif(
            @PathVariable Long utilisateurId
    ) {
        return utilisateurAdminService.toggleActif(utilisateurId);
    }
}