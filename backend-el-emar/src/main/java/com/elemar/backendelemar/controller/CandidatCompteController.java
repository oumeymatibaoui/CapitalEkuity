package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.ChangePasswordRequest;
import com.elemar.backendelemar.service.CandidatCompteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/candidat/compte")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class CandidatCompteController {

    private final CandidatCompteService service;

    @PutMapping("/{userId}/mot-de-passe")
    public void changePassword(
            @PathVariable Long userId,
            @RequestBody ChangePasswordRequest request
    ) {
        service.changePassword(userId, request);
    }
}