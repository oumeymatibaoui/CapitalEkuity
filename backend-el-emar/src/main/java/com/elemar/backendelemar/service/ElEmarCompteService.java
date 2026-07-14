package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.ChangePasswordRequest;
import com.elemar.backendelemar.dto.ElEmarCompteResponse;
import com.elemar.backendelemar.dto.ElEmarCompteUpdateRequest;
import lombok.RequiredArgsConstructor;
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
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ElEmarCompteService {

    private final JdbcTemplate jdbcTemplate;
    private final HistoriqueActionService historiqueActionService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public ElEmarCompteResponse getCompte(Long utilisateurId) {
        Map<String, Object> row = findUtilisateurRow(utilisateurId);
        return toResponse(row);
    }

    @Transactional
    public ElEmarCompteResponse updateCompte(
            Long utilisateurId,
            ElEmarCompteUpdateRequest request
    ) {
        Map<String, Object> before = findUtilisateurRow(utilisateurId);

        String ancienNom = asString(before.get("nom"));
        String ancienneFonction = asString(before.get("fonction"));

        jdbcTemplate.update(
                """
                UPDATE utilisateur
                SET nom = ?,
                    fonction = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                clean(request.getNom()),
                clean(request.getFonction()),
                utilisateurId
        );

        historiqueActionService.enregistrerAction(
                utilisateurId,
                null,
                null,
                "EL_EMAR_UPDATE_COMPTE",
                "El Emar a modifié son compte. Ancien nom: "
                        + safe(ancienNom)
                        + " | Nouveau nom: "
                        + safe(request.getNom())
                        + " | Ancienne fonction: "
                        + safe(ancienneFonction)
                        + " | Nouvelle fonction: "
                        + safe(request.getFonction())
        );

        return getCompte(utilisateurId);
    }

    @Transactional
    public void changePassword(
            Long utilisateurId,
            ChangePasswordRequest request
    ) {
        if (request.getOldPassword() == null || request.getOldPassword().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "L'ancien mot de passe est obligatoire"
            );
        }

        if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nouveau mot de passe est obligatoire"
            );
        }

        if (request.getConfirmPassword() == null || request.getConfirmPassword().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La confirmation du mot de passe est obligatoire"
            );
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La confirmation du mot de passe ne correspond pas"
            );
        }

        if (request.getNewPassword().length() < 6) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nouveau mot de passe doit contenir au moins 6 caractères"
            );
        }

        Map<String, Object> row = findUtilisateurRow(utilisateurId);

        String storedPassword = asString(row.get("mot_de_passe"));

        if (!passwordMatches(request.getOldPassword(), storedPassword)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ancien mot de passe incorrect"
            );
        }

        String newStoredPassword = encodePasswordForStorage(
                storedPassword,
                request.getNewPassword()
        );

        jdbcTemplate.update(
                """
                UPDATE utilisateur
                SET mot_de_passe = ?,
                    must_change_password = false,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                newStoredPassword,
                utilisateurId
        );

        historiqueActionService.enregistrerAction(
                utilisateurId,
                null,
                null,
                "EL_EMAR_CHANGE_PASSWORD",
                "El Emar a changé son mot de passe."
        );
    }

    private Map<String, Object> findUtilisateurRow(Long utilisateurId) {
        if (utilisateurId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Utilisateur obligatoire"
            );
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                SELECT
                    id,
                    nom,
                    email,
                    mot_de_passe,
                    fonction,
                    CAST(type_utilisateur AS TEXT) AS type_utilisateur,
                    actif,
                    created_at,
                    updated_at
                FROM utilisateur
                WHERE id = ?
                LIMIT 1
                """,
                utilisateurId
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Utilisateur introuvable"
            );
        }

        return rows.get(0);
    }

    private ElEmarCompteResponse toResponse(Map<String, Object> row) {
        return ElEmarCompteResponse.builder()
                .id(asLong(row.get("id")))
                .nom(asString(row.get("nom")))
                .email(asString(row.get("email")))
                .fonction(asString(row.get("fonction")))
                .typeUtilisateur(asString(row.get("type_utilisateur")))
                .actif(asBoolean(row.get("actif")))
                .createdAt(asLocalDateTime(row.get("created_at")))
                .updatedAt(asLocalDateTime(row.get("updated_at")))
                .build();
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null) {
            return false;
        }

        if (isBCryptHash(storedPassword)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }

        return Objects.equals(rawPassword, storedPassword);
    }

    private String encodePasswordForStorage(String oldStoredPassword, String newPassword) {
        if (isBCryptHash(oldStoredPassword)) {
            return passwordEncoder.encode(newPassword);
        }

        return newPassword;
    }

    private boolean isBCryptHash(String value) {
        if (value == null) {
            return false;
        }

        return value.startsWith("$2a$")
                || value.startsWith("$2b$")
                || value.startsWith("$2y$");
    }

    private Long asLong(Object value) {
        if (value == null) return null;
        return ((Number) value).longValue();
    }

    private Boolean asBoolean(Object value) {
        if (value == null) return null;
        return (Boolean) value;
    }

    private LocalDateTime asLocalDateTime(Object value) {
        if (value == null) return null;

        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }

        return null;
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }

    private String safe(String value) {
        return value == null || value.trim().isEmpty()
                ? "-"
                : value.trim();
    }
}