package com.elemar.backendelemar.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoriqueActionResponse {

    private Long id;

    private Long utilisateurId;
    private String utilisateurNom;
    private String utilisateurEmail;
    private String typeUtilisateur;

    private Long candidatureId;
    private String raisonSociale;
    private String emailCandidature;

    private Long applicationCandidatureId;
    private Long lotId;
    private String lotNom;

    private String action;
    private String description;
    private LocalDateTime dateAction;
}