package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.NotificationRequest;
import com.elemar.backendelemar.dto.NotificationResponse;
import com.elemar.backendelemar.entity.ApplicationCandidature;
import com.elemar.backendelemar.entity.Candidature;
import com.elemar.backendelemar.entity.Notification;
import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.repository.ApplicationCandidatureRepository;
import com.elemar.backendelemar.repository.NotificationRepository;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final HistoriqueActionService historiqueActionService;
    private final NotificationRepository notificationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final ApplicationCandidatureRepository applicationCandidatureRepository;
    private final JdbcTemplate jdbcTemplate;
    @Transactional
    public NotificationResponse envoyerCommentaireCritereElEmar(NotificationRequest request) {
        return createNotification(request, "COMMENTAIRE_CRITERE_EL_EMAR");
    }
    private String safe(String value) {
        return value == null || value.trim().isEmpty()
                ? "-"
                : value.trim();
    }
    @Transactional
    public NotificationResponse repondreCandidatCritere(NotificationRequest request) {
        return createNotification(request, "REPONSE_CRITERE_CANDIDAT");
    }

    private NotificationResponse createNotification(
            NotificationRequest request,
            String typeNotification
    ) {
        if (request.getMessage() == null || request.getMessage().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le message ne peut pas être vide"
            );
        }

        if (request.getExpediteurId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Expéditeur obligatoire"
            );
        }

        if (request.getApplicationCandidatureId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Application candidature obligatoire"
            );
        }

        if (request.getReponseCritereId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Critère obligatoire"
            );
        }

        Utilisateur expediteur = utilisateurRepository.findById(request.getExpediteurId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Expéditeur introuvable"
                ));

        ApplicationCandidature applicationCandidature =
                applicationCandidatureRepository.findById(request.getApplicationCandidatureId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Application candidature introuvable"
                        ));

        Candidature candidature = applicationCandidature.getCandidature();

        Long destinataireId = request.getDestinataireId();

        if (destinataireId == null) {
            destinataireId = findDestinataireCandidatId(request.getApplicationCandidatureId());
        }

        Utilisateur destinataire = utilisateurRepository.findById(destinataireId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Destinataire introuvable"
                ));

        Notification notification = Notification.builder()
                .expediteur(expediteur)
                .destinataire(destinataire)
                .candidature(candidature)
                .applicationCandidature(applicationCandidature)

                .reponseCritereId(request.getReponseCritereId())
                .critereEvaluationId(request.getCritereEvaluationId())
                .codeCritere(request.getCodeCritere())
                .libelleCritere(request.getLibelleCritere())

                .message(request.getMessage())
                .typeNotification(typeNotification)
                .lu(false)
                .build();

        Notification saved = notificationRepository.save(notification);

        Long candidatureId = candidature != null
                ? candidature.getId()
                : null;

        if ("COMMENTAIRE_CRITERE_EL_EMAR".equals(typeNotification)
                || "COMMENTAIRE_EL_EMAR".equals(typeNotification)) {

            historiqueActionService.enregistrerAction(
                    expediteur.getId(),
                    candidatureId,
                    applicationCandidature.getId(),
                    "EL_EMAR_ENVOI_NOTIFICATION",
                    "El Emar a envoyé une notification au candidat. Critère: "
                            + safe(request.getLibelleCritere())
                            + " | Message: "
                            + safe(request.getMessage())
            );
        }

        return toResponse(saved);
    }

    private Long resolveDestinataireId(ApplicationCandidature applicationCandidature) {
        if (applicationCandidature == null) {
            return null;
        }

        Candidature candidature = applicationCandidature.getCandidature();

        if (candidature == null) {
            return null;
        }

        Long id;

        id = tryGetLong(candidature, "getCandidatUserId");
        if (id != null) return id;

        id = tryGetLong(candidature, "getUtilisateurId");
        if (id != null) return id;

        id = tryGetLong(candidature, "getCandidatId");
        if (id != null) return id;

        id = tryGetUtilisateurIdFromGetter(candidature, "getUtilisateur");
        if (id != null) return id;

        id = tryGetUtilisateurIdFromGetter(candidature, "getCandidat");
        if (id != null) return id;

        id = tryGetUtilisateurIdFromGetter(candidature, "getUser");
        if (id != null) return id;

        Object affectation = tryInvoke(candidature, "getAffectationAppel");

        if (affectation == null) {
            affectation = tryInvoke(candidature, "getAffectation");
        }

        if (affectation == null) {
            affectation = tryInvoke(candidature, "getAffectationCandidature");
        }

        if (affectation != null) {
            id = tryGetLong(affectation, "getUtilisateurId");
            if (id != null) return id;

            id = tryGetLong(affectation, "getCandidatUserId");
            if (id != null) return id;

            id = tryGetUtilisateurIdFromGetter(affectation, "getUtilisateur");
            if (id != null) return id;

            id = tryGetUtilisateurIdFromGetter(affectation, "getCandidat");
            if (id != null) return id;

            id = tryGetUtilisateurIdFromGetter(affectation, "getUser");
            if (id != null) return id;
        }

        return null;
    }

    private Long tryGetUtilisateurIdFromGetter(Object source, String getterName) {
        Object user = tryInvoke(source, getterName);

        if (user == null) {
            return null;
        }

        return tryGetLong(user, "getId");
    }

    private Long tryGetLong(Object source, String getterName) {
        Object value = tryInvoke(source, getterName);

        if (value == null) {
            return null;
        }

        if (value instanceof Long longValue) {
            return longValue;
        }

        if (value instanceof Integer integerValue) {
            return integerValue.longValue();
        }

        if (value instanceof Number numberValue) {
            return numberValue.longValue();
        }

        try {
            return Long.valueOf(String.valueOf(value));
        } catch (Exception e) {
            return null;
        }
    }

    private Object tryInvoke(Object source, String getterName) {
        if (source == null || getterName == null) {
            return null;
        }

        try {
            Method method = source.getClass().getMethod(getterName);
            return method.invoke(source);
        } catch (Exception e) {
            return null;
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotificationsByDestinataire(Long destinataireId) {
        return notificationRepository
                .findAllByDestinataire_IdOrderByDateCreationDesc(destinataireId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getConversationByApplication(Long applicationCandidatureId) {
        return notificationRepository
                .findAllByApplicationCandidature_IdOrderByDateCreationAsc(applicationCandidatureId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getConversationByCritere(
            Long applicationCandidatureId,
            Long reponseCritereId
    ) {
        return notificationRepository
                .findAllByApplicationCandidature_IdAndReponseCritereIdOrderByDateCreationAsc(
                        applicationCandidatureId,
                        reponseCritereId
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void marquerCommeLu(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Notification introuvable"
                ));

        notification.setLu(true);
        notificationRepository.save(notification);
    }

    private NotificationResponse toResponse(Notification notification) {
        NotificationResponse response = new NotificationResponse();

        response.setId(notification.getId());

        if (notification.getExpediteur() != null) {
            response.setExpediteurId(notification.getExpediteur().getId());
            response.setExpediteurNom(notification.getExpediteur().getNom());
        }

        if (notification.getDestinataire() != null) {
            response.setDestinataireId(notification.getDestinataire().getId());
            response.setDestinataireNom(notification.getDestinataire().getNom());
        }

        if (notification.getCandidature() != null) {
            response.setCandidatureId(notification.getCandidature().getId());
            response.setNomEntreprise(notification.getCandidature().getRaisonSociale());
        }

        if (notification.getApplicationCandidature() != null) {
            response.setApplicationCandidatureId(
                    notification.getApplicationCandidature().getId()
            );
            if (notification.getApplicationCandidature() != null) {
                response.setApplicationCandidatureId(
                        notification.getApplicationCandidature().getId()
                );

                if (notification.getApplicationCandidature().getLot() != null) {
                    response.setLotId(notification.getApplicationCandidature().getLot().getId());
                    response.setLotNom(notification.getApplicationCandidature().getLot().getNomLot());
                }
            }
        }

        response.setReponseCritereId(notification.getReponseCritereId());
        response.setCritereEvaluationId(notification.getCritereEvaluationId());
        response.setCodeCritere(notification.getCodeCritere());
        response.setLibelleCritere(notification.getLibelleCritere());
        response.setTraitee(notification.getTraitee());
        response.setDateTraitement(notification.getDateTraitement());
        response.setMessage(notification.getMessage());
        response.setTypeNotification(notification.getTypeNotification());
        response.setLu(notification.getLu());
        response.setDateCreation(notification.getDateCreation());

        return response;
    }
    @Transactional
    public void marquerCommeTraitee(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Notification introuvable"
                ));

        notification.setTraitee(true);
        notification.setDateTraitement(LocalDateTime.now());
        notification.setLu(true);

        notificationRepository.save(notification);
    }
    private Long findDestinataireCandidatId(Long applicationCandidatureId) {

        String sql = """
            SELECT
                COALESCE(u1.id, u2.id, u3.id) AS utilisateur_id
            FROM application_candidature ac
            JOIN candidature c
                ON c.id = ac.candidature_id

            LEFT JOIN utilisateur u1
                ON u1.id = c.utilisateur_id

            LEFT JOIN utilisateur u2
                ON u2.candidature_id = c.id

            LEFT JOIN utilisateur u3
                ON LOWER(TRIM(u3.email)) = LOWER(TRIM(c.email_principal))

            WHERE ac.id = ?
            LIMIT 1
            """;

        List<Long> ids = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    Object value = rs.getObject("utilisateur_id");

                    if (value == null) {
                        return null;
                    }

                    return ((Number) value).longValue();
                },
                applicationCandidatureId
        );

        if (ids.isEmpty() || ids.get(0) == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Destinataire introuvable : impossible de trouver l'utilisateur candidat depuis l'application candidature."
            );
        }

        return ids.get(0);
    }
}