package com.elemar.backendelemar.dto;

import com.elemar.backendelemar.enums.StatutRfp;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppelCandidatureResponse {

    private Long id;

    private String reference;

    private String titre;

    private String description;

    private LocalDate dateDebut;

    private LocalDate dateLimite;

    private StatutRfp statut;

    private Integer seuilAdmission;

    private String objectif;

    private String emailDepot;

    private Long utilisateurId;

    private String utilisateurNom;

    private List<Long> lotIds;

    private List<String> lotNames;

    private List<Long> zoneIds;

    private List<String> zoneNames;

    private Integer candidaturesCount;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}