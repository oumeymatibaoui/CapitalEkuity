package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowEtapeDefinitionRequest {

    private String codeEtape;

    private String libelleEtape;

    private Long utilisateurId;
}