package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowModeleEtapeRequest {

    private String codeEtape;
    private String libelleEtape;
    private Integer ordre;
    private String departementCode;
    private Long utilisateurDefautId;
}
