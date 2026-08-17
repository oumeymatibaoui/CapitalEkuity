package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransmettreWorkflowRequest {
    /** Rempli côté backend à partir du JWT. */
    private Long utilisateurId;

    private String commentaire;
}
