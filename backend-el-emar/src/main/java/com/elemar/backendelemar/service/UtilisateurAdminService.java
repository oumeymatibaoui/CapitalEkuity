package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.CreateUtilisateurRequest;
import com.elemar.backendelemar.dto.UpdateUtilisateurAdminRequest;
import com.elemar.backendelemar.dto.UpdateUtilisateurRoleRequest;
import com.elemar.backendelemar.dto.UtilisateurAdminResponse;
import com.elemar.backendelemar.enums.TypeUtilisateur;
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
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class UtilisateurAdminService {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final HistoriqueActionService historiqueActionService;

    /*
     * ============================================================
     * LISTE DES UTILISATEURS INTERNES
     * ============================================================
     */

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
                LEFT JOIN role_acces r
                    ON r.id = u.role_id
                WHERE CAST(u.type_utilisateur AS TEXT) <> 'CND'
                  AND (
                        r.id IS NULL
                        OR UPPER(
                            COALESCE(r.type_role, 'INTERNE')
                        ) = 'INTERNE'
                  )
                ORDER BY u.id DESC
                """;

        return jdbcTemplate.query(
                sql,
                this::mapUser
        );
    }

    /*
     * ============================================================
     * CRÉER UN UTILISATEUR INTERNE
     *
     * typeUtilisateur représente le département :
     * IT, ACHAT, COMITE ou TECHNIQUE.
     *
     * roleId représente le rôle dynamique :
     * ADMIN, EVALUATEUR, DECIDEUR, etc.
     * ============================================================
     */

    @Transactional
    public UtilisateurAdminResponse createUser(
            CreateUtilisateurRequest request
    ) {
        validateCreateRequest(request);

        String nom = clean(request.getNom());

        String email = clean(request.getEmail())
                .toLowerCase(Locale.ROOT);

        String fonction = clean(
                request.getFonction()
        );

        String typeUtilisateur = normalizeInternalType(
                request.getTypeUtilisateur()
        );

        RoleInfo role = resolveInternalRole(
                request.getRoleId()
        );

        Integer emailCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM utilisateur
                WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
                """,
                Integer.class,
                email
        );

        if (emailCount != null && emailCount > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Un compte avec cet email existe déjà."
            );
        }

        String encodedPassword = passwordEncoder.encode(
                request.getMotDePasse()
        );

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
                        TRUE,
                        CAST('ACTIF' AS statut_compte),
                        TRUE,
                        TRUE,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    RETURNING id
                    """,
                    Long.class,
                    nom,
                    email,
                    encodedPassword,
                    fonction,
                    typeUtilisateur,
                    role.id()
            );

        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Un compte avec cet email existe déjà."
            );

        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Impossible de créer l'utilisateur. "
                            + "Vérifiez le département et le rôle sélectionnés."
            );
        }

        if (utilisateurId == null) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "La création de l'utilisateur a échoué."
            );
        }

        Long createurId = getValidUtilisateurIdOrNull(
                request.getCreateurId()
        );

        historiqueActionService.enregistrerAction(
                createurId,
                null,
                null,
                "UTILISATEUR_INTERNE_CREATE",
                "Création du compte interne : "
                        + safe(email)
                        + " | Nom : "
                        + safe(nom)
                        + " | Département : "
                        + safe(typeUtilisateur)
                        + " | Rôle : "
                        + safe(role.nomRole())
                        + " (" + safe(role.codeRole()) + ")"
                        + " | Nouvel utilisateur ID : "
                        + utilisateurId
        );

        return getUserById(utilisateurId);
    }

    /*
     * ============================================================
     * MODIFIER LE RÔLE ET LE DÉPARTEMENT
     * ============================================================
     */

    @Transactional
    public UtilisateurAdminResponse updateRole(
            Long utilisateurId,
            UpdateUtilisateurRoleRequest request
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
                    "Les informations du rôle sont obligatoires."
            );
        }

        if (request.getRoleId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le rôle est obligatoire."
            );
        }

        UtilisateurAdminResponse currentUser = getUserById(
                utilisateurId
        );

        RoleInfo role = resolveInternalRole(
                request.getRoleId()
        );

        /*
         * Si le frontend n'envoie pas le département,
         * on conserve le département actuel.
         */
        String typeUtilisateur;

        Object requestedType = request.getTypeUtilisateur();

        if (
                requestedType == null
                        || String.valueOf(requestedType).isBlank()
        ) {
            typeUtilisateur = normalizeInternalType(
                    currentUser.getTypeUtilisateur()
            );
        } else {
            typeUtilisateur = normalizeInternalType(
                    requestedType
            );
        }

        int updated = jdbcTemplate.update(
                """
                UPDATE utilisateur
                SET role_id = ?,
                    type_utilisateur =
                        CAST(? AS type_utilisateur),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND CAST(type_utilisateur AS TEXT) <> 'CND'
                """,
                role.id(),
                typeUtilisateur,
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
                "UTILISATEUR_INTERNE_UPDATE_ROLE",
                "Modification de l'utilisateur ID "
                        + utilisateurId
                        + " | Ancien département : "
                        + safe(currentUser.getTypeUtilisateur())
                        + " | Nouveau département : "
                        + safe(typeUtilisateur)
                        + " | Nouveau rôle : "
                        + safe(role.nomRole())
                        + " (" + safe(role.codeRole()) + ")"
        );

        return getUserById(utilisateurId);
    }

    /*
     * ============================================================
     * ACTIVER OU DÉSACTIVER UN UTILISATEUR
     * ============================================================
     */

    @Transactional
    public UtilisateurAdminResponse toggleActif(
            Long utilisateurId
    ) {
        if (utilisateurId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "L'utilisateur est obligatoire."
            );
        }

        int updated = jdbcTemplate.update(
                """
                UPDATE utilisateur
                SET actif = NOT COALESCE(actif, TRUE),
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

        UtilisateurAdminResponse user = getUserById(
                utilisateurId
        );

        historiqueActionService.enregistrerAction(
                utilisateurId,
                null,
                null,
                "UTILISATEUR_INTERNE_TOGGLE_ACTIF",
                Boolean.TRUE.equals(user.getActif())
                        ? "Activation du compte utilisateur interne."
                        : "Désactivation du compte utilisateur interne."
        );

        return user;
    }

    /*
     * ============================================================
     * CONSULTER UN UTILISATEUR
     * ============================================================
     */

    @Transactional(readOnly = true)
    public UtilisateurAdminResponse getUserById(
            Long utilisateurId
    ) {
        if (utilisateurId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "L'utilisateur est obligatoire."
            );
        }

        List<UtilisateurAdminResponse> users = jdbcTemplate.query(
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

    /*
     * ============================================================
     * MODIFIER LES INFORMATIONS D'UN UTILISATEUR
     * ============================================================
     */

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
                .toLowerCase(Locale.ROOT);

        String fonction = clean(
                request.getFonction()
        );

        UtilisateurAdminResponse before = getUserById(
                utilisateurId
        );

        RoleInfo role = resolveInternalRole(
                request.getRoleId()
        );

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

        boolean actifFinal =
                request.getActif() != null
                        ? Boolean.TRUE.equals(request.getActif())
                        : Boolean.TRUE.equals(before.getActif());

        int updated;

        try {
            updated = jdbcTemplate.update(
                    """
                    UPDATE utilisateur
                    SET nom = ?,
                        email = ?,
                        fonction = ?,
                        role_id = ?,
                        actif = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                      AND CAST(type_utilisateur AS TEXT) <> 'CND'
                    """,
                    nom,
                    email,
                    fonction,
                    role.id(),
                    actifFinal,
                    utilisateurId
            );

        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Un autre compte utilise déjà cet email."
            );

        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Impossible de modifier cet utilisateur."
            );
        }

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
                "UTILISATEUR_INTERNE_UPDATE",
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
                        + " | Nouveau rôle : "
                        + safe(role.nomRole())
                        + " (" + safe(role.codeRole()) + ")"
        );

        return getUserById(utilisateurId);
    }

    /*
     * ============================================================
     * SUPPRIMER UN UTILISATEUR
     * ============================================================
     */

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

        UtilisateurAdminResponse user = getUserById(
                utilisateurId
        );

        Long validDemandeurId = getValidUtilisateurIdOrNull(
                demandeurId
        );

        try {
            int deleted = jdbcTemplate.update(
                    """
                    DELETE FROM utilisateur
                    WHERE id = ?
                      AND CAST(type_utilisateur AS TEXT) <> 'CND'
                    """,
                    utilisateurId
            );

            if (deleted == 0) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Utilisateur interne introuvable."
                );
            }

        } catch (DataIntegrityViolationException exception) {
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
                "UTILISATEUR_INTERNE_DELETE",
                "Suppression du compte utilisateur : "
                        + safe(user.getEmail())
                        + " | Nom : "
                        + safe(user.getNom())
                        + " | ID supprimé : "
                        + utilisateurId
        );
    }

    /*
     * ============================================================
     * RECHERCHER ET VALIDER UN RÔLE INTERNE
     * ============================================================
     */

    private RoleInfo resolveInternalRole(
            Long roleId
    ) {
        if (roleId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le rôle est obligatoire."
            );
        }

        List<RoleInfo> roles = jdbcTemplate.query(
                """
                SELECT
                    id,
                    code_role,
                    nom_role
                FROM role_acces
                WHERE id = ?
                  AND actif = TRUE
                  AND UPPER(
                        COALESCE(type_role, 'INTERNE')
                      ) = 'INTERNE'
                LIMIT 1
                """,
                this::mapRole,
                roleId
        );

        if (roles.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Rôle interne introuvable ou inactif."
            );
        }

        return roles.get(0);
    }

    /*
     * ============================================================
     * VALIDER LE DÉPARTEMENT
     * ============================================================
     */

    private String normalizeInternalType(
            Object rawValue
    ) {
        if (rawValue == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le département est obligatoire."
            );
        }

        String value = String.valueOf(rawValue)
                .trim()
                .toUpperCase(Locale.ROOT);

        if (value.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le département est obligatoire."
            );
        }

        final TypeUtilisateur typeUtilisateur;

        try {
            typeUtilisateur = TypeUtilisateur.valueOf(
                    value
            );

        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Département invalide : "
                            + value
                            + ". Valeurs autorisées : "
                            + "IT, ACHAT, COMITE, TECHNIQUE."
            );
        }

        if (!typeUtilisateur.isUtilisateurInterne()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le type CND est réservé aux intervenants externes."
            );
        }

        return typeUtilisateur.name();
    }

    /*
     * ============================================================
     * MAPPING RÔLE
     * ============================================================
     */

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

    /*
     * ============================================================
     * MAPPING UTILISATEUR
     * ============================================================
     */

    private UtilisateurAdminResponse mapUser(
            ResultSet rs,
            int rowNum
    ) throws SQLException {
        Object roleIdObject = rs.getObject(
                "role_id"
        );

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
                        rs.getObject("actif") == null
                                ? null
                                : rs.getBoolean("actif")
                )
                .premiereConnexion(
                        rs.getObject("premiere_connexion") == null
                                ? null
                                : rs.getBoolean(
                                "premiere_connexion"
                        )
                )
                .mustChangePassword(
                        rs.getObject("must_change_password") == null
                                ? null
                                : rs.getBoolean(
                                "must_change_password"
                        )
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

    /*
     * ============================================================
     * VALIDATION DE LA CRÉATION
     * ============================================================
     */

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

        if (request.getMotDePasse().length() < 8) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le mot de passe doit contenir au moins 8 caractères."
            );
        }

        if (request.getRoleId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le rôle est obligatoire."
            );
        }

        /*
         * Cette méthode vérifie aussi que la valeur
         * n'est pas CND.
         */
        normalizeInternalType(
                request.getTypeUtilisateur()
        );
    }

    /*
     * ============================================================
     * VÉRIFIER UN IDENTIFIANT UTILISATEUR
     * ============================================================
     */

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

    /*
     * ============================================================
     * MÉTHODES UTILITAIRES
     * ============================================================
     */

    private boolean hasText(
            String value
    ) {
        return value != null
                && !value.trim().isEmpty();
    }

    private String clean(
            String value
    ) {
        if (value == null) {
            return null;
        }

        String cleaned = value.trim();

        return cleaned.isEmpty()
                ? null
                : cleaned;
    }

    private String safe(
            String value
    ) {
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

    /*
     * ============================================================
     * STRUCTURE INTERNE POUR LE RÔLE
     * ============================================================
     */

    private record RoleInfo(
            Long id,
            String codeRole,
            String nomRole
    ) {
    }
}