package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {
    private Long expediteurId;
    private Long destinataireId;

    private Long candidatureId;
    private Long applicationCandidatureId;

    private Long reponseCritereId;
    private Long critereEvaluationId;

    private String codeCritere;
    private String libelleCritere;

    private String message;
}