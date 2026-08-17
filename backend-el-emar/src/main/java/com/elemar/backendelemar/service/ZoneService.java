package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.ZoneRequest;
import com.elemar.backendelemar.dto.ZoneResponse;
import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.entity.Zone;
import com.elemar.backendelemar.repository.UtilisateurRepository;
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
public class ZoneService {

    private final ZoneRepository zoneRepository;
    private final UtilisateurRepository utilisateurRepository;

    // =====================================================
    // LECTURE
    // =====================================================

    @Transactional(readOnly = true)
    public List<ZoneResponse> getAllZones() {
        return zoneRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ZoneResponse getZoneById(Long id) {
        return toResponse(findZone(id));
    }

    // =====================================================
    // CRÉATION
    // =====================================================

    @Transactional
    public ZoneResponse createZone(
            ZoneRequest request,
            Long utilisateurId
    ) {
        validateRequest(request);
        normalizeZoneRequest(request);
        validateZoneBeforeCreate(request);

        String nomZone = request.getNomZone().trim();
        String adresse = request.getAdresse().trim();
        String requestedDescription = clean(request.getDescription());

        /*
         * Une zone logique peut contenir plusieurs lieux.
         * Exemple :
         * Zone 1 -> Lac / Gammarth / Ariana.
         *
         * La description appartient au GROUPE, pas au lieu.
         * Si le groupe existe déjà, le nouveau lieu hérite donc
         * automatiquement de sa description.
         */
        List<Zone> existingGroup = findGroupByName(nomZone);

        String groupDescription =
                findFirstGroupDescription(existingGroup);

        if (groupDescription == null && requestedDescription != null) {
            groupDescription = requestedDescription;

            /*
             * Anciennes données éventuellement sans description :
             * on synchronise le groupe existant dès qu'une description
             * est fournie lors de l'ajout d'un nouveau lieu.
             */
            LocalDateTime now = LocalDateTime.now();

            for (Zone existingZone : existingGroup) {
                existingZone.setDescription(groupDescription);
                existingZone.setUpdatedAt(now);
            }

            if (!existingGroup.isEmpty()) {
                zoneRepository.saveAll(existingGroup);
            }
        }

        Utilisateur utilisateur = null;

        if (utilisateurId != null) {
            utilisateur = utilisateurRepository
                    .findById(utilisateurId)
                    .orElse(null);
        }

        LocalDateTime now = LocalDateTime.now();

        Zone zone = Zone.builder()
                .nomZone(nomZone)
                .adresse(adresse)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .description(groupDescription)
                .utilisateur(utilisateur)
                .createdAt(now)
                .updatedAt(now)
                .build();

        Zone savedZone = zoneRepository.save(zone);

        return toResponse(savedZone);
    }

    // =====================================================
    // MODIFICATION
    // =====================================================

    @Transactional
    public ZoneResponse updateZone(
            Long id,
            ZoneRequest request
    ) {
        Zone selectedZone = findZone(id);

        validateRequest(request);
        normalizeZoneRequest(request);
        validateZoneBeforeUpdate(id, request);

        String oldNomZone = clean(selectedZone.getNomZone());
        String newNomZone = request.getNomZone().trim();
        String newDescription = clean(request.getDescription());

        /*
         * On récupère le groupe AVANT de changer le nom.
         * Toutes les lignes portant l'ancien nom représentent les lieux
         * du même groupe logique.
         */
        List<Zone> groupZones = findGroupByName(oldNomZone);

        if (groupZones.isEmpty()) {
            groupZones = List.of(selectedZone);
        }

        final List<Zone> currentGroupZones = groupZones;

        /*
         * Protection contre une fusion involontaire :
         * Zone 1 -> Zone 2 alors que Zone 2 existe déjà.
         */
        if (!sameZoneName(oldNomZone, newNomZone)) {
            boolean targetGroupAlreadyExists = zoneRepository.findAll()
                    .stream()
                    .anyMatch(zone ->
                            zone.getId() != null
                                    && !belongsToGroup(zone, currentGroupZones)
                                    && sameZoneName(zone.getNomZone(), newNomZone)
                    );

            if (targetGroupAlreadyExists) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Une autre zone porte déjà le nom « "
                                + newNomZone
                                + " »."
                );
            }
        }

        LocalDateTime now = LocalDateTime.now();
        Zone zoneToReturn = selectedZone;

        for (Zone zone : groupZones) {
            /*
             * NOM + DESCRIPTION = données communes au groupe.
             * Elles sont donc synchronisées sur tous les lieux.
             */
            zone.setNomZone(newNomZone);
            zone.setDescription(newDescription);
            zone.setUpdatedAt(now);

            /*
             * Adresse et coordonnées = données propres au lieu.
             * Elles changent uniquement pour le lieu ouvert en édition.
             */
            if (zone.getId() != null && zone.getId().equals(id)) {
                zone.setAdresse(request.getAdresse().trim());
                zone.setLatitude(request.getLatitude());
                zone.setLongitude(request.getLongitude());
                zoneToReturn = zone;
            }
        }

        zoneRepository.saveAll(groupZones);

        return toResponse(zoneToReturn);
    }

    // =====================================================
    // SUPPRESSION
    // =====================================================

    @Transactional
    public void deleteZone(Long id) {
        Zone zone = findZone(id);
        zoneRepository.delete(zone);
    }

    // =====================================================
    // RECHERCHE
    // =====================================================

    private Zone findZone(Long id) {
        if (id == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant de zone obligatoire"
            );
        }

        return zoneRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Zone introuvable"
                ));
    }

    /**
     * Retourne toutes les lignes appartenant au même groupe logique.
     * La comparaison ignore la casse et les espaces extérieurs.
     */
    private List<Zone> findGroupByName(String nomZone) {
        if (clean(nomZone) == null) {
            return List.of();
        }

        return zoneRepository.findAll()
                .stream()
                .filter(zone -> sameZoneName(zone.getNomZone(), nomZone))
                .toList();
    }

    private boolean belongsToGroup(
            Zone zone,
            List<Zone> groupZones
    ) {
        if (zone == null || zone.getId() == null) {
            return false;
        }

        return groupZones.stream()
                .anyMatch(groupZone ->
                        groupZone.getId() != null
                                && groupZone.getId().equals(zone.getId())
                );
    }

    private String findFirstGroupDescription(List<Zone> groupZones) {
        return groupZones.stream()
                .map(Zone::getDescription)
                .map(this::clean)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
    }

    // =====================================================
    // NORMALISATION / VALIDATION
    // =====================================================

    private void validateRequest(ZoneRequest request) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations de la zone sont obligatoires"
            );
        }

        if (clean(request.getNomZone()) == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nom de la zone est obligatoire"
            );
        }

        if (clean(request.getAdresse()) == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "L'adresse du lieu est obligatoire"
            );
        }

        if (request.getLatitude() == null || request.getLongitude() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La localisation du lieu est obligatoire"
            );
        }

        if (request.getLatitude() < -90 || request.getLatitude() > 90) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Latitude invalide"
            );
        }

        if (request.getLongitude() < -180 || request.getLongitude() > 180) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Longitude invalide"
            );
        }
    }

    private void normalizeZoneRequest(ZoneRequest request) {
        if (request.getLatitude() != null) {
            request.setLatitude(
                    roundToSixDecimals(request.getLatitude())
            );
        }

        if (request.getLongitude() != null) {
            request.setLongitude(
                    roundToSixDecimals(request.getLongitude())
            );
        }
    }

    private Double roundToSixDecimals(Double value) {
        return Math.round(value * 1_000_000.0) / 1_000_000.0;
    }

    private void validateZoneBeforeCreate(ZoneRequest request) {
        if (zoneRepository.existsByLatitudeAndLongitude(
                request.getLatitude(),
                request.getLongitude()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cette localisation existe déjà"
            );
        }
    }

    private void validateZoneBeforeUpdate(
            Long id,
            ZoneRequest request
    ) {
        if (zoneRepository.existsByLatitudeAndLongitudeAndIdNot(
                request.getLatitude(),
                request.getLongitude(),
                id
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cette localisation existe déjà"
            );
        }
    }

    private boolean sameZoneName(
            String first,
            String second
    ) {
        String firstClean = clean(first);
        String secondClean = clean(second);

        return firstClean != null
                && secondClean != null
                && firstClean.equalsIgnoreCase(secondClean);
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

    // =====================================================
    // RESPONSE
    // =====================================================

    private ZoneResponse toResponse(Zone zone) {
        return ZoneResponse.builder()
                .id(zone.getId())
                .nomZone(zone.getNomZone())
                .adresse(zone.getAdresse())
                .latitude(zone.getLatitude())
                .longitude(zone.getLongitude())
                .description(zone.getDescription())
                .utilisateurId(
                        zone.getUtilisateur() != null
                                ? zone.getUtilisateur().getId()
                                : null
                )
                .utilisateurNom(
                        zone.getUtilisateur() != null
                                ? zone.getUtilisateur().getNom()
                                : null
                )
                .createdAt(zone.getCreatedAt())
                .updatedAt(zone.getUpdatedAt())
                .build();
    }
}