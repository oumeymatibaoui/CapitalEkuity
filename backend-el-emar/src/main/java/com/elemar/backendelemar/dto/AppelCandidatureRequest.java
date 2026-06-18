package com.elemar.backendelemar.dto;

import com.elemar.backendelemar.enums.StatutRfp;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class AppelCandidatureRequest {

    @NotBlank(message = "Le titre de l'appel est obligatoire")
    @Size(max = 255, message = "Le titre ne doit pas dépasser 255 caractères")
    private String titre;

    @Size(max = 2000, message = "La description est trop longue")
    private String description;

    private LocalDate dateDebut;

    @NotNull(message = "La date limite est obligatoire")
    private LocalDate dateLimite;

    @NotNull(message = "Le statut est obligatoire")
    private StatutRfp statut;

    @NotNull(message = "Le seuil d'admission est obligatoire")
    @Min(value = 0, message = "Le seuil doit être supérieur ou égal à 0")
    @Max(value = 100, message = "Le seuil doit être inférieur ou égal à 100")
    private Integer seuilAdmission;

    @Size(max = 2000, message = "L'objectif est trop long")
    private String objectif;

    @Email(message = "L'email de dépôt est invalide")
    private String emailDepot;

    private Long utilisateurId;

    @NotEmpty(message = "Veuillez sélectionner au moins un lot")
    private List<Long> lotIds;

    @NotEmpty(message = "Veuillez sélectionner au moins une zone")
    private List<Long> zoneIds;
}