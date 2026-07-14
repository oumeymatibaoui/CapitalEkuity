package com.elemar.backendelemar.dto;

import com.elemar.backendelemar.enums.ModeleReponse;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ChampAppreciationRequest {

    @NotNull(message = "Le lot est obligatoire")
    private Long lotId;

    @NotBlank(message = "La section est obligatoire")
    @Size(max = 150, message = "La section est trop longue")
    private String section;

    @NotBlank(message = "Le nom du champ est obligatoire")
    @Size(max = 150, message = "Le nom du champ est trop long")
    private String nomChamp;

    @NotBlank(message = "Le libellé du champ est obligatoire")
    @Size(max = 255, message = "Le libellé du champ est trop long")
    private String labelChamp;

    @NotBlank(message = "Le texte d’aide est obligatoire")
    private String descriptionChamp;

    @NotNull(message = "Le modèle de réponse est obligatoire")
    private ModeleReponse modeleReponse;

    @NotBlank(message = "Le type du champ est obligatoire")
    private String typeChamp;

    @NotBlank(message = "La condition d’application est obligatoire")
    private String conditionProcedure;

    @NotBlank(message = "Le code Pxx est obligatoire")
    @Size(max = 50, message = "Le code Pxx est trop long")
    private String codePxx;

    private String options;

    @NotNull(message = "Le champ obligatoire est requis")
    private Boolean obligatoire;

    @NotNull(message = "L’ordre d’affichage est obligatoire")
    @Min(value = 1, message = "L’ordre doit être supérieur ou égal à 1")
    private Integer ordreAffichage;

    @NotNull(message = "Le statut actif est requis")
    private Boolean actif;
    private List<LiaisonChampPieceRequest> piecesLiees;
}