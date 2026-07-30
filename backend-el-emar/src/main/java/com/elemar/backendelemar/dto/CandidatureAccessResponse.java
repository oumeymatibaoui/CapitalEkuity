package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidatureAccessResponse {

    private Long candidatureId;
    private String nomEntreprise;

    private Long typeIntervenantId;
    private String typeIntervenantCode;
    private String typeIntervenantLibelle;

    private String statut;
    private Boolean profilComplete;
    private Boolean actif;

    // AJOUTER CETTE PROPRIÉTÉ
    private Boolean accesBloque;

    private List<LotLightResponse> lots;
    private List<UtilisateurCndResponse> utilisateurs;
    private List<GeneratedAccountResponse> comptesGeneres;
}