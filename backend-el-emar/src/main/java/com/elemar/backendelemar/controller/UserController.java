package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.CandidatLoginRequest;
import com.elemar.backendelemar.dto.CandidatLoginResponse;
import com.elemar.backendelemar.service.CandidatAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class UserController {

    private final CandidatAuthService candidatAuthService;

    @PostMapping("/candidat/login/CND")
    public CandidatLoginResponse loginCandidat(
            @RequestBody CandidatLoginRequest request
    ) {
        return candidatAuthService.login(request);
    }
}