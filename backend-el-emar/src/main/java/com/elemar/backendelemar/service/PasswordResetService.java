package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.ForgotPasswordRequest;
import com.elemar.backendelemar.dto.ResetPasswordRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.frontend.reset-password-url:http://localhost:4200/reset-password}")
    private String resetPasswordUrl;

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return;
        }

        String email = request.getEmail().trim().toLowerCase();

        List<Map<String, Object>> users = jdbcTemplate.queryForList(
                """
                SELECT
                    id,
                    nom,
                    email
                FROM utilisateur
                WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
                  AND COALESCE(actif, true) = true
                LIMIT 1
                """,
                email
        );

        // Sécurité : ne pas dire si l'email existe ou non
        if (users.isEmpty()) {
            return;
        }

        Map<String, Object> user = users.get(0);

        Long utilisateurId = ((Number) user.get("id")).longValue();
        String nom = user.get("nom") != null ? user.get("nom").toString() : "Utilisateur";
        String userEmail = user.get("email").toString();

        jdbcTemplate.update(
                """
                UPDATE password_reset_token
                SET used = true
                WHERE utilisateur_id = ?
                  AND used = false
                """,
                utilisateurId
        );

        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(30);

        jdbcTemplate.update(
                """
                INSERT INTO password_reset_token
                (
                    utilisateur_id,
                    token,
                    expires_at,
                    used,
                    created_at
                )
                VALUES (?, ?, ?, false, CURRENT_TIMESTAMP)
                """,
                utilisateurId,
                token,
                expiresAt
        );

        String resetLink = resetPasswordUrl + "?token=" + token;

        boolean sent = emailService.sendPasswordResetEmail(
                userEmail,
                nom,
                resetLink
        );

        if (!sent) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Impossible d’envoyer l’email de réinitialisation."
            );
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (request == null || request.getToken() == null || request.getToken().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lien invalide.");
        }

        if (request.getNewPassword() == null || request.getNewPassword().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le nouveau mot de passe est obligatoire.");
        }

        if (request.getConfirmPassword() == null || request.getConfirmPassword().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La confirmation du mot de passe est obligatoire.");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La confirmation ne correspond pas.");
        }

        if (request.getNewPassword().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le mot de passe doit contenir au moins 6 caractères.");
        }

        List<Map<String, Object>> tokens = jdbcTemplate.queryForList(
                """
                SELECT
                    id,
                    utilisateur_id,
                    expires_at,
                    used
                FROM password_reset_token
                WHERE token = ?
                LIMIT 1
                """,
                request.getToken().trim()
        );

        if (tokens.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lien invalide.");
        }

        Map<String, Object> tokenRow = tokens.get(0);

        Boolean used = tokenRow.get("used") != null && Boolean.TRUE.equals(tokenRow.get("used"));

        if (used) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ce lien a déjà été utilisé.");
        }

        Timestamp expiresAtTimestamp = (Timestamp) tokenRow.get("expires_at");
        LocalDateTime expiresAt = expiresAtTimestamp.toLocalDateTime();

        if (LocalDateTime.now().isAfter(expiresAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ce lien a expiré.");
        }

        Long tokenId = ((Number) tokenRow.get("id")).longValue();
        Long utilisateurId = ((Number) tokenRow.get("utilisateur_id")).longValue();

        String encodedPassword = passwordEncoder.encode(request.getNewPassword());

        jdbcTemplate.update(
                """
                UPDATE utilisateur
                SET mot_de_passe = ?,
                    must_change_password = false,
                    premiere_connexion = false,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                encodedPassword,
                utilisateurId
        );

        jdbcTemplate.update(
                """
                UPDATE password_reset_token
                SET used = true
                WHERE id = ?
                """,
                tokenId
        );
    }
}