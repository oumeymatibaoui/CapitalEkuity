package com.elemar.backendelemar.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ElEmarCompteResponse {

    private Long id;

    private String nom;
    private String email;
    private String fonction;

    private String typeUtilisateur;
    private Boolean actif;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}