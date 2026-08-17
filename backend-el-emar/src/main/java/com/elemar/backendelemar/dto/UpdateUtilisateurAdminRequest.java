package com.elemar.backendelemar.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUtilisateurAdminRequest {

    private String nom;

    private String email;

    private String fonction;

    private Long roleId;

    private Boolean actif;

    private Long modificateurId;
}