package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.WorkflowModeleEtapeRequest;
import com.elemar.backendelemar.dto.WorkflowModeleEtapeResponse;
import com.elemar.backendelemar.dto.WorkflowModeleUpdateRequest;
import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.entity.WorkflowModeleEtape;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import com.elemar.backendelemar.repository.WorkflowModeleEtapeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class WorkflowModeleService {

    private static final Set<String> DEPARTEMENTS_AUTORISES = Set.of(
            "IT",
            "ACHAT",
            "TECHNIQUE",
            "COMITE"
    );

    private final WorkflowModeleEtapeRepository modeleRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final WorkflowPermissionService permissionService;
    private final WorkflowGovernanceService governanceService;
    private final JdbcTemplate jdbcTemplate;

    // =====================================================
    // LECTURE DU MODELE
    // =====================================================

    @Transactional(readOnly = true)
    public List<WorkflowModeleEtapeResponse> getModele(Long utilisateurId) {
        governanceService.exigerConsultationWorkflowGlobal(utilisateurId);

        return modeleRepository
                .findByActifTrueOrderByOrdreAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =====================================================
    // ENREGISTREMENT COMPLET DU MODELE DYNAMIQUE
    // =====================================================

    @Transactional
    public List<WorkflowModeleEtapeResponse> enregistrerModele(
            Long utilisateurId,
            WorkflowModeleUpdateRequest request
    ) {
        governanceService.exigerAdminStructure(utilisateurId);
        permissionService.exigerUtilisateurActif(utilisateurId);

        if (request == null
                || request.getEtapes() == null
                || request.getEtapes().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le workflow doit contenir au moins une étape."
            );
        }

        // Une seule édition globale simultanément, même avec plusieurs instances backend.
        jdbcTemplate.queryForList(
                "SELECT pg_advisory_xact_lock(hashtextextended('EL_EMAR_WORKFLOW_MODELE_GLOBAL', 0))"
        );

        List<WorkflowModeleEtapeRequest> requested = new ArrayList<>(
                request.getEtapes()
        );

        requested.sort(
                Comparator.comparingInt(item ->
                        item == null || item.getOrdre() == null
                                ? Integer.MAX_VALUE
                                : item.getOrdre()
                )
        );

        verifierDefinitions(requested);

        Utilisateur auteur = utilisateurRepository
                .findById(utilisateurId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Utilisateur connecté introuvable."
                ));

        LocalDateTime now = LocalDateTime.now();
        List<WorkflowModeleEtape> nouvellesEtapes = new ArrayList<>();

        for (int index = 0; index < requested.size(); index++) {
            WorkflowModeleEtapeRequest input = requested.get(index);

            final String code = normalizeCode(input.getCodeEtape());
            final String libelle = cleanRequired(
                    input.getLibelleEtape(),
                    "Libellé d'étape obligatoire."
            );

            String departement = normalizeDepartmentRequired(
                    input.getDepartementCode()
            );

            /*
             * Les 4 étapes métier gardent leur département métier.
             * Cela évite de casser les contrôles d'accès existants.
             * Les étapes libres peuvent utiliser n'importe quel département interne.
             */
            String departementMetier = WorkflowStepCodes.departement(code);
            if (departementMetier != null && !departementMetier.equals(departement)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "L'étape métier « " + libelle + " » doit rester dans le département "
                                + departementMetier + "."
                );
            }

            Long userId = input.getUtilisateurDefautId();
            if (userId == null || userId <= 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Choisissez un responsable pour « " + libelle + " »."
                );
            }

            Utilisateur user = utilisateurRepository
                    .findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Utilisateur introuvable pour « " + libelle + " »."
                    ));

            permissionService.exigerUtilisateurActif(user.getId());

            governanceService.exigerUtilisateurDuDepartement(
                    user.getId(),
                    departement,
                    "Le responsable de « " + libelle
                            + " » doit appartenir au département " + departement + "."
            );

            verifierPermissionMetier(code, user.getId());

            WorkflowModeleEtape row = WorkflowModeleEtape.builder()
                    .codeEtape(code)
                    .libelleEtape(libelle)
                    .ordre(index + 1)
                    .departementCode(departement)
                    .utilisateurDefaut(user)
                    .actif(true)
                    .modifiePar(auteur)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();

            nouvellesEtapes.add(row);
        }

        /*
         * Le modèle est un template global sans FK entrante depuis les dossiers.
         * Les dossiers gardent leur snapshot dans workflow_etape_el_emar.
         * Remplacer le template évite les collisions UNIQUE(ordre) pendant un switch 1<->2.
         */
        modeleRepository.deleteAllInBatch();
        modeleRepository.flush();

        List<WorkflowModeleEtape> saved = modeleRepository.saveAll(nouvellesEtapes);
        modeleRepository.flush();

        return saved.stream()
                .sorted(Comparator.comparing(WorkflowModeleEtape::getOrdre))
                .map(this::toResponse)
                .toList();
    }

    // =====================================================
    // MODELE UTILISE AU MOMENT D'UNE SOUMISSION
    // =====================================================

    @Transactional(readOnly = true)
    public List<WorkflowModeleEtape> chargerModelePourExecution() {
        List<WorkflowModeleEtape> rows =
                modeleRepository.findByActifTrueOrderByOrdreAsc();

        if (rows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Le workflow global n'est pas configuré. Contactez l'administrateur."
            );
        }

        Set<String> codes = new HashSet<>();

        for (int index = 0; index < rows.size(); index++) {
            WorkflowModeleEtape row = rows.get(index);

            if (row.getOrdre() == null || row.getOrdre() != index + 1) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "L'ordre du workflow global doit être continu à partir de 1."
                );
            }

            String code = normalizeCode(row.getCodeEtape());
            if (!codes.add(code)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Code d'étape dupliqué dans le workflow global : " + code
                );
            }

            if (row.getUtilisateurDefaut() == null
                    || row.getUtilisateurDefaut().getId() == null) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Responsable non configuré pour : " + row.getLibelleEtape()
                );
            }

            String departement = normalizeDepartmentRequired(
                    row.getDepartementCode()
            );

            String departementMetier = WorkflowStepCodes.departement(code);
            if (departementMetier != null && !departementMetier.equals(departement)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Département incohérent pour l'étape métier : " + row.getLibelleEtape()
                );
            }

            permissionService.exigerUtilisateurActif(
                    row.getUtilisateurDefaut().getId()
            );

            governanceService.exigerUtilisateurDuDepartement(
                    row.getUtilisateurDefaut().getId(),
                    departement,
                    "Configuration globale incohérente pour : " + row.getLibelleEtape()
            );

            verifierPermissionMetier(
                    code,
                    row.getUtilisateurDefaut().getId()
            );
        }

        for (String obligatoire : WorkflowStepCodes.ETAPES_METIER_OBLIGATOIRES) {
            if (!codes.contains(obligatoire)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Étape métier obligatoire absente du workflow : " + obligatoire
                );
            }
        }

        return rows;
    }

    // =====================================================
    // VALIDATIONS
    // =====================================================

    private void verifierDefinitions(List<WorkflowModeleEtapeRequest> values) {
        Set<String> codes = new HashSet<>();
        Set<Integer> ordres = new HashSet<>();

        for (WorkflowModeleEtapeRequest item : values) {
            if (item == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Une étape du workflow est vide."
                );
            }

            String code = normalizeCode(item.getCodeEtape());
            if (!codes.add(code)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Code d'étape répété : " + code
                );
            }

            Integer ordre = item.getOrdre();
            if (ordre == null || ordre <= 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Ordre invalide pour l'étape " + code
                );
            }

            if (!ordres.add(ordre)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Deux étapes possèdent l'ordre " + ordre + "."
                );
            }

            cleanRequired(
                    item.getLibelleEtape(),
                    "Libellé obligatoire pour " + code + "."
            );

            normalizeDepartmentRequired(item.getDepartementCode());

            if (item.getUtilisateurDefautId() == null
                    || item.getUtilisateurDefautId() <= 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Responsable obligatoire pour " + code + "."
                );
            }
        }

        for (int expected = 1; expected <= values.size(); expected++) {
            if (!ordres.contains(expected)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "L'ordre du workflow doit être continu de 1 à " + values.size() + "."
                );
            }
        }

        for (String obligatoire : WorkflowStepCodes.ETAPES_METIER_OBLIGATOIRES) {
            if (!codes.contains(obligatoire)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Étape métier obligatoire absente : " + obligatoire
                );
            }
        }
    }

    // =====================================================
    // PERMISSIONS METIER DES 4 TYPES SPECIAUX
    // =====================================================

    private void verifierPermissionMetier(String code, Long userId) {
        switch (WorkflowStepCodes.normalize(code)) {
            case WorkflowStepCodes.RECEVABILITE_ADMINISTRATIVE -> {
                permissionService.exigerPermission(
                        userId,
                        "EVAL_ACTION_MODIFIER_RNE_CNSS"
                );
                permissionService.exigerPermission(
                        userId,
                        "EVAL_ACTION_VALIDER_SOLVABILITE"
                );
            }

            case WorkflowStepCodes.EVALUATION_TECHNIQUE ->
                    permissionService.exigerPermission(
                            userId,
                            "EVAL_ACTION_NOTER_CRITERE"
                    );

            case WorkflowStepCodes.DECISION_FINALE ->
                    permissionService.exigerPermission(
                            userId,
                            "EVAL_ACTION_VALIDER_DECISION"
                    );

            case WorkflowStepCodes.CLASSEMENT_ZONE ->
                    permissionService.exigerPermission(
                            userId,
                            "EVAL_ACTION_AFFECTER_ZONE"
                    );

            // Etape libre : pas d'action métier spécifique.
            default -> {
            }
        }
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    private WorkflowModeleEtapeResponse toResponse(WorkflowModeleEtape row) {
        Utilisateur user = row.getUtilisateurDefaut();

        return WorkflowModeleEtapeResponse.builder()
                .id(row.getId())
                .codeEtape(row.getCodeEtape())
                .libelleEtape(row.getLibelleEtape())
                .ordre(row.getOrdre())
                .departementCode(row.getDepartementCode())
                .utilisateurDefautId(user != null ? user.getId() : null)
                .utilisateurDefautNom(user != null ? user.getNom() : null)
                .utilisateurDefautEmail(user != null ? user.getEmail() : null)
                .actif(row.getActif())
                .updatedAt(row.getUpdatedAt())
                .build();
    }

    // =====================================================
    // HELPERS
    // =====================================================

    private String normalizeCode(String value) {
        String code = cleanRequired(
                value,
                "Code d'étape obligatoire."
        )
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9_]", "_")
                .replaceAll("_+", "_");

        if (code.length() > 80) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Code d'étape trop long."
            );
        }

        return code;
    }

    private String normalizeDepartmentRequired(String value) {
        String department = value == null
                ? ""
                : value.trim().toUpperCase(Locale.ROOT);

        if (!DEPARTEMENTS_AUTORISES.contains(department)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Département invalide : " + value
            );
        }

        return department;
    }

    private String cleanRequired(String value, String message) {
        String cleaned = clean(value);
        if (cleaned == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    message
            );
        }
        return cleaned;
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }
}
