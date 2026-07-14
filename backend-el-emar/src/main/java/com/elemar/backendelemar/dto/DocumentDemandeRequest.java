package com.elemar.backendelemar.dto;

import com.elemar.backendelemar.enums.PhaseDocument;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class DocumentDemandeRequest {

    private String codeDocument;

    private String nomDocument;

    private PhaseDocument phase;

    private String formatAccepte;

    private Boolean obligatoire;

    private Boolean actif;

    private Integer ordreAffichage;

    private Boolean applicableTousLots;

    private Long lotId;

    private List<String> applicableLots;
    private List<LiaisonChampPieceRequest> champsLies;
}