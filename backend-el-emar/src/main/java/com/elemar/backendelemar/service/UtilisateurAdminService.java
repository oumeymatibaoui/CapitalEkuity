package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.CreateUtilisateurRequest;
import com.elemar.backendelemar.dto.UpdateUtilisateurAdminRequest;
import com.elemar.backendelemar.dto.UpdateUtilisateurRoleRequest;
import com.elemar.backendelemar.dto.UtilisateurAdminResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
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
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class UtilisateurAdminService {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final HistoriqueActionService historiqueActionService;

    @Transactional(readOnly = true)
    public List<UtilisateurAdminResponse> getAllUsers() {

        String sql = """
                SELECT
                    u.id,
                    u.nom,
                    u.email,
                    u.fonction,
                    CAST(u.type_utilisateur AS TEXT) AS type_utilisateur,
                    u.role_id,
                    r.code_role,
                    r.nom_role,
                    u.actif,
                    u.premiere_connexion,
                    u.must_change_password,
                    u.created_at,
                    u.updated_at
                FROM utilisateur u
                LEFT JOIN role_acces r ON r.id = u.role_id
                WHERE CAST(u.type_utilisateur AS TEXT) <> 'CND'
                  AND (
                        r.id IS NULL
                        OR UPPER(COALESCE(r.type_role, 'INTERNE')) = 'INTERNE'
                  )
                ORDER BY u.id DESC
                """;

        return jdbcTemplate.query(sql, this::mapUser);
    }

    @Transactional
    public UtilisateurAdminResponse createUser(
            CreateUtilisateurRequest request
    ) {
        validateCreateRequest(request);

        String email = clean(request.getEmail()).toLowerCase();

        RoleInfo role = resolveInternalRole(
                request.getRoleId(),
                request.getTypeUtilisateur()
        );

        /*
         * Compatibilité avec l'ancien ENUM.
         *
         * Pour un rôle dynamique comme EVALUATEUR_JUNIOR,
         * type_utilisateur reste EL_EMAR.
         *
         * Le véritable rôle est enregistré dans role_id.
         */
        String legacyType = resolveLegacyType(role.codeRole());

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

        String encodedPassword =
                passwordEncoder.encode(request.getMotDePasse());

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
                        role_id,
                        actif,
                        statut_compte,
                        premiere_connexion,
                        must_change_password,
                        created_at,
                        updated_at
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        CAST(? AS type_utilisateur),
                        ?,
                        true,
                        CAST('ACTIF' AS statut_compte),
                        true,
                        true,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    RETURNING id
                    """,
                    Long.class,
                    clean(request.getNom()),
                    email,
                    encodedPassword,
                    clean(request.getFonction()),
                    legacyType,
                    role.id()
            );
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Un compte avec cet email existe déjà."
            );
        }

        Long createurId =
                getValidUtilisateurIdOrNull(request.getCreateurId());

        historiqueActionService.enregistrerAction(
                createurId,
                null,
                null,
                "EL_EMAR_CREATE_UTILISATEUR",
                "Création du compte interne : "
                        + safe(email)
                        + " | Nom : "
                        + safe(request.getNom())
                        + " | Rôle : "
                        + safe(role.nomRole())
                        + " (" + safe(role.codeRole()) + ")"
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

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations du rôle sont obligatoires."
            );
        }

        RoleInfo role = resolveInternalRole(
                request.getRoleId(),
                request.getTypeUtilisateur()
        );

        String legacyType = resolveLegacyType(role.codeRole());

        int updated = jdbcTemplate.update(
                """
                UPDATE utilisateur
                SET role_id = ?,
                    type_utilisateur = CAST(? AS type_utilisateur),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND CAST(type_utilisateur AS TEXT) <> 'CND'
                """,
                role.id(),
                legacyType,
                utilisateurId
        );

        if (updated == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Utilisateur interne introuvable."
            );
        }

        Long modificateurId = getValidUtilisateurIdOrNull(
                request.getModificateurId()
        );

        historiqueActionService.enregistrerAction(
                modificateurId,
                null,
                null,
                "EL_EMAR_UPDATE_ROLE_UTILISATEUR",
                "Modification du rôle de l'utilisateur ID "
                        + utilisateurId
                        + ". Nouveau rôle : "
                        + safe(role.nomRole())
                        + " (" + safe(role.codeRole()) + ")"
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
                  AND CAST(type_utilisateur AS TEXT) <> 'CND'
                """,
                utilisateurId
        );

        if (updated == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Utilisateur interne introuvable."
            );
        }

        UtilisateurAdminResponse user =
                getUserById(utilisateurId);

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
    public UtilisateurAdminResponse getUserById(
            Long utilisateurId
    ) {
        List<UtilisateurAdminResponse> users =
                jdbcTemplate.query(
                        """
                        SELECT
                            u.id,
                            u.nom,
                            u.email,
                            u.fonction,
                            CAST(u.type_utilisateur AS TEXT)
                                AS type_utilisateur,
                            u.role_id,
                            r.code_role,
                            r.nom_role,
                            u.actif,
                            u.premiere_connexion,
                            u.must_change_password,
                            u.created_at,
                            u.updated_at
                        FROM utilisateur u
                        LEFT JOIN role_acces r
                            ON r.id = u.role_id
                        WHERE u.id = ?
                          AND CAST(
                              u.type_utilisateur AS TEXT
                          ) <> 'CND'
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

    private RoleInfo resolveInternalRole(
            Long roleId,
            String ancienTypeUtilisateur
    ) {
        List<RoleInfo> roles;

        if (roleId != null) {
            roles = jdbcTemplate.query(
                    """
                    SELECT
                        id,
                        code_role,
                        nom_role
                    FROM role_acces
                    WHERE id = ?
                      AND actif = true
                      AND UPPER(
                          COALESCE(type_role, 'INTERNE')
                      ) = 'INTERNE'
                    LIMIT 1
                    """,
                    this::mapRole,
                    roleId
            );
        } else {
            if (!hasText(ancienTypeUtilisateur)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Le rôle est obligatoire."
                );
            }

            String codeRole =
                    ancienTypeUtilisateur.trim().toUpperCase();

            roles = jdbcTemplate.query(
                    """
                    SELECT
                        id,
                        code_role,
                        nom_role
                    FROM role_acces
                    WHERE UPPER(code_role) = ?
                      AND actif = true
                      AND UPPER(
                          COALESCE(type_role, 'INTERNE')
                      ) = 'INTERNE'
                    LIMIT 1
                    """,
                    this::mapRole,
                    codeRole
            );
        }

        if (roles.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Rôle interne introuvable ou inactif."
            );
        }

        return roles.get(0);
    }

    /*
     * Maintient la compatibilité avec l'ancienne base.
     */
    private String resolveLegacyType(String codeRole) {
        if (codeRole == null) {
            return "EL_EMAR";
        }

        return switch (codeRole.trim().toUpperCase()) {
            case "EL_EMAR" -> "EL_EMAR";
            case "DA" -> "DA";
            case "IT" -> "IT";
            case "ADMIN" -> "ADMIN";

            /*
             * Tout nouveau rôle dynamique interne reste
             * techniquement un compte EL_EMAR dans l'ancien système.
             */
            default -> "EL_EMAR";
        };
    }

    private RoleInfo mapRole(
            ResultSet rs,
            int rowNum
    ) throws SQLException {
        return new RoleInfo(
                rs.getLong("id"),
                rs.getString("code_role"),
                rs.getString("nom_role")
        );
    }

    private UtilisateurAdminResponse mapUser(
            ResultSet rs,
            int rowNum
    ) throws SQLException {
        Object roleIdObject = rs.getObject("role_id");

        Long roleId = roleIdObject == null
                ? null
                : ((Number) roleIdObject).longValue();

        return UtilisateurAdminResponse.builder()
                .id(rs.getLong("id"))
                .nom(rs.getString("nom"))
                .email(rs.getString("email"))
                .fonction(rs.getString("fonction"))
                .typeUtilisateur(
                        rs.getString("type_utilisateur")
                )
                .roleId(roleId)
                .roleCode(rs.getString("code_role"))
                .roleNom(rs.getString("nom_role"))
                .actif(
                        rs.getObject("actif") != null
                                ? rs.getBoolean("actif")
                                : null
                )
                .premiereConnexion(
                        rs.getObject("premiere_connexion") != null
                                ? rs.getBoolean("premiere_connexion")
                                : null
                )
                .mustChangePassword(
                        rs.getObject("must_change_password") != null
                                ? rs.getBoolean(
                                "must_change_password"
                        )
                                : null
                )
                .createdAt(
                        toLocalDateTime(
                                rs.getTimestamp("created_at")
                        )
                )
                .updatedAt(
                        toLocalDateTime(
                                rs.getTimestamp("updated_at")
                        )
                )
                .build();
    }

    private void validateCreateRequest(
            CreateUtilisateurRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations utilisateur sont obligatoires."
            );
        }

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

        if (
                request.getRoleId() == null
                        && !hasText(request.getTypeUtilisateur())
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le rôle est obligatoire."
            );
        }
    }

    private Long getValidUtilisateurIdOrNull(
            Long utilisateurId
    ) {
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

        return count != null && count > 0
                ? utilisateurId
                : null;
    }

    private boolean hasText(String value) {
        return value != null
                && !value.trim().isEmpty();
    }

    private String clean(String value) {
        return value == null
                ? null
                : value.trim();
    }

    private String safe(String value) {
        return value == null || value.trim().isEmpty()
                ? "-"
                : value.trim();
    }

    private LocalDateTime toLocalDateTime(
            Timestamp timestamp
    ) {
        return timestamp == null
                ? null
                : timestamp.toLocalDateTime();
    }

    private record RoleInfo(
            Long id,
            String codeRole,
            String nomRole
    ) {
    }
    @Transactional
    public UtilisateurAdminResponse updateUtilisateur(
            Long utilisateurId,
            UpdateUtilisateurAdminRequest request
    ) {
        if (utilisateurId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "L'utilisateur est obligatoire."
            );
        }

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations sont obligatoires."
            );
        }

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

        if (request.getRoleId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le rôle est obligatoire."
            );
        }

        String nom = clean(request.getNom());

        String email = clean(request.getEmail())
                .toLowerCase();

        String fonction = clean(
                request.getFonction()
        );

        /*
         * Cette méthode existe déjà dans
         * UtilisateurAdminService.
         */
        UtilisateurAdminResponse before =
                getUserById(utilisateurId);

        Integer emailCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM utilisateur
                WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
                  AND id <> ?
                """,
                Integer.class,
                email,
                utilisateurId
        );

        if (emailCount != null && emailCount > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Un autre compte utilise déjà cet email."
            );
        }

        List<Map<String, Object>> roles =
                jdbcTemplate.queryForList(
                        """
                        SELECT
                            id,
                            code_role,
                            nom_role,
                            type_role,
                            actif
                        FROM role_acces
                        WHERE id = ?
                        LIMIT 1
                        """,
                        request.getRoleId()
                );

        if (roles.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le rôle sélectionné est introuvable."
            );
        }

        Map<String, Object> role = roles.get(0);

        String typeRole = String.valueOf(
                        role.get("type_role")
                )
                .trim()
                .toUpperCase();

        boolean roleActif =
                Boolean.TRUE.equals(
                        role.get("actif")
                );

        if (!roleActif) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le rôle sélectionné est inactif."
            );
        }

        if (!"INTERNE".equals(typeRole)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le rôle doit être un rôle interne."
            );
        }

        boolean actifFinal =
                request.getActif() != null
                        ? Boolean.TRUE.equals(
                        request.getActif()
                )
                        : Boolean.TRUE.equals(
                        before.getActif()
                );

        int updated = jdbcTemplate.update(
                """
                UPDATE utilisateur
                SET nom = ?,
                    email = ?,
                    fonction = ?,
                    role_id = ?,
                    actif = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                nom,
                email,
                fonction,
                request.getRoleId(),
                actifFinal,
                utilisateurId
        );

        if (updated == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Utilisateur introuvable."
            );
        }

        /*
         * Cette méthode existe déjà dans
         * UtilisateurAdminService.
         */
        Long modificateurId =
                getValidUtilisateurIdOrNull(
                        request.getModificateurId()
                );

        historiqueActionService.enregistrerAction(
                modificateurId,
                null,
                null,
                "EL_EMAR_UPDATE_UTILISATEUR",
                "Modification du compte utilisateur ID "
                        + utilisateurId
                        + " | Ancien nom : "
                        + safe(before.getNom())
                        + " | Nouveau nom : "
                        + safe(nom)
                        + " | Ancien email : "
                        + safe(before.getEmail())
                        + " | Nouvel email : "
                        + safe(email)
                        + " | Nouveau rôle ID : "
                        + request.getRoleId()
        );

        return getUserById(utilisateurId);
    }
    @Transactional
    public void deleteUtilisateur(
            Long utilisateurId,
            Long demandeurId
    ) {
        if (utilisateurId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "L'utilisateur est obligatoire."
            );
        }

        if (
                demandeurId != null
                        && Objects.equals(
                        utilisateurId,
                        demandeurId
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Vous ne pouvez pas supprimer votre propre compte."
            );
        }

        UtilisateurAdminResponse user =
                getUserById(utilisateurId);

        Long validDemandeurId =
                getValidUtilisateurIdOrNull(
                        demandeurId
                );

        try {
            int deleted = jdbcTemplate.update(
                    """
                    DELETE FROM utilisateur
                    WHERE id = ?
                    """,
                    utilisateurId
            );

            if (deleted == 0) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable."
                );
            }

        } catch (
                DataIntegrityViolationException exception
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce compte est lié à des données de la plateforme. "
                            + "Désactivez-le au lieu de le supprimer."
            );
        }

        historiqueActionService.enregistrerAction(
                validDemandeurId,
                null,
                null,
                "EL_EMAR_DELETE_UTILISATEUR",
                "Suppression du compte utilisateur : "
                        + safe(user.getEmail())
                        + " | ID supprimé : "
                        + utilisateurId
        );
    }
}