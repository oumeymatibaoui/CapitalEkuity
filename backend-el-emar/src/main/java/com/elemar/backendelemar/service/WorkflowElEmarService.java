package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.*;
import com.elemar.backendelemar.entity.Candidature;
import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.entity.WorkflowEtapeElEmar;
import com.elemar.backendelemar.entity.WorkflowModeleEtape;
import com.elemar.backendelemar.enums.StatutWorkflowEtape;
import com.elemar.backendelemar.repository.CandidatureRepository;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import com.elemar.backendelemar.repository.WorkflowEtapeElEmarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WorkflowElEmarService {

    private final WorkflowEtapeElEmarRepository workflowRepository;
    private final CandidatureRepository candidatureRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final WorkflowPermissionService permissionService;
    private final WorkflowNotificationService notificationService;
    private final HistoriqueActionService historiqueActionService;
    private final EvaluationElementLockService evaluationElementLockService;
    private final WorkflowModeleService modeleService;
    private final WorkflowGovernanceService governanceService;
    private final JdbcTemplate jdbcTemplate;

    // =====================================================
    // INITIALISATION AUTOMATIQUE DEPUIS LE MODÈLE GLOBAL
    // =====================================================

    /**
     * Idempotent : si le dossier possède déjà un workflow, il est simplement retourné.
     * Utilisé automatiquement lors de la soumission candidat.
     */
    @Transactional
    public WorkflowCandidatureResponse initialiserDepuisModele(
            Long candidatureId
    ) {
        if (candidatureId == null || candidatureId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant candidature obligatoire."
            );
        }

        // Empêche deux soumissions concurrentes de créer deux circuits.
        jdbcTemplate.queryForList(
                "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
                "EL_EMAR_WORKFLOW_INIT:" + candidatureId
        );

        Candidature candidature = candidatureRepository.findById(candidatureId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Candidature introuvable."
                ));

        if (workflowRepository.existsByCandidature_Id(candidatureId)) {
            return buildWorkflowResponse(candidatureId);
        }

        List<WorkflowModeleEtape> modele = modeleService.chargerModelePourExecution();

        Utilisateur auteur = modele.stream()
                .map(WorkflowModeleEtape::getModifiePar)
                .filter(Objects::nonNull)
                .findFirst()
                .orElseGet(() -> modele.get(0).getUtilisateurDefaut());

        List<WorkflowEtapeElEmar> etapes = new ArrayList<>();

        for (int index = 0; index < modele.size(); index++) {
            WorkflowModeleEtape definition = modele.get(index);

            WorkflowEtapeElEmar etape = WorkflowEtapeElEmar.builder()
                    .candidature(candidature)
                    .utilisateurAffecte(definition.getUtilisateurDefaut())
                    .codeEtape(WorkflowStepCodes.normalize(definition.getCodeEtape()))
                    .libelleEtape(cleanRequired(
                            definition.getLibelleEtape(),
                            "Libellé d'étape obligatoire."
                    ))
                    .ordre(index + 1)
                    .statut(
                            index == 0
                                    ? StatutWorkflowEtape.A_TRAITER
                                    : StatutWorkflowEtape.EN_ATTENTE
                    )
                    .creePar(auteur)
                    .modifiePar(auteur)
                    .build();

            etapes.add(etape);
        }

        workflowRepository.saveAll(etapes);
        workflowRepository.flush();

        WorkflowEtapeElEmar premiere = etapes.get(0);

        notificationService.notifierEtapeDisponible(
                candidatureId,
                auteur.getId(),
                premiere.getUtilisateurAffecte().getId(),
                premiere.getLibelleEtape()
        );

        historiqueActionService.enregistrerAction(
                auteur.getId(),
                candidatureId,
                null,
                "WORKFLOW_INITIALISE_AUTO",
                "Workflow créé automatiquement depuis le modèle global. Première étape : "
                        + premiere.getLibelleEtape()
        );

        return buildWorkflowResponse(candidatureId);
    }

    // =====================================================
    // DÉMARRAGE
    // =====================================================

    @Transactional
    public WorkflowEtapeResponse demarrer(
            Long etapeId,
            Long utilisateurId
    ) {
        permissionService.exigerUtilisateurActif(utilisateurId);

        WorkflowEtapeElEmar etape = workflowRepository
                .findByIdForUpdate(etapeId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Étape introuvable."
                ));

        verifierUtilisateurAffecte(etape, utilisateurId);

        if (etape.getStatut() != StatutWorkflowEtape.A_TRAITER
                && etape.getStatut() != StatutWorkflowEtape.REOUVERTE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cette étape ne peut pas être démarrée."
            );
        }

        Long candidatureId = etape.getCandidature().getId();

        List<WorkflowEtapeElEmar> actives = workflowRepository.findActiveByCandidature(
                candidatureId,
                List.of(
                        StatutWorkflowEtape.A_TRAITER,
                        StatutWorkflowEtape.EN_COURS,
                        StatutWorkflowEtape.REOUVERTE
                )
        );

        if (actives.size() != 1
                || !Objects.equals(actives.get(0).getId(), etape.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Une autre étape active a été détectée. Le workflow doit être corrigé."
            );
        }

        etape.setStatut(StatutWorkflowEtape.EN_COURS);

        if (etape.getDateDebut() == null) {
            etape.setDateDebut(LocalDateTime.now());
        }

        etape.setModifiePar(etape.getUtilisateurAffecte());

        WorkflowEtapeElEmar saved = workflowRepository.saveAndFlush(etape);

        historiqueActionService.enregistrerAction(
                utilisateurId,
                candidatureId,
                null,
                "WORKFLOW_ETAPE_DEMARREE",
                "Étape démarrée : " + saved.getLibelleEtape()
        );

        return toResponse(saved);
    }

    // =====================================================
    // TRANSMISSION
    // =====================================================

    @Transactional
    public WorkflowCandidatureResponse transmettre(
            Long etapeId,
            TransmettreWorkflowRequest request
    ) {
        if (request == null || request.getUtilisateurId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Utilisateur obligatoire."
            );
        }

        Long utilisateurId = request.getUtilisateurId();
        permissionService.exigerUtilisateurActif(utilisateurId);

        WorkflowEtapeElEmar etape = workflowRepository
                .findByIdForUpdate(etapeId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Étape introuvable."
                ));

        verifierUtilisateurAffecte(etape, utilisateurId);

        if (etape.getStatut() != StatutWorkflowEtape.EN_COURS) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "L'étape doit être en cours avant d'être transmise."
            );
        }

        Long candidatureId = etape.getCandidature().getId();
        List<WorkflowEtapeElEmar> etapes = workflowRepository.findAllForUpdate(candidatureId);

        WorkflowEtapeElEmar actuelle = etapes.stream()
                .filter(item -> Objects.equals(item.getId(), etapeId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Étape introuvable."
                ));

        actuelle.setStatut(StatutWorkflowEtape.TERMINEE);
        actuelle.setDateFin(LocalDateTime.now());
        actuelle.setCommentaireTransmission(clean(request.getCommentaire()));
        actuelle.setModifiePar(actuelle.getUtilisateurAffecte());
        workflowRepository.saveAndFlush(actuelle);

        Optional<WorkflowEtapeElEmar> suivanteOpt = etapes.stream()
                .filter(item -> item.getOrdre() > actuelle.getOrdre())
                .filter(item -> item.getStatut() != StatutWorkflowEtape.ANNULEE)
                .min(Comparator.comparing(WorkflowEtapeElEmar::getOrdre));

        if (suivanteOpt.isPresent()) {
            WorkflowEtapeElEmar suivante = suivanteOpt.get();

            suivante.setStatut(StatutWorkflowEtape.A_TRAITER);
            suivante.setDateDebut(null);
            suivante.setDateFin(null);
            suivante.setCommentaireTransmission(null);
            suivante.setModifiePar(actuelle.getUtilisateurAffecte());

            workflowRepository.saveAndFlush(suivante);

            notificationService.notifierEtapeDisponible(
                    candidatureId,
                    utilisateurId,
                    suivante.getUtilisateurAffecte().getId(),
                    suivante.getLibelleEtape()
            );

            historiqueActionService.enregistrerAction(
                    utilisateurId,
                    candidatureId,
                    null,
                    "WORKFLOW_ETAPE_TRANSMISE",
                    "Étape terminée : "
                            + actuelle.getLibelleEtape()
                            + " | Étape suivante ouverte : "
                            + suivante.getLibelleEtape()
            );
        } else {
            historiqueActionService.enregistrerAction(
                    utilisateurId,
                    candidatureId,
                    null,
                    "WORKFLOW_TERMINE",
                    "Dernière étape terminée : "
                            + actuelle.getLibelleEtape()
                            + ". Le dossier workflow est clôturé."
            );
        }

        return buildWorkflowResponse(candidatureId);
    }

    // =====================================================
    // RÉOUVERTURE - ADMIN + IT UNIQUEMENT
    // =====================================================

    @Transactional
    public WorkflowCandidatureResponse reouvrir(
            Long etapeId,
            ReouvrirWorkflowRequest request
    ) {
        if (request == null || request.getResponsableId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Informations de réouverture obligatoires."
            );
        }

        Long responsableId = request.getResponsableId();
        governanceService.exigerReouvertureAutorisee(responsableId);

        String motif = cleanRequired(
                request.getMotif(),
                "Le motif de réouverture est obligatoire."
        );

        WorkflowEtapeElEmar cible = workflowRepository
                .findByIdForUpdate(etapeId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Étape introuvable."
                ));

        if (cible.getStatut() != StatutWorkflowEtape.TERMINEE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Seule une étape terminée peut être réouverte."
            );
        }

        Long candidatureId = cible.getCandidature().getId();
        List<WorkflowEtapeElEmar> etapes = workflowRepository.findAllForUpdate(candidatureId);

        Utilisateur responsable = utilisateurRepository.findById(responsableId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Responsable introuvable."
                ));

        Utilisateur nouvelUtilisateur = cible.getUtilisateurAffecte();

        if (request.getUtilisateurAffecteId() != null) {
            governanceService.exigerReaffectationAutorisee(
                    responsableId,
                    cible,
                    request.getUtilisateurAffecteId()
            );

            nouvelUtilisateur = utilisateurRepository
                    .findById(request.getUtilisateurAffecteId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Utilisateur affecté introuvable."
                    ));
        }

        if (nouvelUtilisateur == null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Aucun utilisateur n'est affecté à cette étape."
            );
        }

        List<WorkflowEtapeElEmar> aRetraiter = etapes.stream()
                .filter(item -> item.getOrdre() >= cible.getOrdre())
                .filter(item -> item.getStatut() != StatutWorkflowEtape.ANNULEE)
                .toList();

        Set<String> codesARetraitement = new LinkedHashSet<>();

        for (WorkflowEtapeElEmar item : aRetraiter) {
            codesARetraitement.add(item.getCodeEtape());

            if (!Objects.equals(item.getId(), cible.getId())) {
                item.setStatut(StatutWorkflowEtape.EN_ATTENTE);
                item.setDateDebut(null);
                item.setDateFin(null);
                item.setDateReouverture(null);
                item.setCommentaireTransmission(null);
                item.setMotifReouverture(null);
                item.setModifiePar(responsable);
                workflowRepository.save(item);
            }
        }

        cible.setUtilisateurAffecte(nouvelUtilisateur);
        cible.setStatut(StatutWorkflowEtape.REOUVERTE);
        cible.setDateDebut(null);
        cible.setDateFin(null);
        cible.setDateReouverture(LocalDateTime.now());
        cible.setMotifReouverture(motif);
        cible.setCommentaireTransmission(null);
        cible.setModifiePar(responsable);
        workflowRepository.saveAndFlush(cible);

        evaluationElementLockService.reinitialiserPourReouverture(
                candidatureId,
                codesARetraitement,
                responsableId,
                motif
        );

        notificationService.notifierReouverture(
                candidatureId,
                responsableId,
                nouvelUtilisateur.getId(),
                cible.getLibelleEtape(),
                motif
        );

        historiqueActionService.enregistrerAction(
                responsableId,
                candidatureId,
                null,
                "WORKFLOW_ETAPE_REOUVERTE",
                "Étape réouverte : "
                        + cible.getLibelleEtape()
                        + " | Responsable : "
                        + safe(nouvelUtilisateur.getNom())
                        + " | Motif : "
                        + motif
        );

        return buildWorkflowResponse(candidatureId);
    }

    // =====================================================
    // RÉAFFECTATION
    // =====================================================

    @Transactional
    public WorkflowEtapeResponse reaffecter(
            Long etapeId,
            ReaffecterWorkflowRequest request
    ) {
        if (request == null
                || request.getResponsableId() == null
                || request.getNouvelUtilisateurId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Informations de réaffectation obligatoires."
            );
        }

        WorkflowEtapeElEmar etape = workflowRepository
                .findByIdForUpdate(etapeId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Étape introuvable."
                ));

        if (etape.getStatut() == StatutWorkflowEtape.TERMINEE
                || etape.getStatut() == StatutWorkflowEtape.ANNULEE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Une étape terminée doit être réouverte avant réaffectation."
            );
        }

        governanceService.exigerReaffectationAutorisee(
                request.getResponsableId(),
                etape,
                request.getNouvelUtilisateurId()
        );

        Utilisateur responsable = utilisateurRepository
                .findById(request.getResponsableId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Responsable introuvable."
                ));

        Utilisateur nouvelUtilisateur = utilisateurRepository
                .findById(request.getNouvelUtilisateurId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Nouvel utilisateur introuvable."
                ));

        Long ancienUtilisateurId = etape.getUtilisateurAffecte() != null
                ? etape.getUtilisateurAffecte().getId()
                : null;

        etape.setUtilisateurAffecte(nouvelUtilisateur);
        etape.setModifiePar(responsable);

        WorkflowEtapeElEmar saved = workflowRepository.saveAndFlush(etape);

        if (saved.getStatut() != null && saved.getStatut().estActive()) {
            notificationService.notifierEtapeDisponible(
                    saved.getCandidature().getId(),
                    responsable.getId(),
                    nouvelUtilisateur.getId(),
                    saved.getLibelleEtape()
            );
        }

        historiqueActionService.enregistrerAction(
                responsable.getId(),
                saved.getCandidature().getId(),
                null,
                "WORKFLOW_ETAPE_REAFFECTEE",
                "Étape réaffectée : "
                        + saved.getLibelleEtape()
                        + " | Ancien utilisateur ID : "
                        + ancienUtilisateurId
                        + " | Nouvel utilisateur : "
                        + safe(nouvelUtilisateur.getNom())
                        + " | Motif : "
                        + safe(request.getMotif())
        );

        return toResponse(saved);
    }

    // =====================================================
    // CONSULTATION
    // =====================================================

    @Transactional(readOnly = true)
    public WorkflowCandidatureResponse getWorkflow(
            Long candidatureId,
            Long utilisateurId
    ) {
        if (!peutVoirWorkflow(candidatureId, utilisateurId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Vous ne pouvez pas consulter ce workflow."
            );
        }

        return buildWorkflowResponse(candidatureId);
    }

    @Transactional(readOnly = true)
    public List<WorkflowEtapeResponse> getMesEtapes(Long utilisateurId) {
        permissionService.exigerUtilisateurActif(utilisateurId);

        return workflowRepository
                .findAllByUtilisateurAffecte_IdAndStatutInOrderByUpdatedAtDesc(
                        utilisateurId,
                        List.of(
                                StatutWorkflowEtape.EN_ATTENTE,
                                StatutWorkflowEtape.A_TRAITER,
                                StatutWorkflowEtape.EN_COURS,
                                StatutWorkflowEtape.REOUVERTE
                        )
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean peutVoirWorkflow(
            Long candidatureId,
            Long utilisateurId
    ) {
        permissionService.exigerUtilisateurActif(utilisateurId);

        if (governanceService.peutVoirTousLesWorkflows(utilisateurId)) {
            return true;
        }

        return workflowRepository
                .findAllByCandidature_IdOrderByOrdreAsc(candidatureId)
                .stream()
                .anyMatch(item -> item.getUtilisateurAffecte() != null
                        && Objects.equals(
                        item.getUtilisateurAffecte().getId(),
                        utilisateurId
                ));
    }


    // =====================================================
    // UTILISATEURS AFFECTABLES À UNE ÉTAPE
    // =====================================================

    /**
     * Retourne uniquement les informations nécessaires à la réaffectation.
     *
     * ADMIN + IT    : autorisé.
     * ADMIN + ACHAT : autorisé.
     * Autres profils: interdit.
     *
     * La liste est limitée au département réel de l'étape.
     * Cela évite d'utiliser la page/API de gestion des utilisateurs
     * pour la simple réaffectation workflow.
     */
    @Transactional(readOnly = true)
    public List<WorkflowUtilisateurAffectableResponse> getUtilisateursAffectables(
            Long etapeId,
            Long utilisateurConnecteId
    ) {
        if (etapeId == null || etapeId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant d'étape obligatoire."
            );
        }

        permissionService.exigerUtilisateurActif(
                utilisateurConnecteId
        );

        boolean autorise =
                governanceService.estAdminGlobal(
                        utilisateurConnecteId
                )
                        ||
                        governanceService.estAdminAchatLectureSeule(
                                utilisateurConnecteId
                        );

        if (!autorise) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Vous n'êtes pas autorisé à réaffecter les responsables du workflow."
            );
        }

        WorkflowEtapeElEmar etape =
                workflowRepository.findById(etapeId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Étape workflow introuvable."
                                )
                        );

        String departement =
                governanceService.departementEtape(
                        etape
                );

        return jdbcTemplate.query(
                """
                SELECT
                    u.id,
                    u.nom,
                    u.email,
                    CAST(u.type_utilisateur AS TEXT) AS type_utilisateur
                FROM utilisateur u
                JOIN role_acces r
                  ON r.id = u.role_id
                 AND COALESCE(r.actif, FALSE) = TRUE
                WHERE COALESCE(u.actif, FALSE) = TRUE
                  AND (
                        u.statut_compte IS NULL
                        OR CAST(u.statut_compte AS TEXT) = 'ACTIF'
                  )
                  AND UPPER(
                        TRIM(
                            CAST(u.type_utilisateur AS TEXT)
                        )
                  ) = ?
                ORDER BY
                    LOWER(COALESCE(u.nom, '')),
                    LOWER(COALESCE(u.email, ''))
                """,
                (rs, rowNum) ->
                        WorkflowUtilisateurAffectableResponse
                                .builder()
                                .id(
                                        rs.getLong("id")
                                )
                                .nom(
                                        rs.getString("nom")
                                )
                                .email(
                                        rs.getString("email")
                                )
                                .typeUtilisateur(
                                        rs.getString(
                                                "type_utilisateur"
                                        )
                                )
                                .build(),
                departement
        );
    }

    // =====================================================
    // MAPPING
    // =====================================================

    private WorkflowCandidatureResponse buildWorkflowResponse(Long candidatureId) {
        Candidature candidature = candidatureRepository.findById(candidatureId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Candidature introuvable."
                ));

        List<WorkflowEtapeResponse> etapes = workflowRepository
                .findAllByCandidature_IdOrderByOrdreAsc(candidatureId)
                .stream()
                .map(this::toResponse)
                .toList();

        WorkflowEtapeResponse active = etapes.stream()
                .filter(item -> Boolean.TRUE.equals(item.getActive()))
                .findFirst()
                .orElse(null);

        boolean termine = !etapes.isEmpty()
                && etapes.stream().allMatch(item ->
                StatutWorkflowEtape.TERMINEE.name().equals(item.getStatut())
                        || StatutWorkflowEtape.ANNULEE.name().equals(item.getStatut())
        );

        return WorkflowCandidatureResponse.builder()
                .candidatureId(candidatureId)
                .raisonSociale(candidature.getRaisonSociale())
                .workflowInitialise(!etapes.isEmpty())
                .workflowTermine(termine)
                .etapeActive(active)
                .etapes(etapes)
                .build();
    }

    private WorkflowEtapeResponse toResponse(WorkflowEtapeElEmar etape) {
        Utilisateur utilisateur = etape.getUtilisateurAffecte();
        Candidature candidature = etape.getCandidature();

        boolean active = etape.getStatut() != null
                && etape.getStatut().estActive();

        // Une étape A_TRAITER est active, mais n'est pas encore modifiable métier.
        boolean modifiable = etape.getStatut() == StatutWorkflowEtape.EN_COURS;

        return WorkflowEtapeResponse.builder()
                .id(etape.getId())
                .candidatureId(candidature != null ? candidature.getId() : null)
                .raisonSociale(candidature != null ? candidature.getRaisonSociale() : null)
                .codeEtape(etape.getCodeEtape())
                .libelleEtape(etape.getLibelleEtape())
                .ordre(etape.getOrdre())
                .departementCode(
                        utilisateur != null
                                ? governanceService.departementEtape(etape)
                                : WorkflowStepCodes.departement(etape.getCodeEtape())
                )
                .statut(etape.getStatut() != null ? etape.getStatut().name() : null)
                .active(active)
                .modifiable(modifiable)
                .verrouillee(!modifiable)
                .utilisateurAffecteId(utilisateur != null ? utilisateur.getId() : null)
                .utilisateurAffecteNom(utilisateur != null ? utilisateur.getNom() : null)
                .utilisateurAffecteEmail(utilisateur != null ? utilisateur.getEmail() : null)
                .commentaireTransmission(etape.getCommentaireTransmission())
                .dateDebut(etape.getDateDebut())
                .dateFin(etape.getDateFin())
                .dateReouverture(etape.getDateReouverture())
                .motifReouverture(etape.getMotifReouverture())
                .createdAt(etape.getCreatedAt())
                .updatedAt(etape.getUpdatedAt())
                .build();
    }

    private void verifierUtilisateurAffecte(
            WorkflowEtapeElEmar etape,
            Long utilisateurId
    ) {
        if (etape.getUtilisateurAffecte() == null
                || etape.getUtilisateurAffecte().getId() == null
                || !Objects.equals(etape.getUtilisateurAffecte().getId(), utilisateurId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cette étape est actuellement affectée à un autre utilisateur."
            );
        }
    }

    private String cleanRequired(String value, String message) {
        String cleaned = clean(value);
        if (cleaned == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
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

    private String safe(String value) {
        String cleaned = clean(value);
        return cleaned == null ? "-" : cleaned;
    }
}
