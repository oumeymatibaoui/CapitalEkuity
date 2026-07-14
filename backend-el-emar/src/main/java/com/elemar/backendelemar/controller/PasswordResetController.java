package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.ForgotPasswordRequest;
import com.elemar.backendelemar.dto.ResetPasswordRequest;
import com.elemar.backendelemar.service.PasswordResetService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @PostMapping("/forgot-password")
    public String forgotPassword(@RequestBody ForgotPasswordRequest request) {
        passwordResetService.forgotPassword(request);

        return "Si cet email existe, un lien de réinitialisation a été envoyé.";
    }

    @PostMapping("/reset-password")
    public String resetPassword(@RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);

        return "Mot de passe réinitialisé avec succès.";
    }
}