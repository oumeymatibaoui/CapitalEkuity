package com.elemar.backendelemar.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class CreateCndUserRequest {

    @JsonAlias({"nom", "fullName", "nomUtilisateur"})
    private String nomComplet;

    @JsonAlias({"emailUtilisateur", "mail"})
    private String email;

    private String telephone;

    private String fonction;
}