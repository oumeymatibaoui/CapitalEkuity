package com.elemar.backendelemar.service;

import com.elemar.backendelemar.entity.WorkflowEtapeElEmar;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WorkflowGovernanceService {

    private final JdbcTemplate jdbcTemplate;

    private record UserContext(
            Long id,
            String roleCode,
            String departement,
            boolean actif
    ) {
    }

    // =====================================================
    // PROFILS
    // =====================================================

    /**
     * ADMIN global = rôle ADMIN + département IT.
     * C'est le seul profil qui peut modifier la structure du workflow.
     */
    public boolean estAdminGlobal(Long utilisateurId) {
        try {
            UserContext context = context(utilisateurId);
            return isAdminRole(context.roleCode())
                    && "IT".equals(context.departement());
        } catch (ResponseStatusException exception) {
            return false;
        }
    }

    /**
     * ADMIN Achat = rôle ADMIN + département ACHAT.
     * Profil de supervision : lecture globale + réaffectation d'utilisateur,
     * mais aucune autre écriture.
     */
    public boolean estAdminAchatLectureSeule(Long utilisateurId) {
        try {
            UserContext context = context(utilisateurId);
            return isAdminRole(context.roleCode())
                    && "ACHAT".equals(context.departement());
        } catch (ResponseStatusException exception) {
            return false;
        }
    }

    /**
     * Consultation globale autorisée à ADMIN+IT et ADMIN+ACHAT.
     */
    public boolean peutVoirTousLesWorkflows(Long utilisateurId) {
        return estAdminGlobal(utilisateurId)
                || estAdminAchatLectureSeule(utilisateurId);
    }

    public void exigerConsultationWorkflowGlobal(Long utilisateurId) {
        if (!peutVoirTousLesWorkflows(utilisateurId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Vous n'êtes pas autorisé à consulter le workflow global."
            );
        }
    }

    /**
     * Modification structurelle : ADMIN + IT uniquement.
     */
    public void exigerAdminStructure(Long utilisateurId) {
        if (!estAdminGlobal(utilisateurId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Seul l'administrateur global IT peut modifier la structure du workflow."
            );
        }
    }

    public boolean estAdminStructure(Long utilisateurId) {
        return estAdminGlobal(utilisateurId);
    }

    /**
     * Réouverture : ADMIN + IT uniquement.
     */
    public void exigerReouvertureAutorisee(Long responsableId) {
        exigerAdminStructure(responsableId);
    }

    // =====================================================
    // RÉAFFECTATION
    // =====================================================

    /**
     * ADMIN + IT et ADMIN + ACHAT peuvent remplacer le responsable d'une étape.
     *
     * ADMIN + ACHAT peut donc réaffecter une étape ACHAT, TECHNIQUE ou COMITE,
     * mais le nouvel utilisateur doit rester dans le département de l'étape.
     * Il ne modifie jamais la structure du workflow.
     */
    public void exigerReaffectationAutorisee(
            Long responsableId,
            WorkflowEtapeElEmar etape,
            Long nouvelUtilisateurId
    ) {
        if (etape == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Étape workflow obligatoire."
            );
        }

        if (nouvelUtilisateurId == null || nouvelUtilisateurId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Nouvel utilisateur obligatoire."
            );
        }

        boolean autorise = estAdminGlobal(responsableId)
                || estAdminAchatLectureSeule(responsableId);

        if (!autorise) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Seuls l'administrateur global et l'administrateur Achat peuvent réaffecter un responsable."
            );
        }

        String departementEtape = departementEtape(etape);

        exigerUtilisateurDuDepartement(
                nouvelUtilisateurId,
                departementEtape,
                "Le nouvel utilisateur doit appartenir au département "
                        + departementEtape
                        + " de cette étape."
        );
    }

    /**
     * Compatibilité si un ancien appel transmet encore seulement le code étape.
     * À utiliser uniquement pour les 4 étapes métier connues.
     */
    public void exigerReaffectationAutorisee(
            Long responsableId,
            String codeEtape,
            Long nouvelUtilisateurId
    ) {
        boolean autorise = estAdminGlobal(responsableId)
                || estAdminAchatLectureSeule(responsableId);

        if (!autorise) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Réaffectation non autorisée."
            );
        }

        String departementEtape = WorkflowStepCodes.departement(codeEtape);

        if (departementEtape == null || departementEtape.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Impossible de déterminer le département de cette étape libre. Utilisez l'étape workflow complète."
            );
        }

        exigerUtilisateurDuDepartement(
                nouvelUtilisateurId,
                departementEtape,
                "Le nouvel utilisateur doit appartenir au département "
                        + departementEtape
                        + "."
        );
    }

    /**
     * Détermine le département réel d'une étape.
     *
     * - étape métier : département défini par WorkflowStepCodes ;
     * - étape libre : département du responsable actuellement affecté.
     *
     * Cela évite d'ajouter une nouvelle colonne à workflow_etape_el_emar.
     */
    public String departementEtape(WorkflowEtapeElEmar etape) {
        if (etape == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Étape workflow obligatoire."
            );
        }

        String metier = WorkflowStepCodes.departement(etape.getCodeEtape());

        if (metier != null && !metier.isBlank()) {
            return normalizeDepartment(metier);
        }

        if (etape.getUtilisateurAffecte() == null
                || etape.getUtilisateurAffecte().getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Impossible de déterminer le département de cette étape libre : aucun responsable n'est affecté."
            );
        }

        return departementUtilisateur(etape.getUtilisateurAffecte().getId());
    }

    // =====================================================
    // DÉPARTEMENT / UTILISATEUR
    // =====================================================

    public void exigerUtilisateurDuDepartement(
            Long utilisateurId,
            String departementAttendu,
            String message
    ) {
        UserContext utilisateur = context(utilisateurId);

        if (!normalizeDepartment(departementAttendu)
                .equals(utilisateur.departement())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    message
            );
        }
    }

    public String departementUtilisateur(Long utilisateurId) {
        return context(utilisateurId).departement();
    }

    // =====================================================
    // CONTEXTE DB
    // =====================================================

    private UserContext context(Long utilisateurId) {
        if (utilisateurId == null || utilisateurId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Utilisateur connecté introuvable."
            );
        }

        var rows = jdbcTemplate.queryForList(
                """
                SELECT
                    u.id,
                    COALESCE(u.actif, FALSE) AS user_actif,
                    UPPER(
                        TRIM(
                            COALESCE(
                                CAST(u.type_utilisateur AS TEXT),
                                ''
                            )
                        )
                    ) AS departement,
                    UPPER(TRIM(COALESCE(r.code_role, ''))) AS role_code,
                    COALESCE(r.actif, FALSE) AS role_actif
                FROM utilisateur u
                LEFT JOIN role_acces r ON r.id = u.role_id
                WHERE u.id = ?
                """,
                utilisateurId
        );

        if (rows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Utilisateur connecté introuvable."
            );
        }

        Map<String, Object> row = rows.get(0);

        boolean actif = Boolean.TRUE.equals(row.get("user_actif"))
                && Boolean.TRUE.equals(row.get("role_actif"));

        if (!actif) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Utilisateur ou rôle inactif."
            );
        }

        return new UserContext(
                utilisateurId,
                normalize(String.valueOf(row.get("role_code"))),
                normalizeDepartment(String.valueOf(row.get("departement"))),
                true
        );
    }

    private boolean isAdminRole(String roleCode) {
        String role = normalize(roleCode);

        return "ADMIN".equals(role)
                || "ROLE_ADMIN".equals(role);
    }

    private String normalize(String value) {
        return value == null
                ? ""
                : value.trim().toUpperCase(Locale.ROOT);
    }

    public String normalizeDepartment(String value) {
        String department = normalize(value);

        return switch (department) {
            case "DA", "ACHATS" -> "ACHAT";
            case "EVALUATEUR", "EL_EMAR" -> "TECHNIQUE";
            case "DECIDEUR" -> "COMITE";
            default -> department;
        };
    }
}
