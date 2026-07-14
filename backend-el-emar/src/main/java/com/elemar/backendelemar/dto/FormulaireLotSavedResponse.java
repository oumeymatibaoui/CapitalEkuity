package com.elemar.backendelemar.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormulaireLotSavedResponse {

    private Long candidatureId;

    private Long applicationCandidatureId;

    private Long lotId;

    private List<ReponseCritereSavedResponse> reponses;

    private List<PieceCritereDeposeeResponse> pieces;
}