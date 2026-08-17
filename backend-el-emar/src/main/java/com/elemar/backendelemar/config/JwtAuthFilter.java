package com.elemar.backendelemar.config;

import com.elemar.backendelemar.security.JwtPrincipal;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Slf4j
@Component
public class JwtAuthFilter
        extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(
            JwtService jwtService
    ) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String authorizationHeader =
                request.getHeader("Authorization");

        if (
                authorizationHeader == null
                        || !authorizationHeader.startsWith("Bearer ")
        ) {
            filterChain.doFilter(
                    request,
                    response
            );

            return;
        }

        String token =
                authorizationHeader
                        .substring(7)
                        .trim();

        if (token.isBlank()) {
            filterChain.doFilter(
                    request,
                    response
            );

            return;
        }

        try {
            /*
             * Ne pas remplacer une authentification
             * déjà créée dans le contexte.
             */
            if (
                    SecurityContextHolder
                            .getContext()
                            .getAuthentication() == null
            ) {
                authenticateRequest(
                        request,
                        token
                );
            }

        } catch (Exception exception) {
            log.warn(
                    "JWT invalide pour {} {} : {}",
                    request.getMethod(),
                    request.getRequestURI(),
                    exception.getMessage()
            );

            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(
                request,
                response
        );
    }

    private void authenticateRequest(
            HttpServletRequest request,
            String token
    ) {
        Claims claims =
                jwtService.extractAllClaims(token);

        String email =
                claims.getSubject();

        Long userId =
                readLongClaim(
                        claims,
                        "userId"
                );

        String roleCode =
                readStringClaim(
                        claims,
                        "role"
                );

        /*
         * Compatibilité avec les anciens tokens
         * qui peuvent ne pas avoir le claim role.
         */
        if (
                roleCode == null
                        || roleCode.isBlank()
        ) {
            roleCode =
                    readStringClaim(
                            claims,
                            "typeUtilisateur"
                    );
        }

        if (
                email == null
                        || email.isBlank()
        ) {
            throw new IllegalArgumentException(
                    "Le JWT ne contient pas l'email utilisateur."
            );
        }

        if (userId == null) {
            throw new IllegalArgumentException(
                    "Le JWT ne contient pas l'identifiant utilisateur."
            );
        }

        JwtPrincipal principal =
                new JwtPrincipal(
                        userId,
                        email.trim()
                                .toLowerCase(Locale.ROOT)
                );

        List<SimpleGrantedAuthority> authorities =
                buildAuthorities(roleCode);

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        authorities
                );

        authentication.setDetails(
                new WebAuthenticationDetailsSource()
                        .buildDetails(request)
        );

        SecurityContextHolder
                .getContext()
                .setAuthentication(authentication);

        log.debug(
                "Utilisateur JWT authentifié : userId={}, email={}, rôle={}",
                userId,
                email,
                roleCode
        );
    }

    private List<SimpleGrantedAuthority> buildAuthorities(
            String roleCode
    ) {
        List<SimpleGrantedAuthority> authorities =
                new ArrayList<>();

        if (
                roleCode == null
                        || roleCode.isBlank()
        ) {
            return authorities;
        }

        String normalizedRole =
                roleCode
                        .trim()
                        .toUpperCase(Locale.ROOT);

        if (normalizedRole.startsWith("ROLE_")) {
            normalizedRole =
                    normalizedRole.substring(5);
        }

        /*
         * Permet d'utiliser :
         *
         * hasAuthority("ADMIN")
         * hasAuthority("ROLE_ADMIN")
         * hasRole("ADMIN")
         */
        authorities.add(
                new SimpleGrantedAuthority(
                        normalizedRole
                )
        );

        authorities.add(
                new SimpleGrantedAuthority(
                        "ROLE_" + normalizedRole
                )
        );

        return authorities;
    }

    private Long readLongClaim(
            Claims claims,
            String name
    ) {
        Object value =
                claims.get(name);

        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        try {
            return Long.valueOf(
                    String.valueOf(value)
            );
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String readStringClaim(
            Claims claims,
            String name
    ) {
        Object value =
                claims.get(name);

        if (value == null) {
            return null;
        }

        String text =
                String.valueOf(value)
                        .trim();

        if (
                text.isBlank()
                        || "null".equalsIgnoreCase(text)
        ) {
            return null;
        }

        return text;
    }
}