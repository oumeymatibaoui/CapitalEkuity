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
public class SaveReferenceZoneRequest {

    /**
     * Identifiant du projet de référence à modifier.
     */
    private Long referenceProjetId;

    /**
     * Identifiant de l'application candidature / lot.
     */
    private Long applicationCandidatureId;

    /**
     * Identifiant de la zone choisie par El Emar.
     */
    private Long zoneId;

    /**
     * Commentaire interne El Emar.
     */
    private String commentaire;

    /**
     * Identifiant de l'utilisateur El Emar.
     * Peut être null si le frontend ne l'envoie pas encore.
     */
    private Long utilisateurId;
}
