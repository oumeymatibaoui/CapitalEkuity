package com.elemar.backendelemar.dto;

import com.elemar.backendelemar.enums.ModeleReponse;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChampAppreciationResponse {

    private Long id;

    private Long lotId;
    private String lotNom;

    private String section;
    private String nomChamp;
    private String labelChamp;
    private String descriptionChamp;

    private ModeleReponse modeleReponse;

    private String typeChamp;
    private String conditionProcedure;
    private String codePxx;
    private String options;
    private Boolean obligatoire;
    private Integer ordreAffichage;
    private Boolean actif;
}