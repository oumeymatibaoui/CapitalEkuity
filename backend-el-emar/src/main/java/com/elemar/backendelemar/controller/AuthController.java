package com.elemar.backendelemar.controller;
import com.elemar.backendelemar.dto.CandidatLoginRequest;
import com.elemar.backendelemar.dto.CandidatLoginResponse;
import com.elemar.backendelemar.dto.LoginRequest;
import com.elemar.backendelemar.service.AuthService;
import com.elemar.backendelemar.service.CandidatAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    private final AuthService authService;
    private final CandidatAuthService candidatAuthService;

    @PostMapping("/el-emar/login")
    public Object loginElEmar(@RequestBody LoginRequest request) {
        return authService.loginElEmar(request);
    }

    @PostMapping("/candidat/login")
    public CandidatLoginResponse loginCandidat(
            @RequestBody CandidatLoginRequest request
    ) {
        return candidatAuthService.login(request);
    }
}