package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppelLotOptionResponse {

    private Long appelLotId;

    private Long appelId;
    private String appelTitre;

    private Long lotId;
    private String lotNom;

    private String label;
}