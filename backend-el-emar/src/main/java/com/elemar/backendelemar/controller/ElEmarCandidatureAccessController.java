package com.elemar.backendelemar.controller;


import com.elemar.backendelemar.dto.*;
import com.elemar.backendelemar.service.ElEmarCandidatureAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/el-emar/candidatures-access")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ElEmarCandidatureAccessController {

    private final ElEmarCandidatureAccessService service;

    @PostMapping
    public CandidatureAccessResponse create(
            @RequestBody CreateCandidatureAccessRequest request
    ) {
        return service.createAccess(request);
    }

    @GetMapping
    public List<CandidatureAccessResponse> getAll() {
        return service.getAll();
    }

    @GetMapping("/{candidatureId}")
    public CandidatureAccessResponse getById(
            @PathVariable Long candidatureId
    ) {
        return service.getById(candidatureId);
    }

    @PutMapping("/{candidatureId}/lots")
    public CandidatureAccessResponse updateLots(
            @PathVariable Long candidatureId,
            @RequestBody UpdateCandidatureLotsRequest request
    ) {
        return service.updateLots(candidatureId, request);
    }

    @PostMapping("/{candidatureId}/utilisateurs")
    public GeneratedAccountResponse addUser(
            @PathVariable Long candidatureId,
            @RequestBody CreateCndUserRequest request
    ) {
        return service.addUser(candidatureId, request);
    }

    @PatchMapping("/utilisateurs/{userId}/deactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivateUser(
            @PathVariable Long userId
    ) {
        service.deactivateUser(userId);
    }
    @PatchMapping("/utilisateurs/{userId}/activate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void activateUser(
            @PathVariable Long userId
    ) {
        service.activateUser(userId);
    }
    @PatchMapping("/utilisateurs/{userId}/reset-password")
    public GeneratedAccountResponse resetPassword(
            @PathVariable Long userId
    ) {
        return service.resetPassword(userId);
    }
//    @DeleteMapping("/{candidatureId}")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void deleteCandidature(@PathVariable Long candidatureId) {
//        service.deleteCandidature(candidatureId);
//    }
    @PutMapping("/{candidatureId}")
    public CandidatureAccessResponse updateCandidature(
            @PathVariable Long candidatureId,
            @RequestBody UpdateCandidatureAccessRequest request
    ) {
        return service.updateCandidature(
                candidatureId,
                request
        );
    }


    @DeleteMapping("/{candidatureId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCandidature(
            @PathVariable Long candidatureId
    ) {
        service.deleteCandidature(
                candidatureId
        );
    }
    @PatchMapping("/{candidatureId}/deactivate")
    public CandidatureAccessResponse deactivateCandidature(
            @PathVariable Long candidatureId
    ) {
        return service.deactivateCandidature(candidatureId);
    }

    @PatchMapping("/{candidatureId}/activate")
    public CandidatureAccessResponse activateCandidature(
            @PathVariable Long candidatureId
    ) {
        return service.activateCandidature(candidatureId);
    }
}