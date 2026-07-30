package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveDocumentsStatutRequest {

    private String rneStatut;

    private String cnssStatut;

    private Long evaluateurId;
}