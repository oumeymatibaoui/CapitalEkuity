package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.NotificationRequest;
import com.elemar.backendelemar.dto.NotificationResponse;
import com.elemar.backendelemar.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/test")
    public String test() {
        return "NotificationController OK";
    }

    @GetMapping("/destinataire/{destinataireId}")
    public List<NotificationResponse> getNotificationsByDestinataire(
            @PathVariable Long destinataireId
    ) {
        return notificationService.getNotificationsByDestinataire(destinataireId);
    }

    @PostMapping("/applications/{applicationCandidatureId}/criteres/{reponseCritereId}/commentaire-el-emar")
    public NotificationResponse envoyerCommentaireCritereElEmar(
            @PathVariable Long applicationCandidatureId,
            @PathVariable Long reponseCritereId,
            @RequestBody NotificationRequest request
    ) {
        request.setApplicationCandidatureId(applicationCandidatureId);
        request.setReponseCritereId(reponseCritereId);

        return notificationService.envoyerCommentaireCritereElEmar(request);
    }

    @PostMapping("/applications/{applicationCandidatureId}/criteres/{reponseCritereId}/reponse-candidat")
    public NotificationResponse repondreCandidatCritere(
            @PathVariable Long applicationCandidatureId,
            @PathVariable Long reponseCritereId,
            @RequestBody NotificationRequest request
    ) {
        request.setApplicationCandidatureId(applicationCandidatureId);
        request.setReponseCritereId(reponseCritereId);

        return notificationService.repondreCandidatCritere(request);
    }

    @GetMapping("/applications/{applicationCandidatureId}/conversation")
    public List<NotificationResponse> getConversationByApplication(
            @PathVariable Long applicationCandidatureId
    ) {
        return notificationService.getConversationByApplication(applicationCandidatureId);
    }

    @GetMapping("/applications/{applicationCandidatureId}/criteres/{reponseCritereId}/conversation")
    public List<NotificationResponse> getConversationByCritere(
            @PathVariable Long applicationCandidatureId,
            @PathVariable Long reponseCritereId
    ) {
        return notificationService.getConversationByCritere(
                applicationCandidatureId,
                reponseCritereId
        );
    }

    @PutMapping("/{notificationId}/lu")
    public void marquerCommeLu(@PathVariable Long notificationId) {
        notificationService.marquerCommeLu(notificationId);
    }

    @PatchMapping("/{notificationId}/traitee")
    public void marquerCommeTraitee(@PathVariable Long notificationId) {
        notificationService.marquerCommeTraitee(notificationId);
    }
}