package com.elemar.backendelemar.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ZoneRequest {

    @NotBlank(message = "Le nom de la zone est obligatoire")
    @Size(max = 150, message = "Le nom de la zone ne doit pas dépasser 150 caractères")
    private String nomZone;

    @NotBlank(message = "L'adresse est obligatoire")
    private String adresse;

    @NotNull(message = "La latitude est obligatoire")
    @DecimalMin(value = "-90.0", message = "Latitude invalide")
    @DecimalMax(value = "90.0", message = "Latitude invalide")
    private Double latitude;

    @NotNull(message = "La longitude est obligatoire")
    @DecimalMin(value = "-180.0", message = "Longitude invalide")
    @DecimalMax(value = "180.0", message = "Longitude invalide")
    private Double longitude;

    @Size(max = 1000, message = "La description est trop longue")
    private String description;
}