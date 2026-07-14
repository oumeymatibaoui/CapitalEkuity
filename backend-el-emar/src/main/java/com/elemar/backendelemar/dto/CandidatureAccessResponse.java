package com.elemar.backendelemar.dto;


import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CandidatureAccessResponse {

    private Long candidatureId;

    private String nomEntreprise;

    private Long typeIntervenantId;

    private String typeIntervenantCode;

    private String typeIntervenantLibelle;

    private String statut;

    private Boolean profilComplete;

    private Boolean actif;

    private List<LotLightResponse> lots;

    private List<UtilisateurCndResponse> utilisateurs;

    private List<GeneratedAccountResponse> comptesGeneres;
}