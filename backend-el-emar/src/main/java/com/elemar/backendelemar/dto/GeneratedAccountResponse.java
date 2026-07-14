package com.elemar.backendelemar.dto;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GeneratedAccountResponse {

    private Long utilisateurId;

    private String nomComplet;

    private String email;

    private String motDePasseTemporaire;
}