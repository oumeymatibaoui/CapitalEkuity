package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModifierWorkflowRequest {

    private Long responsableId;

    @Builder.Default
    private List<WorkflowEtapeDefinitionRequest> etapes = new ArrayList<>();
}
