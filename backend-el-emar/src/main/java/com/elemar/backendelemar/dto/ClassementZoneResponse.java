package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClassementZoneResponse {

    private Long id;

    private Long applicationCandidatureId;

    private Long zoneId;
    private String nomZone;

    private String categorie;
    private String commentaire;

    private Boolean actif;
    private LocalDateTime createdAt;

    private String nomCandidature;
    private String nomSociete;

    // Garde ces champs pour compatibilité avec Angular existant
    private String nomEntreprise;
    private String raisonSociale;

    private Long lotId;
    private String lotNom;

    private String typeProjet;

    private Long typeIntervenantId;
    private String typeIntervenantCode;
    private String typeIntervenantLibelle;

    private Double noteTechnique;
}