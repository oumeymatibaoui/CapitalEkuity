package com.elemar.backendelemar.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowCandidatureResponse {
    private Long candidatureId;
    private String raisonSociale;
    private Boolean workflowInitialise;
    private Boolean workflowTermine;
    private WorkflowEtapeResponse etapeActive;
    private List<WorkflowEtapeResponse> etapes;
}
