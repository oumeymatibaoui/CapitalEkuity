package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveCritereEvaluationRequest {

    private String statut;

    private String commentaireEvaluateur;

    private Long evaluateurId;
}