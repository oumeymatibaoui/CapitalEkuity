package com.elemar.backendelemar.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowModeleEtapeResponse {
    private Long id;
    private String codeEtape;
    private String libelleEtape;
    private Integer ordre;
    private String departementCode;
    private Long utilisateurDefautId;
    private String utilisateurDefautNom;
    private String utilisateurDefautEmail;
    private Boolean actif;
    private LocalDateTime updatedAt;
}
