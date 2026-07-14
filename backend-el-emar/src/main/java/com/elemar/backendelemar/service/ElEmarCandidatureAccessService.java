package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.*;
import com.elemar.backendelemar.entity.*;
import com.elemar.backendelemar.enums.StatutCandidature;
import com.elemar.backendelemar.enums.StatutCompte;
import com.elemar.backendelemar.enums.TypeUtilisateur;
import com.elemar.backendelemar.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
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
    @Transactional
    public void deleteCandidature(Long candidatureId) {

        if (candidatureId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant candidature obligatoire."
            );
        }

        Integer exists = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM candidature
                WHERE id = ?
                """,
                Integer.class,
                candidatureId
        );

        if (exists == null || exists == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Candidature introuvable."
            );
        }

    /*
     Suppression logique :
     On garde l'historique et les relations, mais on masque la candidature.
    */

        jdbcTemplate.update(
                """
                UPDATE candidature
                SET actif = false,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                candidatureId
        );

        jdbcTemplate.update(
                """
                UPDATE candidature_lot
                SET actif = false
                WHERE candidature_id = ?
                """,
                candidatureId
        );

        jdbcTemplate.update(
                """
                UPDATE utilisateur
                SET actif = false,
                    updated_at = CURRENT_TIMESTAMP
                WHERE candidature_id = ?
                """,
                candidatureId
        );

        try {
            jdbcTemplate.update(
                    """
                    UPDATE application_candidature
                    SET actif = false,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE candidature_id = ?
                    """,
                    candidatureId
            );
        } catch (Exception ignored) {
        /*
         Si application_candidature n'a pas la colonne actif ou updated_at,
         on ignore pour ne pas bloquer la suppression logique.
        */
        }
    }
    @Transactional
    public CandidatureAccessResponse createAccess(CreateCandidatureAccessRequest request) {

        validateCreateRequest(request);
        System.out.println("=== CREATE CANDIDATURE ACCESS ===");
        System.out.println("Nom entreprise = " + request.getNomEntreprise());
        System.out.println("Type intervenant id = " + request.getTypeIntervenantId());
        System.out.println("Lot ids = " + request.getLotIds());

        for (CreateCndUserRequest user : request.getUsers()) {
            System.out.println("User email = " + user.getEmail());
        }
        TypeIntervenant type = typeIntervenantRepository.findById(request.getTypeIntervenantId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Type d’intervenant introuvable."
                ));

        Candidature candidature = new Candidature();

        candidature.setTypeIntervenant(type);
        candidature.setNomEntreprise(cleanOrDefault(request.getNomEntreprise(), "Société à compléter"));
        candidature.setProfilComplete(false);
        candidature.setActif(true);
        candidature.setStatut(StatutCandidature.BROUILLON);
        candidature.setCreatedAt(LocalDateTime.now());
        candidature.setUpdatedAt(LocalDateTime.now());

        candidature = candidatureRepository.save(candidature);

        syncLots(candidature, type, request.getLotIds());

        List<GeneratedAccountResponse> comptesGeneres = new ArrayList<>();

        for (CreateCndUserRequest userRequest : request.getUsers()) {
            comptesGeneres.add(createUserForCandidature(candidature, userRequest));
        }

        return toResponse(candidature, comptesGeneres);
    }

    @Transactional
    public List<CandidatureAccessResponse> getAll() {
        return candidatureRepository.findByActifTrueOrderByIdDesc()
                .stream()
                .map(candidature -> toResponse(candidature, Collections.emptyList()))
                .toList();
    }

    @Transactional
    public CandidatureAccessResponse getById(Long candidatureId) {
        Candidature candidature = findCandidature(candidatureId);
        return toResponse(candidature, Collections.emptyList());
    }
    @Transactional
    public CandidatureAccessResponse updateLots(
            Long candidatureId,
            UpdateCandidatureLotsRequest request
    ) {
        Candidature candidature = findCandidature(candidatureId);

        if (candidature.getTypeIntervenant() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cette candidature n’a pas de type d’intervenant."
            );
        }

        if (request.getLotIds() == null || request.getLotIds().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Veuillez choisir au moins un lot."
            );
        }

        syncLots(candidature, candidature.getTypeIntervenant(), request.getLotIds());

        return toResponse(candidature, Collections.emptyList());
    }

    @Transactional
    public GeneratedAccountResponse addUser(
            Long candidatureId,
            CreateCndUserRequest request
    ) {
        Candidature candidature = findCandidature(candidatureId);
        return createUserForCandidature(candidature, request);
    }

    @Transactional
    public void deactivateUser(Long userId) {
        Utilisateur user = utilisateurRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable."
                ));

        user.setActif(false);
        user.setUpdatedAt(LocalDateTime.now());

        utilisateurRepository.save(user);
    }

    @Transactional
    public GeneratedAccountResponse resetPassword(Long userId) {
        Utilisateur user = utilisateurRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable."
                ));

        String temporaryPassword = passwordGeneratorService.generateTemporaryPassword();

        user.setMotDePasse(passwordEncoder.encode(temporaryPassword));
        user.setMustChangePassword(true);
        user.setUpdatedAt(LocalDateTime.now());

        utilisateurRepository.save(user);

        return GeneratedAccountResponse.builder()
                .utilisateurId(user.getId())
                .nomComplet(user.getNom())
                .email(user.getEmail())
                .motDePasseTemporaire(temporaryPassword)
                .build();
    }

    private void validateCreateRequest(CreateCandidatureAccessRequest request) {
        if (request.getTypeIntervenantId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le type d’intervenant est obligatoire."
            );
        }

        if (request.getLotIds() == null || request.getLotIds().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Veuillez choisir au moins un lot."
            );
        }

        Set<Long> uniqueLotIds = new HashSet<>();

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
                        "Le lot " + lotId + " est sélectionné plusieurs fois."
                );
            }
        }

        if (request.getUsers() == null || request.getUsers().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Veuillez ajouter au moins un utilisateur candidat."
            );
        }

        Set<String> uniqueEmails = new HashSet<>();

        for (CreateCndUserRequest user : request.getUsers()) {
            if (user.getEmail() == null || user.getEmail().isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Email utilisateur obligatoire."
                );
            }

            String email = user.getEmail().trim().toLowerCase();

            if (!uniqueEmails.add(email)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Email dupliqué dans le formulaire : " + email
                );
            }
        }
    }

    private GeneratedAccountResponse createUserForCandidature(
            Candidature candidature,
            CreateCndUserRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Utilisateur candidat invalide."
            );
        }

        String email = clean(request.getEmail());

        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email utilisateur obligatoire."
            );
        }

        email = email.toLowerCase();

        if (utilisateurRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email déjà utilisé : " + email
            );
        }

        String nomComplet = cleanOrDefault(request.getNomComplet(), email);
        String telephone = clean(request.getTelephone());
        String fonction = clean(request.getFonction());

        String temporaryPassword = passwordGeneratorService.generateTemporaryPassword();

        if (temporaryPassword == null || temporaryPassword.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur lors de la génération du mot de passe."
            );
        }

        Utilisateur user = new Utilisateur();

        user.setNom(nomComplet);
        user.setEmail(email);
        user.setTelephone(telephone);
        user.setFonction(fonction);

        user.setMotDePasse(passwordEncoder.encode(temporaryPassword));

        user.setTypeUtilisateur(TypeUtilisateur.CND);
        user.setStatutCompte(StatutCompte.ACTIF);
        user.setPremiereConnexion(true);

        user.setCandidature(candidature);

        user.setActif(true);
        user.setMustChangePassword(true);

        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        user = utilisateurRepository.saveAndFlush(user);

        return GeneratedAccountResponse.builder()
                .utilisateurId(user.getId())
                .nomComplet(user.getNom())
                .email(user.getEmail())
                .motDePasseTemporaire(temporaryPassword)
                .build();
    }
    private void syncLots(
            Candidature candidature,
            TypeIntervenant type,
            List<Long> lotIds
    ) {
        Set<Long> requestedLotIds = lotIds.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (requestedLotIds.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Veuillez choisir au moins un lot."
            );
        }

        List<CandidatureLot> existingLots =
                candidatureLotRepository.findByCandidature_Id(candidature.getId());

        Map<Long, CandidatureLot> existingByLotId = existingLots.stream()
                .collect(Collectors.toMap(
                        item -> item.getLot().getId(),
                        item -> item
                ));

        for (CandidatureLot existing : existingLots) {
            Long lotId = existing.getLot().getId();

            if (!requestedLotIds.contains(lotId)) {
                existing.setActif(false);
                candidatureLotRepository.save(existing);
            }
        }

        for (Long lotId : requestedLotIds) {
            Lot lot = lotRepository.findById(lotId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Lot introuvable : " + lotId
                    ));

            if (lot.getTypeIntervenant() != null
                    && !lot.getTypeIntervenant().getId().equals(type.getId())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Le lot " + lot.getNomLot()
                                + " ne correspond pas au type "
                                + type.getLibelle()
                );
            }

            CandidatureLot existing = existingByLotId.get(lotId);

            if (existing != null) {
                existing.setActif(true);
                candidatureLotRepository.save(existing);
            } else {
                CandidatureLot candidatureLot = CandidatureLot.builder()
                        .candidature(candidature)
                        .lot(lot)
                        .actif(true)
                        .build();

                candidatureLotRepository.save(candidatureLot);
            }
        }
    }

    private CandidatureAccessResponse toResponse(
            Candidature candidature,
            List<GeneratedAccountResponse> comptesGeneres
    ) {
        TypeIntervenant type = candidature.getTypeIntervenant();

        List<LotLightResponse> lots = candidatureLotRepository
                .findByCandidature_IdAndActifTrue(candidature.getId())
                .stream()
                .map(item -> {
                    Lot lot = item.getLot();

                    return LotLightResponse.builder()
                            .id(lot.getId())
                            .codeLot(lot.getCodeLot())
                            .nomLot(lot.getNomLot())
                            .build();
                })
                .toList();

        List<UtilisateurCndResponse> utilisateurs = utilisateurRepository
                .findByCandidature_Id(candidature.getId())
                .stream()
                .map(user -> UtilisateurCndResponse.builder()
                        .id(user.getId())
                        .nomComplet(user.getNom())
                        .email(user.getEmail())
                        .telephone(user.getTelephone())
                        .fonction(user.getFonction())
                        .actif(user.getActif())
                        .mustChangePassword(user.getMustChangePassword())
                        .build())
                .toList();

        return CandidatureAccessResponse.builder()
                .candidatureId(candidature.getId())
                .nomEntreprise(candidature.getNomEntreprise())
                .typeIntervenantId(type != null ? type.getId() : null)
                .typeIntervenantCode(type != null ? type.getCode() : null)
                .typeIntervenantLibelle(type != null ? type.getLibelle() : null)
                .statut(candidature.getStatut() != null ? candidature.getStatut().name() : null)
                .profilComplete(candidature.getProfilComplete())
                .actif(candidature.getActif())
                .lots(lots)
                .utilisateurs(utilisateurs)
                .comptesGeneres(comptesGeneres)
                .build();
    }

    private Candidature findCandidature(Long candidatureId) {
        return candidatureRepository.findByIdAndActifTrue(candidatureId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Candidature introuvable."
                ));
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }

    private String cleanOrDefault(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }

        return value.trim();
    }
}