package com.elemar.backendelemar.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SectionFormulaireCandidatResponse {

    private String section;

    private List<CritereFormulaireCandidatResponse> criteres;
}