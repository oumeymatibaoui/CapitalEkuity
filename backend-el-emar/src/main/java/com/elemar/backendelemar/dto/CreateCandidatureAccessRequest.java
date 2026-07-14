package com.elemar.backendelemar.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CreateCandidatureAccessRequest {

    private String nomEntreprise;

    private Long typeIntervenantId;

    private List<Long> lotIds = new ArrayList<>();

    @JsonAlias({"utilisateurs", "users"})
    private List<CreateCndUserRequest> users = new ArrayList<>();
}