package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.ClassementZoneResponse;
import com.elemar.backendelemar.dto.SaveReferenceZoneRequest;
import com.elemar.backendelemar.entity.ApplicationCandidature;
import com.elemar.backendelemar.entity.ClassementZone;
import com.elemar.backendelemar.entity.ProjetReference;
import com.elemar.backendelemar.entity.Zone;
import com.elemar.backendelemar.repository.ApplicationCandidatureRepository;
import com.elemar.backendelemar.repository.ClassementZoneRepository;
import com.elemar.backendelemar.repository.ProjetReferenceRepository;
import com.elemar.backendelemar.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassementZoneService {

    private final ClassementZoneRepository classementZoneRepository;
    private final ApplicationCandidatureRepository applicationCandidatureRepository;
    private final ZoneRepository zoneRepository;
    private final ProjetReferenceRepository projetReferenceRepository;
    private final HistoriqueActionService historiqueActionService;

    @Transactional
    public ClassementZoneResponse validerReferenceZoneEtCalculerClassement(
            SaveReferenceZoneRequest request
    ) {
        verifierRequest(request);

        Long applicationId = request.getApplicationCandidatureId();
        Long referenceId = request.getReferenceProjetId();
        Long zoneId = request.getZoneId();
        String commentaire = clean(request.getCommentaire());

        ApplicationCandidature application =
                applicationCandidatureRepository.findById(applicationId)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Application candidature introuvable."
                        ));

        ProjetReference reference =
                projetReferenceRepository.findById(referenceId)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Projet de référence introuvable."
                        ));

        Zone zone =
                zoneRepository.findById(zoneId)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Zone introuvable."
                        ));

        verifierReferenceDansApplication(reference, applicationId);

        /*
         * Sauvegarde sur le projet de référence exact.
         * Ces champs seront relus quand la page sera rouverte.
         */
        reference.setZoneElEmarId(zone.getId());
        reference.setZoneElEmarNom(zone.getNomZone());
        reference.setZoneElEmarCommentaire(commentaire);
        reference.setZoneValidee(true);

        projetReferenceRepository.save(reference);

        /*
         * Classement du lot.
         * On met à jour le classement actif existant.
         * S'il n'existe pas encore, on en crée un.
         */
        List<ClassementZone> classements =
                classementZoneRepository.findAllByApplicationCandidature_Id(applicationId);

        ClassementZone classementActif =
                classements.stream()
                        .filter(item -> Boolean.TRUE.equals(item.getActif()))
                        .findFirst()
                        .orElseGet(ClassementZone::new);

        /*
         * Désactiver les anciens doublons actifs éventuels.
         */
        for (ClassementZone ancien : classements) {
            boolean estLeClassementChoisi =
                    classementActif.getId() != null
                            && classementActif.getId().equals(ancien.getId());

            if (!estLeClassementChoisi && Boolean.TRUE.equals(ancien.getActif())) {
                ancien.setActif(false);
                classementZoneRepository.save(ancien);
            }
        }

        classementActif.setApplicationCandidature(application);
        classementActif.setZone(zone);
        classementActif.setCategorie(calculerCategorieDepuisZone(zone));
        classementActif.setCommentaire(commentaire);
        classementActif.setActif(true);

        if (classementActif.getCreatedAt() == null) {
            classementActif.setCreatedAt(LocalDateTime.now());
        }

        ClassementZone saved =
                classementZoneRepository.save(classementActif);

        enregistrerHistorique(
                request,
                application,
                reference,
                zone,
                saved.getCategorie(),
                commentaire
        );

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ClassementZoneResponse> getClassements() {
        return classementZoneRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClassementZoneResponse> getClassementsByApplication(
            Long applicationCandidatureId
    ) {
        return classementZoneRepository
                .findAllByApplicationCandidature_Id(applicationCandidatureId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void verifierRequest(SaveReferenceZoneRequest request) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations de classement sont obligatoires."
            );
        }

        if (request.getApplicationCandidatureId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Application candidature obligatoire."
            );
        }

        if (request.getReferenceProjetId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Projet de référence obligatoire."
            );
        }

        if (request.getZoneId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Zone obligatoire."
            );
        }
    }

    private void verifierReferenceDansApplication(
            ProjetReference reference,
            Long applicationId
    ) {
        if (
                reference.getApplicationCandidature() == null
                        || reference.getApplicationCandidature().getId() == null
                        || !applicationId.equals(
                        reference.getApplicationCandidature().getId()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ce projet de référence ne correspond pas au lot sélectionné."
            );
        }
    }

    private void enregistrerHistorique(
            SaveReferenceZoneRequest request,
            ApplicationCandidature application,
            ProjetReference reference,
            Zone zone,
            String categorie,
            String commentaire
    ) {
        Long candidatureId =
                application.getCandidature() != null
                        ? application.getCandidature().getId()
                        : null;

        String raisonSociale =
                application.getCandidature() != null
                        ? application.getCandidature().getRaisonSociale()
                        : "-";

        String nomLot =
                application.getLot() != null
                        ? application.getLot().getNomLot()
                        : "-";

        historiqueActionService.enregistrerAction(
                request.getUtilisateurId(),
                candidatureId,
                application.getId(),
                "EL_EMAR_CLASSEMENT_ZONE",
                "Classement zone enregistré"
                        + " | Société : " + safe(raisonSociale)
                        + " | Lot : " + safe(nomLot)
                        + " | Référence ID : " + reference.getId()
                        + " | Zone : " + safe(zone.getNomZone())
                        + " | Catégorie : " + safe(categorie)
                        + " | Commentaire : " + safe(commentaire)
        );
    }

    private ClassementZoneResponse toResponse(ClassementZone classement) {
        ClassementZoneResponse response = new ClassementZoneResponse();

        response.setId(classement.getId());

        if (classement.getApplicationCandidature() != null) {
            ApplicationCandidature application =
                    classement.getApplicationCandidature();

            response.setApplicationCandidatureId(application.getId());

            if (application.getCandidature() != null) {
                response.setNomEntreprise(
                        application.getCandidature().getNomEntreprise()
                );
                response.setRaisonSociale(
                        application.getCandidature().getRaisonSociale()
                );
            }
        }

        if (classement.getZone() != null) {
            response.setZoneId(classement.getZone().getId());
            response.setNomZone(classement.getZone().getNomZone());
        }

        response.setCategorie(
                classement.getCategorie() != null
                        ? classement.getCategorie()
                        : "A_CLASSER"
        );

        response.setCommentaire(classement.getCommentaire());
        response.setActif(classement.getActif());
        response.setCreatedAt(classement.getCreatedAt());

        return response;
    }

    /**
     * La catégorie est calculée à partir du nom de la zone,
     * afin de ne pas dépendre des IDs PostgreSQL.
     */
    private String calculerCategorieDepuisZone(Zone zone) {
        if (zone == null || zone.getNomZone() == null) {
            return "A_CLASSER";
        }

        String nom = zone.getNomZone()
                .trim()
                .toUpperCase();

        if (nom.equals("ZONE 1") || nom.equals("A")) {
            return "A";
        }

        if (nom.equals("ZONE 2") || nom.equals("B")) {
            return "B";
        }

        if (nom.equals("ZONE 3") || nom.equals("C")) {
            return "C";
        }

        return "A_CLASSER";
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }

        String cleaned = value.trim();

        return cleaned.isEmpty()
                ? null
                : cleaned;
    }

    private String safe(String value) {
        return value == null || value.trim().isEmpty()
                ? "-"
                : value.trim();
    }
}
