package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PieceEvaluationResponse {

    private Long pieceDeposeeId;
    private Long criterePieceId;

    private String codePiece;
    private String nomPiece;
    private String nomFichier;
    private String typeContenu;

    private Boolean deposee;

    private String pdfUrl;
}