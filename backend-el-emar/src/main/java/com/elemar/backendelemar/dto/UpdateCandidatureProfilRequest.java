package com.elemar.backendelemar.dto;


import lombok.Data;

@Data
public class UpdateCandidatureProfilRequest {

    private String nomEntreprise;

    private String emailPrincipal;

    private String telephone;

    private String adresse;

    private String ville;
}
