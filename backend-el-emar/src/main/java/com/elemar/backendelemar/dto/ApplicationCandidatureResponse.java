package com.elemar.backendelemar.dto;

public record ApplicationCandidatureResponse(
        Long id,
        Long lotId,
        String nomLot,
        String statut
) {}