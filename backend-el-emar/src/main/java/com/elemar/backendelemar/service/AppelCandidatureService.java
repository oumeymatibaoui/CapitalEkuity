package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.AppelCandidatureRequest;
import com.elemar.backendelemar.dto.AppelCandidatureResponse;
import com.elemar.backendelemar.entity.*;
import com.elemar.backendelemar.enums.StatutRfp;
import com.elemar.backendelemar.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

//@Service
//@RequiredArgsConstructor
public class AppelCandidatureService {
//
//    private final AppelCandidatureRepository appelRepository;
//    private final AppelLotRepository appelLotRepository;
//    private final AppelZoneRepository appelZoneRepository;
//    private final LotRepository lotRepository;
//    private final ZoneRepository zoneRepository;
//    private final UtilisateurRepository utilisateurRepository;
//
//    @Transactional(readOnly = true)
//    public List<AppelCandidatureResponse> getAllAppels() {
//        return appelRepository.findAll()
//                .stream()
//                .map(this::toResponse)
//                .toList();
//    }
//
//    @Transactional(readOnly = true)
//    public AppelCandidatureResponse getAppelById(Long id) {
//        return toResponse(findAppel(id));
//    }
//
//    @Transactional
//    public AppelCandidatureResponse createAppel(AppelCandidatureRequest request) {
//        validateAppelBeforeCreate(request);
//        Utilisateur utilisateur = null;
//
//        if (request.getUtilisateurId() != null) {
//            utilisateur = utilisateurRepository.findById(request.getUtilisateurId()).orElse(null);
//        }
//
//        AppelCandidature appel = AppelCandidature.builder()
//                .titre(request.getTitre())
//                .description(request.getDescription())
//                .dateDebut(request.getDateDebut())
//                .dateLimite(request.getDateLimite())
//                .statut(request.getStatut() != null ? request.getStatut() : StatutRfp.BROUILLON)
//                .seuilAdmission(request.getSeuilAdmission() != null ? request.getSeuilAdmission() : 60)
//                .objectif(request.getObjectif())
//                .emailDepot(request.getEmailDepot())
//                .utilisateur(utilisateur)
//                .createdAt(LocalDateTime.now())
//                .updatedAt(LocalDateTime.now())
//                .build();
//
//        AppelCandidature savedAppel = appelRepository.save(appel);
//
//        saveAppelLots(savedAppel, request.getLotIds());
//        saveAppelZones(savedAppel, request.getZoneIds());
//
//        return toResponse(savedAppel);
//    }
//
//    @Transactional
//    public AppelCandidatureResponse updateAppel(Long id, AppelCandidatureRequest request) {
//        validateAppelBeforeUpdate(id, request);
//        AppelCandidature appel = findAppel(id);
//
//        appel.setTitre(request.getTitre());
//        appel.setDescription(request.getDescription());
//        appel.setDateDebut(request.getDateDebut());
//        appel.setDateLimite(request.getDateLimite());
//        appel.setStatut(request.getStatut() != null ? request.getStatut() : appel.getStatut());
//        appel.setSeuilAdmission(request.getSeuilAdmission());
//        appel.setObjectif(request.getObjectif());
//        appel.setEmailDepot(request.getEmailDepot());
//        appel.setUpdatedAt(LocalDateTime.now());
//
//        AppelCandidature savedAppel = appelRepository.save(appel);
//
//        appelLotRepository.deleteByAppelId(id);
//        appelZoneRepository.deleteByAppelId(id);
//
//        appelLotRepository.flush();
//        appelZoneRepository.flush();
//
//        saveAppelLots(savedAppel, request.getLotIds());
//        saveAppelZones(savedAppel, request.getZoneIds());
//
//        return toResponse(savedAppel);
//    }
//
//    @Transactional
//    public void deleteAppel(Long id) {
//        AppelCandidature appel = findAppel(id);
//        appelRepository.delete(appel);
//    }
//
//    private AppelCandidature findAppel(Long id) {
//        return appelRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("Appel à candidature introuvable"));
//    }
//
//    private void saveAppelLots(AppelCandidature appel, List<Long> lotIds) {
//
//        if (lotIds == null || lotIds.isEmpty()) {
//            return;
//        }
//
//        List<Lot> lots = lotRepository.findAllById(lotIds);
//
//        for (Lot lot : lots) {
//            AppelLot appelLot = new AppelLot();
//
//            appelLot.setAppel(appel);
//            appelLot.setLot(lot);
//            appelLot.setTitreLot(lot.getNomLot());
//            appelLot.setDescriptionLot(lot.getDescription());
//            appelLot.setActif(true);
//
//            appelLotRepository.save(appelLot);
//        }
//    }
//
//    private void saveAppelZones(AppelCandidature appel, List<Long> zoneIds) {
//        if (zoneIds == null || zoneIds.isEmpty()) {
//            return;
//        }
//
//        List<Zone> zones = zoneRepository.findAllById(zoneIds);
//
//        for (Zone zone : zones) {
//            AppelZone appelZone = new AppelZone();
//
//            appelZone.setAppel(appel);
//            appelZone.setZone(zone);
//
//            appelZoneRepository.save(appelZone);
//        }
//    }
//
//    private AppelCandidatureResponse toResponse(AppelCandidature appel) {
//        List<AppelLot> appelLots = appelLotRepository.findByAppel_Id(appel.getId());
//        List<AppelZone> appelZones = appelZoneRepository.findByAppel_Id(appel.getId());
//
//        List<Long> lotIds = appelLots.stream()
//                .map(al -> al.getLot().getId())
//                .toList();
//
//        List<String> lotNames = appelLots.stream()
//                .map(al -> al.getLot().getNomLot())
//                .toList();
//
//        List<Long> zoneIds = appelZones.stream()
//                .map(az -> az.getZone().getId())
//                .toList();
//
//        List<String> zoneNames = appelZones.stream()
//                .map(az -> az.getZone().getNomZone())
//                .toList();
//
//        Long utilisateurId = appel.getUtilisateurIdValue();
//
//        String utilisateurNom = null;
//
//        if (utilisateurId != null) {
//            utilisateurNom = utilisateurRepository.findById(utilisateurId)
//                    .map(Utilisateur::getNom)
//                    .orElse(null);
//        }
//
//        return AppelCandidatureResponse.builder()
//                .id(appel.getId())
//                .reference(buildReference(appel))
//                .titre(appel.getTitre())
//                .description(appel.getDescription())
//                .dateDebut(appel.getDateDebut())
//                .dateLimite(appel.getDateLimite())
//                .statut(appel.getStatut())
//                .seuilAdmission(appel.getSeuilAdmission())
//                .objectif(appel.getObjectif())
//                .emailDepot(appel.getEmailDepot())
//                .utilisateurId(utilisateurId)
//                .utilisateurNom(utilisateurNom)
//                .lotIds(lotIds)
//                .lotNames(lotNames)
//                .zoneIds(zoneIds)
//                .zoneNames(zoneNames)
//                .candidaturesCount(0)
//                .createdAt(appel.getCreatedAt())
//                .updatedAt(appel.getUpdatedAt())
//                .build();
//    }
//
//    private String buildReference(AppelCandidature appel) {
//        int year = appel.getCreatedAt() != null
//                ? appel.getCreatedAt().getYear()
//                : LocalDate.now().getYear();
//
//        return "AO-" + year + "-" + String.format("%03d", appel.getId());
//    }
//    private void validateAppelBeforeCreate(AppelCandidatureRequest request) {
//        if (appelRepository.existsByTitreIgnoreCase(request.getTitre().trim())) {
//            throw new ResponseStatusException(
//                    HttpStatus.CONFLICT,
//                    "Ce titre d'appel existe déjà"
//            );
//        }
//    }
//
//    private void validateAppelBeforeUpdate(Long id, AppelCandidatureRequest request) {
//        if (appelRepository.existsByTitreIgnoreCaseAndIdNot(request.getTitre().trim(), id)) {
//            throw new ResponseStatusException(
//                    HttpStatus.CONFLICT,
//                    "Ce titre d'appel existe déjà"
//            );
//        }
//    }
}