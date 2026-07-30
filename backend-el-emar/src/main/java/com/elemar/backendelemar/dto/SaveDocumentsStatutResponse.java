package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveDocumentsStatutResponse {

    private Long candidatureId;

    private String rneStatut;

    private String cnssStatut;

    private Boolean dossierRecevable;

    private String motifNonRecevable;
}