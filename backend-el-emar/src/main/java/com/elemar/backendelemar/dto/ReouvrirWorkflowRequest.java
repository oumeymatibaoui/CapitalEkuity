package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReouvrirWorkflowRequest {
    /** Rempli côté backend à partir du JWT. */
    private Long responsableId;

    /** Facultatif : si renseigné, doit appartenir au département de l'étape. */
    private Long utilisateurAffecteId;

    private String motif;
}
