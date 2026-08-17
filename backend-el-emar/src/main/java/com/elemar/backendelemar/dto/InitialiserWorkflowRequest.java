package com.elemar.backendelemar.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InitialiserWorkflowRequest {

    private Long createurId;

    @Builder.Default
    private List<WorkflowEtapeDefinitionRequest> etapes =
            new ArrayList<>();
}