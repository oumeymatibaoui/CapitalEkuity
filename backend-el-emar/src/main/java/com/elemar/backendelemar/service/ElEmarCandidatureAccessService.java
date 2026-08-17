package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.*;
import com.elemar.backendelemar.entity.Candidature;
import com.elemar.backendelemar.entity.CandidatureLot;
import com.elemar.backendelemar.entity.Lot;
import com.elemar.backendelemar.entity.TypeIntervenant;
import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.enums.StatutCandidature;
import com.elemar.backendelemar.enums.StatutCompte;
import com.elemar.backendelemar.enums.TypeUtilisateur;
import com.elemar.backendelemar.repository.CandidatureLotRepository;
import com.elemar.backendelemar.repository.CandidatureRepository;
import com.elemar.backendelemar.repository.LotRepository;
import com.elemar.backendelemar.repository.TypeIntervenantRepository;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ElEmarCandidatureAccessService {

    private final JdbcTemplate jdbcTemplate;

    private final CandidatureRepository candidatureRepository;

    private final TypeIntervenantRepository typeIntervenantRepository;

    private final LotRepository lotRepository;

    private final UtilisateurRepository utilisateurRepository;

    private final CandidatureLotRepository candidatureLotRepository;

    private final PasswordGeneratorService passwordGeneratorService;

    private final PasswordEncoder passwordEncoder;

    // =====================================================
    // SUPPRESSION DÉFINITIVE
    // =====================================================

    @Transactional
    public void deleteCandidature(
            Long candidatureId
    ) {
        if (candidatureId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant candidature obligatoire."
            );
        }

        Integer candidatureExists =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM candidature
                        WHERE id = ?
                        """,
                        Integer.class,
                        candidatureId
                );

        if (
                candidatureExists == null
                        || candidatureExists == 0
        ) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Candidature introuvable."
            );
        }

        /*
         * Il n’existe plus de candidature.utilisateur_id.
         *
         * La relation correcte est maintenant :
         *
         * utilisateur.candidature_id
         *
         * Il ne faut donc plus exécuter :
         *
         * UPDATE candidature
         * SET utilisateur_id = NULL
         */

        /*
         * 1. Supprimer les applications liées
         * à la candidature.
         */
        int applicationsDeleted =
                jdbcTemplate.update(
                        """
                        DELETE FROM application_candidature
                        WHERE candidature_id = ?
                        """,
                        candidatureId
                );

        /*
         * 2. Supprimer les associations
         * entre la candidature et les lots.
         */
        int lotsDeleted =
                jdbcTemplate.update(
                        """
                        DELETE FROM candidature_lot
                        WHERE candidature_id = ?
                        """,
                        candidatureId
                );

        /*
         * 3. Supprimer tous les comptes candidats liés.
         *
         * Une candidature peut posséder plusieurs utilisateurs.
         * La clé étrangère se trouve donc dans utilisateur.
         */
        int usersDeleted =
                jdbcTemplate.update(
                        """
                        DELETE FROM utilisateur
                        WHERE candidature_id = ?
                        """,
                        candidatureId
                );

        /*
         * 4. Supprimer enfin la candidature.
         */
        int candidatureDeleted =
                jdbcTemplate.update(
                        """
                        DELETE FROM candidature
                        WHERE id = ?
                        """,
                        candidatureId
                );

        if (candidatureDeleted != 1) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "La candidature n’a pas pu être supprimée."
            );
        }

        System.out.println(
                "=== SUPPRESSION CANDIDATURE TERMINÉE ==="
        );

        System.out.println(
                "Candidature supprimée : "
                        + candidatureId
        );

        System.out.println(
                "Applications supprimées : "
                        + applicationsDeleted
        );

        System.out.println(
                "Associations lots supprimées : "
                        + lotsDeleted
        );

        System.out.println(
                "Utilisateurs candidats supprimés : "
                        + usersDeleted
        );
    }

    // =====================================================
    // DÉSACTIVATION DE LA CANDIDATURE
    // =====================================================

    @Transactional
    public CandidatureAccessResponse deactivateCandidature(
            Long candidatureId
    ) {
        if (candidatureId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant candidature obligatoire."
            );
        }

        Candidature candidature =
                candidatureRepository
                        .findById(candidatureId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Candidature introuvable."
                                )
                        );

        candidature.setAccesBloque(true);
        candidature.setUpdatedAt(
                LocalDateTime.now()
        );

        candidature =
                candidatureRepository.saveAndFlush(
                        candidature
                );

        /*
         * Désactiver tous les utilisateurs
         * appartenant à cette candidature.
         */
        List<Utilisateur> utilisateurs =
                utilisateurRepository
                        .findByCandidature_Id(
                                candidatureId
                        );

        for (Utilisateur utilisateur : utilisateurs) {
            utilisateur.setActif(false);
            utilisateur.setUpdatedAt(
                    LocalDateTime.now()
            );
        }

        utilisateurRepository.saveAll(
                utilisateurs
        );

        utilisateurRepository.flush();

        return toResponse(
                candidature,
                Collections.emptyList()
        );
    }

    // =====================================================
    // CRÉATION DE L’ACCÈS CANDIDATURE
    // =====================================================

    @Transactional
    public CandidatureAccessResponse createAccess(
            CreateCandidatureAccessRequest request
    ) {
        validateCreateRequest(request);

        System.out.println(
                "=== CREATE CANDIDATURE ACCESS ==="
        );

        System.out.println(
                "Nom entreprise = "
                        + request.getNomEntreprise()
        );

        System.out.println(
                "Type intervenant id = "
                        + request.getTypeIntervenantId()
        );

        System.out.println(
                "Lot ids = "
                        + request.getLotIds()
        );

        for (
                CreateCndUserRequest user :
                request.getUsers()
        ) {
            System.out.println(
                    "User email = "
                            + user.getEmail()
            );
        }

        TypeIntervenant type =
                typeIntervenantRepository
                        .findById(
                                request.getTypeIntervenantId()
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Type d’intervenant introuvable."
                                )
                        );

        Candidature candidature =
                new Candidature();

        candidature.setTypeIntervenant(type);

        candidature.setNomEntreprise(
                cleanOrDefault(
                        request.getNomEntreprise(),
                        "Société à compléter"
                )
        );

        candidature.setProfilComplete(false);
        candidature.setActif(true);
        candidature.setAccesBloque(false);
        candidature.setStatut(
                StatutCandidature.BROUILLON
        );

        candidature.setCreatedAt(
                LocalDateTime.now()
        );

        candidature.setUpdatedAt(
                LocalDateTime.now()
        );

        candidature =
                candidatureRepository.save(
                        candidature
                );

        syncLots(
                candidature,
                type,
                request.getLotIds()
        );

        List<GeneratedAccountResponse> comptesGeneres =
                new ArrayList<>();

        for (
                CreateCndUserRequest userRequest :
                request.getUsers()
        ) {
            comptesGeneres.add(
                    createUserForCandidature(
                            candidature,
                            userRequest
                    )
            );
        }

        return toResponse(
                candidature,
                comptesGeneres
        );
    }

    // =====================================================
    // LISTE DES CANDIDATURES
    // =====================================================

    @Transactional
    public List<CandidatureAccessResponse> getAll() {

        List<Candidature> candidatures =
                candidatureRepository
                        .findByActifTrueOrderByIdDesc();

        return candidatures
                .stream()
                .map(candidature ->
                        toResponse(
                                candidature,
                                Collections.emptyList()
                        )
                )
                .toList();
    }

    // =====================================================
    // DÉTAIL D’UNE CANDIDATURE
    // =====================================================

    @Transactional
    public CandidatureAccessResponse getById(
            Long candidatureId
    ) {
        Candidature candidature =
                findCandidature(
                        candidatureId
                );

        return toResponse(
                candidature,
                Collections.emptyList()
        );
    }

    // =====================================================
    // MODIFICATION DES LOTS
    // =====================================================

    @Transactional
    public CandidatureAccessResponse updateLots(
            Long candidatureId,
            UpdateCandidatureLotsRequest request
    ) {
        Candidature candidature =
                findCandidature(
                        candidatureId
                );

        if (
                candidature.getTypeIntervenant()
                        == null
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cette candidature n’a pas de type d’intervenant."
            );
        }

        if (
                request == null
                        || request.getLotIds() == null
                        || request.getLotIds().isEmpty()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Veuillez choisir au moins un lot."
            );
        }

        syncLots(
                candidature,
                candidature.getTypeIntervenant(),
                request.getLotIds()
        );

        return toResponse(
                candidature,
                Collections.emptyList()
        );
    }

    // =====================================================
    // AJOUT D’UN UTILISATEUR CANDIDAT
    // =====================================================

    @Transactional
    public GeneratedAccountResponse addUser(
            Long candidatureId,
            CreateCndUserRequest request
    ) {
        Candidature candidature =
                findCandidature(
                        candidatureId
                );

        return createUserForCandidature(
                candidature,
                request
        );
    }

    // =====================================================
    // RÉACTIVATION DE LA CANDIDATURE
    // =====================================================

    @Transactional
    public CandidatureAccessResponse activateCandidature(
            Long candidatureId
    ) {
        if (candidatureId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant candidature obligatoire."
            );
        }

        Candidature candidature =
                candidatureRepository
                        .findById(candidatureId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Candidature introuvable."
                                )
                        );

        candidature.setAccesBloque(false);
        candidature.setActif(true);

        candidature.setUpdatedAt(
                LocalDateTime.now()
        );

        candidature =
                candidatureRepository.saveAndFlush(
                        candidature
                );

        /*
         * Réactiver tous les comptes candidats
         * appartenant à cette candidature.
         */
        List<Utilisateur> utilisateurs =
                utilisateurRepository
                        .findByCandidature_Id(
                                candidatureId
                        );

        for (Utilisateur utilisateur : utilisateurs) {
            utilisateur.setActif(true);

            utilisateur.setStatutCompte(
                    StatutCompte.ACTIF
            );

            utilisateur.setUpdatedAt(
                    LocalDateTime.now()
            );
        }

        utilisateurRepository.saveAll(
                utilisateurs
        );

        utilisateurRepository.flush();

        return toResponse(
                candidature,
                Collections.emptyList()
        );
    }

    // =====================================================
    // RÉACTIVATION D’UN UTILISATEUR
    // =====================================================

    @Transactional
    public void activateUser(
            Long userId
    ) {
        if (userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant utilisateur obligatoire."
            );
        }

        Utilisateur user =
                utilisateurRepository
                        .findById(userId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Utilisateur introuvable."
                                )
                        );

        user.setActif(true);

        user.setStatutCompte(
                StatutCompte.ACTIF
        );

        user.setUpdatedAt(
                LocalDateTime.now()
        );

        utilisateurRepository.saveAndFlush(
                user
        );
    }

    // =====================================================
    // DÉSACTIVATION D’UN UTILISATEUR
    // =====================================================

    @Transactional
    public void deactivateUser(
            Long userId
    ) {
        if (userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant utilisateur obligatoire."
            );
        }

        Utilisateur user =
                utilisateurRepository
                        .findById(userId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Utilisateur introuvable."
                                )
                        );

        user.setActif(false);

        user.setUpdatedAt(
                LocalDateTime.now()
        );

        utilisateurRepository.saveAndFlush(
                user
        );
    }

    // =====================================================
    // RÉINITIALISATION DU MOT DE PASSE
    // =====================================================

    @Transactional
    public GeneratedAccountResponse resetPassword(
            Long userId
    ) {
        if (userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant utilisateur obligatoire."
            );
        }

        Utilisateur user =
                utilisateurRepository
                        .findById(userId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Utilisateur introuvable."
                                )
                        );

        String temporaryPassword =
                passwordGeneratorService
                        .generateTemporaryPassword();

        if (
                temporaryPassword == null
                        || temporaryPassword.isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur lors de la génération du mot de passe."
            );
        }

        user.setMotDePasse(
                passwordEncoder.encode(
                        temporaryPassword
                )
        );

        user.setMustChangePassword(true);

        user.setUpdatedAt(
                LocalDateTime.now()
        );

        utilisateurRepository.saveAndFlush(
                user
        );

        return GeneratedAccountResponse
                .builder()
                .utilisateurId(
                        user.getId()
                )
                .nomComplet(
                        user.getNom()
                )
                .email(
                        user.getEmail()
                )
                .motDePasseTemporaire(
                        temporaryPassword
                )
                .build();
    }

    // =====================================================
    // VALIDATION DE LA CRÉATION
    // =====================================================

    private void validateCreateRequest(
            CreateCandidatureAccessRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations de la candidature sont obligatoires."
            );
        }

        if (
                request.getTypeIntervenantId()
                        == null
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le type d’intervenant est obligatoire."
            );
        }

        if (
                request.getLotIds() == null
                        || request.getLotIds().isEmpty()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Veuillez choisir au moins un lot."
            );
        }

        Set<Long> uniqueLotIds =
                new HashSet<>();

        for (Long lotId : request.getLotIds()) {
            if (lotId == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Un lot sélectionné est invalide."
                );
            }

            if (!uniqueLotIds.add(lotId)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Le lot "
                                + lotId
                                + " est sélectionné plusieurs fois."
                );
            }
        }

        if (
                request.getUsers() == null
                        || request.getUsers().isEmpty()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Veuillez ajouter au moins un utilisateur candidat."
            );
        }

        Set<String> uniqueEmails =
                new HashSet<>();

        for (
                CreateCndUserRequest user :
                request.getUsers()
        ) {
            if (
                    user == null
                            || user.getEmail() == null
                            || user.getEmail().isBlank()
            ) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Email utilisateur obligatoire."
                );
            }

            String email =
                    user.getEmail()
                            .trim()
                            .toLowerCase();

            if (!uniqueEmails.add(email)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Email dupliqué dans le formulaire : "
                                + email
                );
            }
        }
    }

    // =====================================================
    // CRÉATION D’UN COMPTE CANDIDAT
    // =====================================================

    private GeneratedAccountResponse createUserForCandidature(
            Candidature candidature,
            CreateCndUserRequest request
    ) {
        if (candidature == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Candidature obligatoire."
            );
        }

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Utilisateur candidat invalide."
            );
        }

        String email =
                clean(
                        request.getEmail()
                );

        if (
                email == null
                        || email.isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email utilisateur obligatoire."
            );
        }

        email = email.toLowerCase();

        if (
                utilisateurRepository
                        .existsByEmailIgnoreCase(email)
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email déjà utilisé : "
                            + email
            );
        }

        String nomComplet =
                cleanOrDefault(
                        request.getNomComplet(),
                        email
                );

        String telephone =
                clean(
                        request.getTelephone()
                );

        String fonction =
                clean(
                        request.getFonction()
                );

        String temporaryPassword =
                passwordGeneratorService
                        .generateTemporaryPassword();

        if (
                temporaryPassword == null
                        || temporaryPassword.isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur lors de la génération du mot de passe."
            );
        }

        Utilisateur user =
                new Utilisateur();

        user.setNom(
                nomComplet
        );

        user.setEmail(
                email
        );

        user.setTelephone(
                telephone
        );

        user.setFonction(
                fonction
        );

        user.setMotDePasse(
                passwordEncoder.encode(
                        temporaryPassword
                )
        );

        user.setTypeUtilisateur(
                TypeUtilisateur.CND
        );

        user.setStatutCompte(
                StatutCompte.ACTIF
        );

        user.setPremiereConnexion(true);

        /*
         * Relation correcte :
         *
         * plusieurs utilisateurs
         * → une candidature
         *
         * La clé étrangère est :
         * utilisateur.candidature_id
         */
        user.setCandidature(
                candidature
        );

        user.setActif(true);
        user.setMustChangePassword(true);

        user.setCreatedAt(
                LocalDateTime.now()
        );

        user.setUpdatedAt(
                LocalDateTime.now()
        );

        user =
                utilisateurRepository
                        .saveAndFlush(user);

        return GeneratedAccountResponse
                .builder()
                .utilisateurId(
                        user.getId()
                )
                .nomComplet(
                        user.getNom()
                )
                .email(
                        user.getEmail()
                )
                .motDePasseTemporaire(
                        temporaryPassword
                )
                .build();
    }

    // =====================================================
    // SYNCHRONISATION DES LOTS
    // =====================================================

    private void syncLots(
            Candidature candidature,
            TypeIntervenant type,
            List<Long> lotIds
    ) {
        if (candidature == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Candidature obligatoire."
            );
        }

        if (type == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Type d’intervenant obligatoire."
            );
        }

        if (
                lotIds == null
                        || lotIds.isEmpty()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Veuillez choisir au moins un lot."
            );
        }

        Set<Long> requestedLotIds =
                lotIds.stream()
                        .filter(Objects::nonNull)
                        .collect(
                                Collectors.toSet()
                        );

        if (requestedLotIds.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Veuillez choisir au moins un lot."
            );
        }

        List<CandidatureLot> existingLots =
                candidatureLotRepository
                        .findByCandidature_Id(
                                candidature.getId()
                        );

        Map<Long, CandidatureLot> existingByLotId =
                new HashMap<>();

        for (
                CandidatureLot existing :
                existingLots
        ) {
            if (
                    existing.getLot() != null
                            && existing.getLot().getId() != null
            ) {
                existingByLotId.put(
                        existing.getLot().getId(),
                        existing
                );
            }
        }

        /*
         * Désactiver les lots qui ne sont
         * plus sélectionnés.
         */
        for (
                CandidatureLot existing :
                existingLots
        ) {
            if (
                    existing.getLot() == null
                            || existing.getLot().getId() == null
            ) {
                continue;
            }

            Long lotId =
                    existing.getLot().getId();

            if (
                    !requestedLotIds.contains(
                            lotId
                    )
            ) {
                existing.setActif(false);

                candidatureLotRepository.save(
                        existing
                );
            }
        }

        /*
         * Ajouter ou réactiver les lots sélectionnés.
         */
        for (Long lotId : requestedLotIds) {
            Lot lot =
                    lotRepository
                            .findById(lotId)
                            .orElseThrow(() ->
                                    new ResponseStatusException(
                                            HttpStatus.NOT_FOUND,
                                            "Lot introuvable : "
                                                    + lotId
                                    )
                            );

            if (
                    lot.getTypeIntervenant() != null
                            && !Objects.equals(
                            lot.getTypeIntervenant().getId(),
                            type.getId()
                    )
            ) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Le lot "
                                + lot.getNomLot()
                                + " ne correspond pas au type "
                                + type.getLibelle()
                );
            }

            CandidatureLot existing =
                    existingByLotId.get(
                            lotId
                    );

            if (existing != null) {
                existing.setActif(true);

                candidatureLotRepository.save(
                        existing
                );
            } else {
                CandidatureLot candidatureLot =
                        CandidatureLot
                                .builder()
                                .candidature(
                                        candidature
                                )
                                .lot(
                                        lot
                                )
                                .actif(true)
                                .build();

                candidatureLotRepository.save(
                        candidatureLot
                );
            }
        }

        candidatureLotRepository.flush();
    }

    // =====================================================
    // CONSTRUCTION DE LA RÉPONSE
    // =====================================================

    private CandidatureAccessResponse toResponse(
            Candidature candidature,
            List<GeneratedAccountResponse> comptesGeneres
    ) {
        TypeIntervenant type =
                candidature.getTypeIntervenant();

        List<LotLightResponse> lots =
                candidatureLotRepository
                        .findByCandidature_IdAndActifTrue(
                                candidature.getId()
                        )
                        .stream()
                        .map(item -> {
                            Lot lot =
                                    item.getLot();

                            return LotLightResponse
                                    .builder()
                                    .id(
                                            lot.getId()
                                    )
                                    .codeLot(
                                            lot.getCodeLot()
                                    )
                                    .nomLot(
                                            lot.getNomLot()
                                    )
                                    .build();
                        })
                        .toList();

        /*
         * Les utilisateurs sont maintenant cherchés
         * uniquement via utilisateur.candidature_id.
         */
        List<UtilisateurCndResponse> utilisateurs =
                utilisateurRepository
                        .findByCandidature_Id(
                                candidature.getId()
                        )
                        .stream()
                        .map(user ->
                                UtilisateurCndResponse
                                        .builder()
                                        .id(
                                                user.getId()
                                        )
                                        .nomComplet(
                                                user.getNom()
                                        )
                                        .email(
                                                user.getEmail()
                                        )
                                        .telephone(
                                                user.getTelephone()
                                        )
                                        .fonction(
                                                user.getFonction()
                                        )
                                        /*
                                         * Correction :
                                         * on utilise l’état du compte utilisateur.
                                         *
                                         * Avant, actif était affecté deux fois
                                         * et candidature.getActif() écrasait
                                         * user.getActif().
                                         */
                                        .actif(
                                                Boolean.TRUE.equals(
                                                        user.getActif()
                                                )
                                        )
                                        .mustChangePassword(
                                                Boolean.TRUE.equals(
                                                        user.getMustChangePassword()
                                                )
                                        )
                                        .build()
                        )
                        .toList();

        return CandidatureAccessResponse
                .builder()
                .candidatureId(
                        candidature.getId()
                )
                .nomEntreprise(
                        candidature.getNomEntreprise()
                )
                .typeIntervenantId(
                        type != null
                                ? type.getId()
                                : null
                )
                .typeIntervenantCode(
                        type != null
                                ? type.getCode()
                                : null
                )
                .typeIntervenantLibelle(
                        type != null
                                ? type.getLibelle()
                                : null
                )
                .statut(
                        candidature.getStatut() != null
                                ? candidature
                                .getStatut()
                                .name()
                                : null
                )
                .profilComplete(
                        candidature.getProfilComplete()
                )
                /*
                 * Ici actif correspond bien
                 * à l’état global de la candidature.
                 */
                .actif(
                        candidature.getActif()
                )
                .lots(
                        lots
                )
                .utilisateurs(
                        utilisateurs
                )
                .comptesGeneres(
                        comptesGeneres == null
                                ? Collections.emptyList()
                                : comptesGeneres
                )
                .accesBloque(
                        Boolean.TRUE.equals(
                                candidature.getAccesBloque()
                        )
                )
                .build();
    }

    // =====================================================
    // RECHERCHE D’UNE CANDIDATURE ACTIVE
    // =====================================================

    private Candidature findCandidature(
            Long candidatureId
    ) {
        if (candidatureId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant candidature obligatoire."
            );
        }

        return candidatureRepository
                .findByIdAndActifTrue(
                        candidatureId
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Candidature introuvable ou désactivée."
                        )
                );
    }

    // =====================================================
    // NETTOYAGE DES CHAÎNES
    // =====================================================

    private String clean(
            String value
    ) {
        return value == null
                ? null
                : value.trim();
    }

    private String cleanOrDefault(
            String value,
            String defaultValue
    ) {
        if (
                value == null
                        || value.isBlank()
        ) {
            return defaultValue;
        }

        return value.trim();
    }

    // =====================================================
    // MODIFICATION DE LA CANDIDATURE
    // =====================================================

    @Transactional
    public CandidatureAccessResponse updateCandidature(
            Long candidatureId,
            UpdateCandidatureAccessRequest request
    ) {
        if (candidatureId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant candidature obligatoire."
            );
        }

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations de modification sont obligatoires."
            );
        }

        String nomEntreprise =
                clean(
                        request.getNomEntreprise()
                );

        if (
                nomEntreprise == null
                        || nomEntreprise.isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nom de l’entreprise est obligatoire."
            );
        }

        if (
                request.getTypeIntervenantId()
                        == null
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le type d’intervenant est obligatoire."
            );
        }

        if (
                request.getLotIds() == null
                        || request.getLotIds().isEmpty()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Veuillez choisir au moins un lot."
            );
        }

        Set<Long> uniqueLotIds =
                new HashSet<>();

        for (Long lotId : request.getLotIds()) {
            if (lotId == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Un lot sélectionné est invalide."
                );
            }

            if (!uniqueLotIds.add(lotId)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Le lot "
                                + lotId
                                + " est sélectionné plusieurs fois."
                );
            }
        }

        Candidature candidature =
                findCandidature(
                        candidatureId
                );

        TypeIntervenant type =
                typeIntervenantRepository
                        .findById(
                                request.getTypeIntervenantId()
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Type d’intervenant introuvable."
                                )
                        );

        candidature.setNomEntreprise(
                nomEntreprise
        );

        candidature.setTypeIntervenant(
                type
        );

        candidature.setUpdatedAt(
                LocalDateTime.now()
        );

        candidature.setActif(true);

        candidature =
                candidatureRepository
                        .saveAndFlush(
                                candidature
                        );

        syncLots(
                candidature,
                type,
                request.getLotIds()
        );

        return toResponse(
                candidature,
                Collections.emptyList()
        );
    }
    @Transactional
    public UtilisateurCndResponse updateUser(
            Long userId,
            UpdateCndUserRequest request
    ) {
        if (userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant utilisateur obligatoire."
            );
        }

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Informations utilisateur obligatoires."
            );
        }

        Utilisateur user = utilisateurRepository
                .findById(userId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Utilisateur introuvable."
                        )
                );

        if (user.getCandidature() == null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce compte n'est pas rattaché à un intervenant."
            );
        }

        String nom = clean(request.getNomComplet());
        String email = clean(request.getEmail());

        if (nom == null || nom.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nom complet est obligatoire."
            );
        }

        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "L'adresse email est obligatoire."
            );
        }

        email = email.toLowerCase();

        utilisateurRepository
                .findByEmailIgnoreCase(email)
                .filter(existing ->
                        !existing.getId().equals(userId)
                )
                .ifPresent(existing -> {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Cette adresse email est déjà utilisée."
                    );
                });

        user.setNom(nom);
        user.setEmail(email);
        user.setTelephone(clean(request.getTelephone()));
        user.setFonction(clean(request.getFonction()));
        user.setUpdatedAt(LocalDateTime.now());

        user = utilisateurRepository.saveAndFlush(user);

        return UtilisateurCndResponse.builder()
                .id(user.getId())
                .nomComplet(user.getNom())
                .email(user.getEmail())
                .telephone(user.getTelephone())
                .fonction(user.getFonction())
                .actif(user.getActif())
                .mustChangePassword(
                        user.getMustChangePassword()
                )
                .build();
    }

    @Transactional
    public void deleteUser(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant utilisateur obligatoire."
            );
        }

        Utilisateur user = utilisateurRepository
                .findById(userId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Utilisateur introuvable."
                        )
                );

        if (user.getCandidature() == null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce compte n'est pas rattaché à un intervenant."
            );
        }

        Long candidatureId =
                user.getCandidature().getId();

        long nombreUtilisateurs =
                utilisateurRepository
                        .findByCandidature_Id(candidatureId)
                        .size();

        if (nombreUtilisateurs <= 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Impossible de supprimer le dernier utilisateur de cet intervenant."
            );
        }

        try {
            utilisateurRepository.delete(user);
            utilisateurRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce compte est déjà lié à des opérations du système. Désactivez-le au lieu de le supprimer."
            );
        }
    }
}