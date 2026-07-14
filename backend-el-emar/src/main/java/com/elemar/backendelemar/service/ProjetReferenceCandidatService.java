package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.ProjetReferenceRequest;
import com.elemar.backendelemar.dto.ProjetReferenceResponse;
import com.elemar.backendelemar.entity.ApplicationCandidature;
import com.elemar.backendelemar.entity.ProjetReference;
import com.elemar.backendelemar.repository.ProjetReferenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjetReferenceCandidatService {

    private final ProjetReferenceRepository projetReferenceRepository;
    private final CandidatFormulaireSauvegardeService formulaireSauvegardeService;

    @Transactional(readOnly = true)
    public List<ProjetReferenceResponse> getReferences(Long candidatureId, Long lotId) {
        ApplicationCandidature application =
                formulaireSauvegardeService.getOrCreateApplication(candidatureId, lotId);

        return projetReferenceRepository
                .findByApplicationCandidature_Id(application.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<ProjetReferenceResponse> saveReferences(
            Long candidatureId,
            Long lotId,
            List<ProjetReferenceRequest> requests
    ) {
        ApplicationCandidature application =
                formulaireSauvegardeService.getOrCreateApplication(candidatureId, lotId);

        List<ProjetReference> existing =
                projetReferenceRepository.findByApplicationCandidature_Id(application.getId());

        List<Long> incomingIds = requests == null
                ? List.of()
                : requests.stream()
                .map(ProjetReferenceRequest::getId)
                .filter(id -> id != null)
                .toList();

        for (ProjetReference old : existing) {
            if (!incomingIds.contains(old.getId())) {
                projetReferenceRepository.delete(old);
            }
        }

        if (requests == null || requests.isEmpty()) {
            return List.of();
        }

        for (ProjetReferenceRequest request : requests) {
            ProjetReference projet;

            if (request.getId() != null) {
                projet = projetReferenceRepository.findById(request.getId())
                        .orElseGet(ProjetReference::new);
            } else {
                projet = new ProjetReference();
            }

            projet.setApplicationCandidature(application);

            if (application.getLot() != null) {
                projet.setLotConcerne(application.getLot().getNomLot());
            }

            projet.setNomProjet(request.getNomProjet());
            projet.setMaitreOuvrage(request.getMaitreOuvrage());

            projet.setVille(request.getVille());
            projet.setZone(request.getZone());

            projet.setAdresseProjet(request.getAdresseProjet());
            projet.setLatitude(request.getLatitude());
            projet.setLongitude(request.getLongitude());

            projet.setTypeProjet(request.getTypeProjet());
            projet.setSurfaceM2(request.getSurfaceM2());

            /*
             * Correction importante :
             * Dans ton entity ProjetReference, niveauxRPlus est Integer.
             * Dans le front / DTO, il peut arriver comme String.
             */
            projet.setNiveauxRPlus(toInteger(request.getNiveauxRPlus()));

            projet.setNombreSousSols(request.getNombreSousSols());
            projet.setAnneeLivraison(request.getAnneeLivraison());

            projet.setBimOuiNon(request.getBimOuiNon());
            projet.setSeuilOk(request.getSeuilOk());

            projet.setMissionRealisee(request.getMissionRealisee());
            projet.setMontant(request.getMontant());

            projetReferenceRepository.save(projet);
        }

        return getReferences(candidatureId, lotId);
    }

    @Transactional
    public ProjetReferenceResponse uploadReferenceFile(
            Long candidatureId,
            Long lotId,
            Long projetReferenceId,
            String typeFichier,
            MultipartFile file
    ) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Fichier vide"
            );
        }

        String type = typeFichier == null
                ? ""
                : typeFichier.trim().toUpperCase();

        if (!type.equals("P11") && !type.equals("P12")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Type fichier invalide. Utiliser P11 ou P12."
            );
        }

        ApplicationCandidature application =
                formulaireSauvegardeService.getOrCreateApplication(candidatureId, lotId);

        ProjetReference projet = projetReferenceRepository.findById(projetReferenceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Projet de référence introuvable : " + projetReferenceId
                ));

        if (
                projet.getApplicationCandidature() == null
                        || !projet.getApplicationCandidature().getId().equals(application.getId())
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ce projet ne correspond pas à ce lot."
            );
        }

        try {
            Path uploadDir = Path.of(System.getProperty("user.dir"))
                    .resolve("uploads")
                    .resolve("candidatures")
                    .resolve(String.valueOf(candidatureId))
                    .resolve("applications")
                    .resolve(String.valueOf(application.getId()))
                    .resolve("references");

            Files.createDirectories(uploadDir);

            String originalName = file.getOriginalFilename() != null
                    ? file.getOriginalFilename()
                    : type + ".pdf";

            String safeOriginalName =
                    originalName.replaceAll("[^a-zA-Z0-9._-]", "_");

            String safeName =
                    type.toLowerCase()
                            + "_reference_"
                            + projetReferenceId
                            + "_"
                            + UUID.randomUUID()
                            + "_"
                            + safeOriginalName;

            Path filePath = uploadDir.resolve(safeName);

            Files.copy(
                    file.getInputStream(),
                    filePath,
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING
            );

            if (type.equals("P11")) {
                projet.setFichierP11(filePath.toString());
            }

            if (type.equals("P12")) {
                projet.setFichierP12(filePath.toString());
            }

            ProjetReference saved = projetReferenceRepository.save(projet);

            return toResponse(saved);

        } catch (Exception e) {
            log.error(
                    "ERREUR UPLOAD FICHIER REFERENCE | candidatureId={} | lotId={} | projetReferenceId={} | type={} | file={}",
                    candidatureId,
                    lotId,
                    projetReferenceId,
                    type,
                    file.getOriginalFilename(),
                    e
            );

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur upload fichier référence : " + e.getMessage()
            );
        }
    }

    private ProjetReferenceResponse toResponse(ProjetReference projet) {
        ApplicationCandidature application = projet.getApplicationCandidature();

        return ProjetReferenceResponse.builder()
                .id(projet.getId())

                .applicationCandidatureId(
                        application != null
                                ? application.getId()
                                : null
                )
                .lotId(
                        application != null && application.getLot() != null
                                ? application.getLot().getId()
                                : null
                )
                .lotNom(
                        application != null && application.getLot() != null
                                ? application.getLot().getNomLot()
                                : null
                )

                .nomProjet(projet.getNomProjet())
                .maitreOuvrage(projet.getMaitreOuvrage())

                .ville(projet.getVille())
                .zone(projet.getZone())

                .zoneElEmarId(projet.getZoneElEmarId())
                .zoneElEmarNom(projet.getZoneElEmarNom())
                .zoneValidee(projet.getZoneValidee())

                .adresseProjet(projet.getAdresseProjet())
                .latitude(projet.getLatitude())
                .longitude(projet.getLongitude())

                .typeProjet(projet.getTypeProjet())
                .surfaceM2(projet.getSurfaceM2())

                /*
                 * Correction importante :
                 * Entity = Integer
                 * Response DTO = String
                 */
                .niveauxRPlus(toStringValue(projet.getNiveauxRPlus()))

                .nombreSousSols(projet.getNombreSousSols())
                .anneeLivraison(projet.getAnneeLivraison())

                .bimOuiNon(projet.getBimOuiNon())
                .seuilOk(projet.getSeuilOk())

                .missionRealisee(projet.getMissionRealisee())
                .montant(projet.getMontant())

                .fichierP11(projet.getFichierP11())
                .fichierP12(projet.getFichierP12())

                .fichierP11Nom(extractFileName(projet.getFichierP11()))
                .fichierP12Nom(extractFileName(projet.getFichierP12()))

                .build();
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Integer integerValue) {
            return integerValue;
        }

        if (value instanceof Number numberValue) {
            return numberValue.intValue();
        }

        String text = String.valueOf(value).trim();

        if (text.isEmpty()) {
            return null;
        }

        /*
         * Accepte "R+2", "r+5", "2", etc.
         */
        text = text
                .replace("R+", "")
                .replace("r+", "")
                .replace("R", "")
                .replace("r", "")
                .trim();

        try {
            return Integer.valueOf(text);
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le champ niveauxRPlus doit être un nombre valide. Valeur reçue : " + value
            );
        }
    }

    private String toStringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String extractFileName(String path) {
        if (path == null || path.trim().isEmpty()) {
            return null;
        }

        String clean = path.replace("\\", "/");
        int index = clean.lastIndexOf('/');

        if (index >= 0 && index < clean.length() - 1) {
            return clean.substring(index + 1);
        }

        return clean;
    }
}