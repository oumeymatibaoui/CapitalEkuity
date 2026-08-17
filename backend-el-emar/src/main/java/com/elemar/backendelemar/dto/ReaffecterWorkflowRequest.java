package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReaffecterWorkflowRequest {
    /** Rempli côté backend à partir du JWT. */
    private Long responsableId;

    private Long nouvelUtilisateurId;
    private String motif;
}
