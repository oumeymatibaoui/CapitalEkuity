package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveSolvabiliteResponse {

    private Long candidatureId;

    private String statut;

    private String commentaire;

    private Long evaluateurId;

    private LocalDateTime dateValidation;
}