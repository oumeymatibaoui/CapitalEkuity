package com.elemar.backendelemar.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UtilisateurAdminResponse {

    private Long id;
    private String nom;
    private String email;
    private String fonction;

    /*
     * Ancienne valeur conservée.
     */
    private String typeUtilisateur;

    /*
     * Nouveau rôle dynamique.
     */
    private Long roleId;
    private String roleCode;
    private String roleNom;

    private Boolean actif;
    private Boolean premiereConnexion;
    private Boolean mustChangePassword;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}