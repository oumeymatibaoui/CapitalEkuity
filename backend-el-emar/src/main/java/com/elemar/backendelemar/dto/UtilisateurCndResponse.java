package com.elemar.backendelemar.dto;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UtilisateurCndResponse {

    private Long id;

    private String nomComplet;

    private String email;

    private String telephone;

    private String fonction;

    private Boolean actif;

    private Boolean mustChangePassword;
}