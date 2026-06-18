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

    @Transactional(readOnly = true)
    public List<ZoneResponse> getAllZones() {
        return zoneRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ZoneResponse getZoneById(Long id) {
        Zone zone = findZone(id);
        return toResponse(zone);
    }

    @Transactional
    public ZoneResponse createZone(ZoneRequest request, Long utilisateurId) {
        normalizeZoneRequest(request);
        validateZoneBeforeCreate(request);

        Utilisateur utilisateur = null;

        if (utilisateurId != null) {
            utilisateur = utilisateurRepository.findById(utilisateurId).orElse(null);
        }

        Zone zone = Zone.builder()
                .nomZone(request.getNomZone().trim())
                .adresse(request.getAdresse().trim())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .description(request.getDescription())
                .utilisateur(utilisateur)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Zone savedZone = zoneRepository.save(zone);

        return toResponse(savedZone);
    }

    @Transactional
    public ZoneResponse updateZone(Long id, ZoneRequest request) {
        Zone zone = findZone(id);

        normalizeZoneRequest(request);
        validateZoneBeforeUpdate(id, request);

        zone.setNomZone(request.getNomZone().trim());
        zone.setAdresse(request.getAdresse().trim());
        zone.setLatitude(request.getLatitude());
        zone.setLongitude(request.getLongitude());
        zone.setDescription(request.getDescription());
        zone.setUpdatedAt(LocalDateTime.now());

        Zone savedZone = zoneRepository.save(zone);

        return toResponse(savedZone);
    }

    @Transactional
    public void deleteZone(Long id) {
        Zone zone = findZone(id);
        zoneRepository.delete(zone);
    }

    private Zone findZone(Long id) {
        return zoneRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Zone introuvable"
                ));
    }

    private void normalizeZoneRequest(ZoneRequest request) {
        if (request.getLatitude() != null) {
            request.setLatitude(roundToSixDecimals(request.getLatitude()));
        }

        if (request.getLongitude() != null) {
            request.setLongitude(roundToSixDecimals(request.getLongitude()));
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

    private void validateZoneBeforeUpdate(Long id, ZoneRequest request) {
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
    private ZoneResponse toResponse(Zone zone) {
        return ZoneResponse.builder()
                .id(zone.getId())
                .nomZone(zone.getNomZone())
                .adresse(zone.getAdresse())
                .latitude(zone.getLatitude())
                .longitude(zone.getLongitude())
                .description(zone.getDescription())
                .utilisateurId(zone.getUtilisateur() != null ? zone.getUtilisateur().getId() : null)
                .utilisateurNom(zone.getUtilisateur() != null ? zone.getUtilisateur().getNom() : null)
                .createdAt(zone.getCreatedAt())
                .updatedAt(zone.getUpdatedAt())
                .build();
    }
}