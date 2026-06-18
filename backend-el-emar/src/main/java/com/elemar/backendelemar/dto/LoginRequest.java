package com.elemar.backendelemar.dto;

public record LoginRequest(
        String email,
        String motDePasse
) {
}