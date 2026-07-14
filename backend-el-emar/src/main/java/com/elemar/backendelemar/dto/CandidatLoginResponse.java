package com.elemar.backendelemar.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CandidatLoginResponse {

    private Long utilisateurId;

    private Long candidatureId;

    private String nom;

    private String email;

    private String typeUtilisateur;

    private Boolean mustChangePassword;

    private Boolean premiereConnexion;

    private Boolean actif;

    private String statutCompte;
}