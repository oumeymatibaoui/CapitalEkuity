package com.elemar.backendelemar.dto;

import com.elemar.backendelemar.enums.PhaseDocument;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class DocumentDemandeResponse {

    private Long id;

    private String codeDocument;

    private String nomDocument;

    private PhaseDocument phase;

    private String formatAccepte;

    private Boolean obligatoire;

    private String applicableA;

    private Boolean actif;

    private Integer ordreAffichage;

    private Boolean applicableTousLots;

    private Long lotId;

    private String nomLot;

    private List<String> applicableLots;
    private List<LiaisonChampPieceResponse> champsLies;
}