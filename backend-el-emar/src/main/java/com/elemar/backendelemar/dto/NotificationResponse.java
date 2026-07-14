package com.elemar.backendelemar.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

    private Long id;

    private Long expediteurId;
    private String expediteurNom;

    private Long destinataireId;
    private String destinataireNom;

    private Long candidatureId;
    private Long applicationCandidatureId;

    private Long lotId;
    private String lotNom;

    private Long reponseCritereId;
    private Long critereEvaluationId;

    private String codeCritere;
    private String libelleCritere;

    private String nomEntreprise;
    private Boolean traitee;
    private LocalDateTime dateTraitement;
    private String message;
    private String typeNotification;
    private Boolean lu;

    private LocalDateTime dateCreation;
}