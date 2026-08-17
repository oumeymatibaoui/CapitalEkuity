package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.LoginRequest;
import com.elemar.backendelemar.dto.LoginResponse;
import com.elemar.backendelemar.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/el-emar/login")
    public ResponseEntity<LoginResponse> loginElEmar(
            @RequestBody LoginRequest request
    ) {
        LoginResponse response =
                authService.loginElEmar(request);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/candidat/login")
    public ResponseEntity<LoginResponse> loginCandidat(
            @RequestBody LoginRequest request
    ) {
        LoginResponse response =
                authService.loginCandidat(request);

        return ResponseEntity.ok(response);
    }
}