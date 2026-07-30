package com.elemar.backendelemar.security;

public record JwtPrincipal(
        Long userId,
        String email
) {
}