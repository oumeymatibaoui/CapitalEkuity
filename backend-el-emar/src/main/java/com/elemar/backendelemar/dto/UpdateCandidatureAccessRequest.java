package com.elemar.backendelemar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCandidatureAccessRequest {

    private String nomEntreprise;

    private Long typeIntervenantId;

    @Builder.Default
    private List<Long> lotIds = new ArrayList<>();
}