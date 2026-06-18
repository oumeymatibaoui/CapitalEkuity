package com.elemar.backendelemar.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ZoneResponse {

    private Long id;

    private String nomZone;

    private String adresse;

    private Double latitude;

    private Double longitude;

    private String description;

    private Long utilisateurId;

    private String utilisateurNom;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}