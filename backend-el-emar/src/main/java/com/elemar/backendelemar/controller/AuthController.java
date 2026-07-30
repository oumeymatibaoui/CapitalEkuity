package com.elemar.backendelemar.controller;
import com.elemar.backendelemar.dto.CandidatLoginRequest;
import com.elemar.backendelemar.dto.CandidatLoginResponse;
import com.elemar.backendelemar.dto.LoginRequest;
import com.elemar.backendelemar.dto.LoginResponse;
import com.elemar.backendelemar.service.AuthService;
import com.elemar.backendelemar.service.CandidatAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    private final AuthService authService;
    private final CandidatAuthService candidatAuthService;

    @PostMapping("/el-emar/login")
    public ResponseEntity<LoginResponse> loginElEmar(@RequestBody LoginRequest request) {
        LoginResponse response = authService.loginElEmar(request);
        return ResponseEntity.ok(response);
    }
    @PostMapping("/candidat/login")
    public ResponseEntity<LoginResponse> loginCandidat(@RequestBody LoginRequest request) {
        LoginResponse response = authService.loginCandidat(request);
        return ResponseEntity.ok(response);
    }
}