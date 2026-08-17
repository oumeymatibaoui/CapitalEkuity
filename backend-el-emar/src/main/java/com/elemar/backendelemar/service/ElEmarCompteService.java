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
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ElEmarCompteService {

    private final JdbcTemplate jdbcTemplate;
    private final HistoriqueActionService historiqueActionService;
    private final PasswordEncoder passwordEncoder;

    // =====================================================
    // CONSULTER MON COMPTE
    //
    // Fonctionne pour :
    // - CND
    // - IT
    // - ACHAT
    // - TECHNIQUE
    // - COMITE
    // - et les autres types déjà présents en base.
    //
    // L'identité est fournie par le controller depuis le JWT.
    // =====================================================

    @Transactional(readOnly = true)
    public ElEmarCompteResponse getCompte(
            Long utilisateurId
    ) {

        Map<String, Object> row =
                findUtilisateurRow(
                        utilisateurId
                );

        return toResponse(row);
    }

    // =====================================================
    // MODIFIER MES INFORMATIONS
    // =====================================================

    @Transactional
    public ElEmarCompteResponse updateCompte(
            Long utilisateurId,
            ElEmarCompteUpdateRequest request
    ) {

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations du compte sont obligatoires"
            );
        }

        String nouveauNom =
                clean(request.getNom());

        String nouvelleFonction =
                clean(request.getFonction());

        if (
                nouveauNom == null
                        || nouveauNom.isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nom est obligatoire"
            );
        }

        Map<String, Object> before =
                findUtilisateurRow(
                        utilisateurId
                );

        String ancienNom =
                asString(
                        before.get("nom")
                );

        String ancienneFonction =
                asString(
                        before.get("fonction")
                );

        String typeUtilisateur =
                normalizeType(
                        asString(
                                before.get(
                                        "type_utilisateur"
                                )
                        )
                );

        int updatedRows =
                jdbcTemplate.update(
                        """
                        UPDATE utilisateur
                        SET nom = ?,
                            fonction = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                        """,
                        nouveauNom,
                        nouvelleFonction,
                        utilisateurId
                );

        if (updatedRows == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Utilisateur introuvable"
            );
        }

        historiqueActionService.enregistrerAction(
                utilisateurId,
                null,
                null,
                isCandidat(typeUtilisateur)
                        ? "CND_UPDATE_COMPTE"
                        : "EL_EMAR_UPDATE_COMPTE",
                "Modification du compte utilisateur."
                        + " | Type : "
                        + safe(typeUtilisateur)
                        + " | Ancien nom : "
                        + safe(ancienNom)
                        + " | Nouveau nom : "
                        + safe(nouveauNom)
                        + " | Ancienne fonction : "
                        + safe(ancienneFonction)
                        + " | Nouvelle fonction : "
                        + safe(nouvelleFonction)
        );

        return getCompte(
                utilisateurId
        );
    }

    // =====================================================
    // CHANGER MON MOT DE PASSE
    // =====================================================

    @Transactional
    public void changePassword(
            Long utilisateurId,
            ChangePasswordRequest request
    ) {

        validateChangePasswordRequest(
                request
        );

        Map<String, Object> row =
                findUtilisateurRow(
                        utilisateurId
                );

        String storedPassword =
                asString(
                        row.get(
                                "mot_de_passe"
                        )
                );

        if (
                !passwordMatches(
                        request.getOldPassword(),
                        storedPassword
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ancien mot de passe incorrect"
            );
        }

        String newStoredPassword =
                passwordEncoder.encode(
                        request.getNewPassword()
                );

        int updatedRows =
                jdbcTemplate.update(
                        """
                        UPDATE utilisateur
                        SET mot_de_passe = ?,
                            must_change_password = FALSE,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                        """,
                        newStoredPassword,
                        utilisateurId
                );

        if (updatedRows == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Utilisateur introuvable"
            );
        }

        String typeUtilisateur =
                normalizeType(
                        asString(
                                row.get(
                                        "type_utilisateur"
                                )
                        )
                );

        historiqueActionService.enregistrerAction(
                utilisateurId,
                null,
                null,
                isCandidat(typeUtilisateur)
                        ? "CND_CHANGE_PASSWORD"
                        : "EL_EMAR_CHANGE_PASSWORD",
                isCandidat(typeUtilisateur)
                        ? "Le candidat a changé son mot de passe."
                        : "L'utilisateur El Emar a changé son mot de passe."
        );
    }

    // =====================================================
    // VALIDATION MOT DE PASSE
    // =====================================================

    private void validateChangePasswordRequest(
            ChangePasswordRequest request
    ) {

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations du mot de passe sont obligatoires"
            );
        }

        if (
                isBlank(
                        request.getOldPassword()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "L'ancien mot de passe est obligatoire"
            );
        }

        if (
                isBlank(
                        request.getNewPassword()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nouveau mot de passe est obligatoire"
            );
        }

        if (
                isBlank(
                        request.getConfirmPassword()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La confirmation du mot de passe est obligatoire"
            );
        }

        if (
                !request.getNewPassword()
                        .equals(
                                request.getConfirmPassword()
                        )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La confirmation du mot de passe ne correspond pas"
            );
        }

        if (
                request.getNewPassword()
                        .length() < 8
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nouveau mot de passe doit contenir au moins 8 caractères"
            );
        }

        if (
                request.getNewPassword()
                        .equals(
                                request.getOldPassword()
                        )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nouveau mot de passe doit être différent de l'ancien"
            );
        }
    }

    // =====================================================
    // RECHERCHE UTILISATEUR
    //
    // IMPORTANT :
    // plus de filtre :
    // type_utilisateur <> 'CND'
    //
    // La sécurité repose sur l'identité JWT :
    // le controller transmet seulement l'utilisateur connecté.
    // =====================================================

    private Map<String, Object> findUtilisateurRow(
            Long utilisateurId
    ) {

        if (
                utilisateurId == null
                        || utilisateurId <= 0
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Utilisateur connecté introuvable"
            );
        }

        List<Map<String, Object>> rows =
                jdbcTemplate.queryForList(
                        """
                        SELECT
                            u.id,
                            u.nom,
                            u.email,
                            u.mot_de_passe,
                            u.fonction,
                            CAST(
                                u.type_utilisateur
                                AS TEXT
                            ) AS type_utilisateur,
                            u.actif,
                            u.created_at,
                            u.updated_at
                        FROM utilisateur u
                        WHERE u.id = ?
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

    // =====================================================
    // DTO
    // =====================================================

    private ElEmarCompteResponse toResponse(
            Map<String, Object> row
    ) {

        return ElEmarCompteResponse
                .builder()
                .id(
                        asLong(
                                row.get("id")
                        )
                )
                .nom(
                        asString(
                                row.get("nom")
                        )
                )
                .email(
                        asString(
                                row.get("email")
                        )
                )
                .fonction(
                        asString(
                                row.get("fonction")
                        )
                )
                .typeUtilisateur(
                        asString(
                                row.get(
                                        "type_utilisateur"
                                )
                        )
                )
                .actif(
                        asBoolean(
                                row.get("actif")
                        )
                )
                .createdAt(
                        asLocalDateTime(
                                row.get(
                                        "created_at"
                                )
                        )
                )
                .updatedAt(
                        asLocalDateTime(
                                row.get(
                                        "updated_at"
                                )
                        )
                )
                .build();
    }

    // =====================================================
    // MOT DE PASSE
    // =====================================================

    private boolean passwordMatches(
            String rawPassword,
            String storedPassword
    ) {

        if (
                rawPassword == null
                        || storedPassword == null
        ) {
            return false;
        }

        if (
                isBCryptHash(
                        storedPassword
                )
        ) {
            return passwordEncoder.matches(
                    rawPassword,
                    storedPassword
            );
        }

        /*
         * Compatibilité temporaire avec les anciens comptes
         * qui ont encore un mot de passe en texte brut.
         */
        return Objects.equals(
                rawPassword,
                storedPassword
        );
    }

    private boolean isBCryptHash(
            String value
    ) {

        if (value == null) {
            return false;
        }

        return value.startsWith("$2a$")
                || value.startsWith("$2b$")
                || value.startsWith("$2y$");
    }

    // =====================================================
    // HELPERS
    // =====================================================

    private boolean isCandidat(
            String typeUtilisateur
    ) {

        return "CND".equals(
                normalizeType(
                        typeUtilisateur
                )
        );
    }

    private String normalizeType(
            String value
    ) {

        if (value == null) {
            return "";
        }

        return value
                .trim()
                .toUpperCase(
                        Locale.ROOT
                );
    }

    private Long asLong(
            Object value
    ) {

        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        return Long.valueOf(
                String.valueOf(value)
        );
    }

    private Boolean asBoolean(
            Object value
    ) {

        if (value == null) {
            return null;
        }

        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }

        return Boolean.valueOf(
                String.valueOf(value)
        );
    }

    private LocalDateTime asLocalDateTime(
            Object value
    ) {

        if (value == null) {
            return null;
        }

        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }

        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }

        return null;
    }

    private String asString(
            Object value
    ) {

        return value == null
                ? null
                : String.valueOf(value);
    }

    private String clean(
            String value
    ) {

        return value == null
                ? null
                : value.trim();
    }

    private String safe(
            String value
    ) {

        return value == null
                || value.trim().isEmpty()
                ? "-"
                : value.trim();
    }

    private boolean isBlank(
            String value
    ) {

        return value == null
                || value.isBlank();
    }
}
