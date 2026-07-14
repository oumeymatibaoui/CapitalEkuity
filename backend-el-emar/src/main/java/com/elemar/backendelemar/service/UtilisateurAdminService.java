package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.CreateUtilisateurRequest;
import com.elemar.backendelemar.dto.UpdateUtilisateurRoleRequest;
import com.elemar.backendelemar.dto.UtilisateurAdminResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UtilisateurAdminService {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final HistoriqueActionService historiqueActionService;

    private static final List<String> ROLES_INTERNES = List.of(
            "EL_EMAR",
            "DA",
            "IT",
            "ADMIN"
    );

    @Transactional(readOnly = true)
    public List<UtilisateurAdminResponse> getAllUsers() {
        String sql = """
                SELECT
                    id,
                    nom,
                    email,
                    fonction,
                    CAST(type_utilisateur AS TEXT) AS type_utilisateur,
                    actif,
                    premiere_connexion,
                    must_change_password,
                    created_at,
                    updated_at
                FROM utilisateur
                WHERE CAST(type_utilisateur AS TEXT) IN ('EL_EMAR', 'DA', 'IT', 'ADMIN')
                ORDER BY id DESC
                """;

        return jdbcTemplate.query(sql, this::mapUser);
    }

    @Transactional
    public UtilisateurAdminResponse createUser(CreateUtilisateurRequest request) {
        validateCreateRequest(request);

        String email = clean(request.getEmail()).toLowerCase();
        String role = normalizeRole(request.getTypeUtilisateur());

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM utilisateur
                WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
                """,
                Integer.class,
                email
        );

        if (count != null && count > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Un compte avec cet email existe déjà."
            );
        }

        String encodedPassword = passwordEncoder.encode(request.getMotDePasse());

        Long utilisateurId;

        try {
            utilisateurId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO utilisateur
                    (
                        nom,
                        email,
                        mot_de_passe,
                        fonction,
                        type_utilisateur,
                        actif,
                        premiere_connexion,
                        must_change_password,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, CAST(? AS type_utilisateur), true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id
                    """,
                    Long.class,
                    clean(request.getNom()),
                    email,
                    encodedPassword,
                    clean(request.getFonction()),
                    role
            );
        } catch (DuplicateKeyException e) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Un compte avec cet email existe déjà."
            );
        }

        Long createurId = getValidUtilisateurIdOrNull(request.getCreateurId());

        historiqueActionService.enregistrerAction(
                createurId,
                null,
                null,
                "EL_EMAR_CREATE_UTILISATEUR",
                "Création du compte interne El Emar : "
                        + safe(email)
                        + " | Nom : "
                        + safe(request.getNom())
                        + " | Rôle : "
                        + safe(role)
                        + " | Nouvel utilisateur ID : "
                        + utilisateurId
        );

        return getUserById(utilisateurId);
    }

    @Transactional
    public UtilisateurAdminResponse updateRole(
            Long utilisateurId,
            UpdateUtilisateurRoleRequest request
    ) {
        if (utilisateurId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Utilisateur obligatoire."
            );
        }

        String role = normalizeRole(request.getTypeUtilisateur());

        int updated = jdbcTemplate.update(
                """
                UPDATE utilisateur
                SET type_utilisateur = CAST(? AS type_utilisateur),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND CAST(type_utilisateur AS TEXT) IN ('EL_EMAR', 'DA', 'IT', 'ADMIN')
                """,
                role,
                utilisateurId
        );

        if (updated == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Utilisateur interne introuvable."
            );
        }

        historiqueActionService.enregistrerAction(
                utilisateurId,
                null,
                null,
                "EL_EMAR_UPDATE_ROLE_UTILISATEUR",
                "Modification du rôle utilisateur interne. Nouveau rôle : " + safe(role)
        );

        return getUserById(utilisateurId);
    }

    @Transactional
    public UtilisateurAdminResponse toggleActif(Long utilisateurId) {
        if (utilisateurId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Utilisateur obligatoire."
            );
        }

        int updated = jdbcTemplate.update(
                """
                UPDATE utilisateur
                SET actif = NOT COALESCE(actif, true),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND CAST(type_utilisateur AS TEXT) IN ('EL_EMAR', 'DA', 'IT', 'ADMIN')
                """,
                utilisateurId
        );

        if (updated == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Utilisateur interne introuvable."
            );
        }

        UtilisateurAdminResponse user = getUserById(utilisateurId);

        historiqueActionService.enregistrerAction(
                utilisateurId,
                null,
                null,
                "EL_EMAR_TOGGLE_UTILISATEUR",
                Boolean.TRUE.equals(user.getActif())
                        ? "Activation du compte utilisateur interne."
                        : "Désactivation du compte utilisateur interne."
        );

        return user;
    }

    @Transactional(readOnly = true)
    public UtilisateurAdminResponse getUserById(Long utilisateurId) {
        List<UtilisateurAdminResponse> users = jdbcTemplate.query(
                """
                SELECT
                    id,
                    nom,
                    email,
                    fonction,
                    CAST(type_utilisateur AS TEXT) AS type_utilisateur,
                    actif,
                    premiere_connexion,
                    must_change_password,
                    created_at,
                    updated_at
                FROM utilisateur
                WHERE id = ?
                  AND CAST(type_utilisateur AS TEXT) IN ('EL_EMAR', 'DA', 'IT', 'ADMIN')
                LIMIT 1
                """,
                this::mapUser,
                utilisateurId
        );

        if (users.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Utilisateur interne introuvable."
            );
        }

        return users.get(0);
    }

    private UtilisateurAdminResponse mapUser(ResultSet rs, int rowNum) throws SQLException {
        return UtilisateurAdminResponse.builder()
                .id(rs.getLong("id"))
                .nom(rs.getString("nom"))
                .email(rs.getString("email"))
                .fonction(rs.getString("fonction"))
                .typeUtilisateur(rs.getString("type_utilisateur"))
                .actif(rs.getObject("actif") != null ? rs.getBoolean("actif") : null)
                .premiereConnexion(rs.getObject("premiere_connexion") != null ? rs.getBoolean("premiere_connexion") : null)
                .mustChangePassword(rs.getObject("must_change_password") != null ? rs.getBoolean("must_change_password") : null)
                .createdAt(toLocalDateTime(rs.getTimestamp("created_at")))
                .updatedAt(toLocalDateTime(rs.getTimestamp("updated_at")))
                .build();
    }

    private void validateCreateRequest(CreateUtilisateurRequest request) {
        if (!hasText(request.getNom())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nom est obligatoire."
            );
        }

        if (!hasText(request.getEmail())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "L'email est obligatoire."
            );
        }

        if (!hasText(request.getMotDePasse())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le mot de passe est obligatoire."
            );
        }

        if (request.getMotDePasse().length() < 6) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le mot de passe doit contenir au moins 6 caractères."
            );
        }

        normalizeRole(request.getTypeUtilisateur());
    }

    private String normalizeRole(String role) {
        if (!hasText(role)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le rôle est obligatoire."
            );
        }

        String value = role.trim().toUpperCase();

        if (!ROLES_INTERNES.contains(value)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cette interface permet uniquement de créer des utilisateurs internes El Emar."
            );
        }

        return value;
    }

    private Long getValidUtilisateurIdOrNull(Long utilisateurId) {
        if (utilisateurId == null) {
            return null;
        }

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM utilisateur
                WHERE id = ?
                """,
                Integer.class,
                utilisateurId
        );

        return count != null && count > 0 ? utilisateurId : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }

    private String safe(String value) {
        return value == null || value.trim().isEmpty()
                ? "-"
                : value.trim();
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}