package com.elemar.backendelemar.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowModeleUpdateRequest {
    private List<WorkflowModeleEtapeRequest> etapes;
}
