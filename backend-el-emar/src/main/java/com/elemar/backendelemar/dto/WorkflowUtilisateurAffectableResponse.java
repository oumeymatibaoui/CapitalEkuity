package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowUtilisateurAffectableResponse {

    private Long id;
    private String nom;
    private String email;
    private String typeUtilisateur;
}
