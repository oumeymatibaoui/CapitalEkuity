package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class EmailTestController {

    private final EmailService emailService;

    @GetMapping("/test")
    public String testEmail(@RequestParam String to) {
        boolean sent = emailService.sendHtmlEmail(
                to,
                "Test SMTP El Emar",
                """
                <div style="font-family:Arial,sans-serif;">
                    <h2>Test SMTP El Emar</h2>
                    <p>Ceci est un email de test envoyé depuis Spring Boot.</p>
                </div>
                """
        );

        return sent
                ? "Email envoyé avec succès vers : " + to
                : "Email non envoyé. Vérifiez la console backend.";
    }
}