package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveSolvabiliteRequest {

    private String statut;

    private String commentaire;

    private Long evaluateurId;
}