package com.elemar.backendelemar.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ElEmarCandidatureListItemResponse {

    private Long candidatureId;

    private String raisonSociale;

    private String emailPrincipal;

    private String telephone;

    private String ville;

    private List<String> lots;

    private LocalDateTime dateSoumission;

    private BigDecimal noteGlobale;

    private String statut;

    private Long typeIntervenantId;

    private String typeIntervenantCode;

    private String typeIntervenantLibelle;

    private List<LotNoteResponse> lotsNotes;
}