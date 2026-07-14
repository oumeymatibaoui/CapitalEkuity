package com.elemar.backendelemar.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormulaireLotCandidatResponse {

    private Long lotId;
    private String nomLot;

    private List<SectionFormulaireCandidatResponse> sections;
}