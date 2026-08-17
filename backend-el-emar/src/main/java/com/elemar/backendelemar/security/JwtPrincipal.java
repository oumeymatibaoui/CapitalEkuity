package com.elemar.backendelemar.security;

import java.security.Principal;
import java.util.Objects;

public final class JwtPrincipal implements Principal {

    private final Long userId;
    private final String email;

    public JwtPrincipal(
            Long userId,
            String email
    ) {
        this.userId = Objects.requireNonNull(
                userId,
                "userId ne peut pas être null"
        );

        this.email = Objects.requireNonNull(
                email,
                "email ne peut pas être null"
        );
    }

    public Long getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    /**
     * Authentication.getName() retournera l'email.
     */
    @Override
    public String getName() {
        return email;
    }

    @Override
    public String toString() {
        return email;
    }
}