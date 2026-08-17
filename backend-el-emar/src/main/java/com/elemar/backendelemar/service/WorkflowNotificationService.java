package com.elemar.backendelemar.service;

import com.elemar.backendelemar.entity.Candidature;
import com.elemar.backendelemar.entity.Notification;
import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.repository.CandidatureRepository;
import com.elemar.backendelemar.repository.NotificationRepository;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WorkflowNotificationService {

    private final NotificationRepository notificationRepository;

    private final UtilisateurRepository utilisateurRepository;

    private final CandidatureRepository candidatureRepository;

    @Transactional
    public void notifierEtapeDisponible(
            Long candidatureId,
            Long expediteurId,
            Long destinataireId,
            String libelleEtape
    ) {
        Candidature candidature =
                candidatureRepository.findById(candidatureId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Candidature introuvable."
                                )
                        );

        Utilisateur destinataire =
                utilisateurRepository.findById(destinataireId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Destinataire introuvable."
                                )
                        );

        Utilisateur expediteur = null;

        if (expediteurId != null) {
            expediteur =
                    utilisateurRepository
                            .findById(expediteurId)
                            .orElse(null);
        }

        String raisonSociale =
                candidature.getRaisonSociale() != null
                        ? candidature.getRaisonSociale()
                        : candidature.getNomEntreprise();

        Notification notification =
                Notification.builder()
                        .expediteur(expediteur)
                        .destinataire(destinataire)
                        .candidature(candidature)
                        .applicationCandidature(null)
                        .typeNotification(
                                "WORKFLOW_ETAPE_DISPONIBLE"
                        )
                        .message(
                                "Une nouvelle étape est disponible : "
                                        + libelleEtape
                                        + " pour le dossier "
                                        + safe(raisonSociale)
                                        + "."
                        )
                        .lu(false)
                        .traitee(false)
                        .build();

        notificationRepository.save(notification);
    }

    @Transactional
    public void notifierReouverture(
            Long candidatureId,
            Long responsableId,
            Long destinataireId,
            String libelleEtape,
            String motif
    ) {
        Candidature candidature =
                candidatureRepository.findById(candidatureId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Candidature introuvable."
                                )
                        );

        Utilisateur destinataire =
                utilisateurRepository.findById(destinataireId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Destinataire introuvable."
                                )
                        );

        Utilisateur responsable =
                responsableId == null
                        ? null
                        : utilisateurRepository
                        .findById(responsableId)
                        .orElse(null);

        Notification notification =
                Notification.builder()
                        .expediteur(responsable)
                        .destinataire(destinataire)
                        .candidature(candidature)
                        .applicationCandidature(null)
                        .typeNotification(
                                "WORKFLOW_ETAPE_REOUVERTE"
                        )
                        .message(
                                "L’étape « "
                                        + libelleEtape
                                        + " » a été réouverte."
                                        + " Motif : "
                                        + safe(motif)
                        )
                        .lu(false)
                        .traitee(false)
                        .build();

        notificationRepository.save(notification);
    }

    private String safe(String value) {
        return value == null || value.isBlank()
                ? "-"
                : value.trim();
    }
}