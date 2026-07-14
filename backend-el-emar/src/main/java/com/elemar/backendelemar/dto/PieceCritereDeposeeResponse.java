package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PieceCritereDeposeeResponse {

    private Long criterePieceId;

    private String nomFichier;

    private String statut;
}