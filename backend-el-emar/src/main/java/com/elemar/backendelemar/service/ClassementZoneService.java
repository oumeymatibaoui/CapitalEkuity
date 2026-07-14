package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.ClassementZoneResponse;
import com.elemar.backendelemar.dto.SaveReferenceZoneRequest;
import com.elemar.backendelemar.entity.ApplicationCandidature;
import com.elemar.backendelemar.entity.ClassementZone;
import com.elemar.backendelemar.entity.Zone;
import com.elemar.backendelemar.repository.ApplicationCandidatureRepository;
import com.elemar.backendelemar.repository.ClassementZoneRepository;
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
    private final HistoriqueActionService historiqueActionService;

    @Transactional
    public ClassementZoneResponse validerReferenceZoneEtCalculerClassement(
            SaveReferenceZoneRequest request
    ) {
        if (request.getApplicationCandidatureId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Application candidature obligatoire"
            );
        }

        if (request.getZoneId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Zone obligatoire"
            );
        }

        ApplicationCandidature applicationCandidature =
                applicationCandidatureRepository.findById(request.getApplicationCandidatureId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Application candidature introuvable"
                        ));

        Zone zone = zoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Zone introuvable"
                ));

        ClassementZone classement = new ClassementZone();

        classement.setApplicationCandidature(applicationCandidature);
        classement.setZone(zone);
        classement.setCommentaire(clean(request.getCommentaire()));
        classement.setActif(true);
        classement.setCreatedAt(LocalDateTime.now());

        String categorie = calculerCategorieDepuisZone(zone.getId());
        classement.setCategorie(categorie);

        ClassementZone saved = classementZoneRepository.save(classement);

        Long candidatureId = applicationCandidature.getCandidature() != null
                ? applicationCandidature.getCandidature().getId()
                : null;

        String raisonSociale = applicationCandidature.getCandidature() != null
                ? applicationCandidature.getCandidature().getRaisonSociale()
                : "-";

        String nomLot = applicationCandidature.getLot() != null
                ? applicationCandidature.getLot().getNomLot()
                : "-";

        historiqueActionService.enregistrerAction(
                request.getUtilisateurId(),
                candidatureId,
                applicationCandidature.getId(),
                "EL_EMAR_CLASSEMENT_ZONE",
                "El Emar a validé le classement zone. Candidature: "
                        + safe(raisonSociale)
                        + " | Lot: "
                        + safe(nomLot)
                        + " | Zone: "
                        + safe(zone.getNomZone())
                        + " | Catégorie: "
                        + safe(categorie)
                        + " | Commentaire: "
                        + safe(request.getCommentaire())
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
    public List<ClassementZoneResponse> getClassementsByApplication(Long applicationCandidatureId) {
        return classementZoneRepository
                .findAllByApplicationCandidature_Id(applicationCandidatureId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private ClassementZoneResponse toResponse(ClassementZone classement) {
        ClassementZoneResponse response = new ClassementZoneResponse();

        response.setId(classement.getId());

        if (classement.getApplicationCandidature() != null) {
            ApplicationCandidature application = classement.getApplicationCandidature();

            response.setApplicationCandidatureId(application.getId());

            if (application.getCandidature() != null) {
                response.setNomEntreprise(application.getCandidature().getNomEntreprise());
                response.setRaisonSociale(application.getCandidature().getRaisonSociale());
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

    private String calculerCategorieDepuisZone(Long zoneId) {
        if (zoneId == null) {
            return "A_CLASSER";
        }

        if (Long.valueOf(1L).equals(zoneId)) {
            return "A";
        }

        if (Long.valueOf(2L).equals(zoneId)) {
            return "B";
        }

        if (Long.valueOf(3L).equals(zoneId)) {
            return "C";
        }

        return "A_CLASSER";
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }

    private String safe(String value) {
        return value == null || value.trim().isEmpty()
                ? "-"
                : value.trim();
    }
}