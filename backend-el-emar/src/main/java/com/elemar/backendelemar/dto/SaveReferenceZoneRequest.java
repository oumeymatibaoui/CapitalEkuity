package com.elemar.backendelemar.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SaveReferenceZoneRequest {

    private Long applicationCandidatureId;
    private Long zoneId;
    private String commentaire;

    private Long utilisateurId;
}