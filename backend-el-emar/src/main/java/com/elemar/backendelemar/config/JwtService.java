package com.elemar.backendelemar.config;

import com.elemar.backendelemar.entity.RoleAcces;
import com.elemar.backendelemar.entity.Utilisateur;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long expirationMs;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Génère un JWT pour un utilisateur.
     *
     * subject = email
     * userId = identifiant utilisateur
     * role = code du rôle
     * typeUtilisateur = type EL_EMAR, IT, ADMIN, CND...
     */
    public String generateToken(
            Utilisateur utilisateur
    ) {
        if (utilisateur == null) {
            throw new IllegalArgumentException(
                    "L'utilisateur est obligatoire pour générer le token."
            );
        }

        if (utilisateur.getId() == null) {
            throw new IllegalArgumentException(
                    "L'identifiant utilisateur est obligatoire."
            );
        }

        if (
                utilisateur.getEmail() == null
                        || utilisateur.getEmail().isBlank()
        ) {
            throw new IllegalArgumentException(
                    "L'email utilisateur est obligatoire."
            );
        }

        Map<String, Object> claims =
                new HashMap<>();

        claims.put(
                "userId",
                utilisateur.getId()
        );

        RoleAcces roleAcces =
                utilisateur.getRoleAcces();

        String roleCode = null;

        if (
                roleAcces != null
                        && roleAcces.getCodeRole() != null
                        && !roleAcces.getCodeRole().isBlank()
        ) {
            roleCode =
                    normalizeRoleCode(
                            roleAcces.getCodeRole()
                    );

            if (roleAcces.getId() != null) {
                claims.put(
                        "roleId",
                        roleAcces.getId()
                );
            }

            if (
                    roleAcces.getNomRole() != null
                            && !roleAcces.getNomRole().isBlank()
            ) {
                claims.put(
                        "roleNom",
                        roleAcces.getNomRole()
                );
            }

        } else if (
                utilisateur.getTypeUtilisateur() != null
        ) {
            roleCode =
                    normalizeRoleCode(
                            utilisateur
                                    .getTypeUtilisateur()
                                    .name()
                    );
        }

        if (roleCode != null) {
            claims.put(
                    "role",
                    roleCode
            );
        }

        if (
                utilisateur.getTypeUtilisateur() != null
        ) {
            claims.put(
                    "typeUtilisateur",
                    utilisateur
                            .getTypeUtilisateur()
                            .name()
            );
        }

        return buildToken(
                claims,
                utilisateur.getEmail()
                        .trim()
                        .toLowerCase(Locale.ROOT)
        );
    }

    private String buildToken(
            Map<String, Object> claims,
            String subject
    ) {
        Date issuedAt =
                new Date();

        Date expiration =
                new Date(
                        issuedAt.getTime()
                                + expirationMs
                );

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(issuedAt)
                .expiration(expiration)
                .signWith(getSigningKey())
                .compact();
    }

    public Claims extractAllClaims(
            String token
    ) {
        if (
                token == null
                        || token.isBlank()
        ) {
            throw new IllegalArgumentException(
                    "Le token JWT est obligatoire."
            );
        }

        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractEmail(
            String token
    ) {
        return extractAllClaims(token)
                .getSubject();
    }

    public Long extractUserId(
            String token
    ) {
        Claims claims =
                extractAllClaims(token);

        Object value =
                claims.get("userId");

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

    public String extractRole(
            String token
    ) {
        Claims claims =
                extractAllClaims(token);

        Object value =
                claims.get("role");

        if (value == null) {
            return null;
        }

        String role =
                String.valueOf(value)
                        .trim();

        return role.isBlank()
                ? null
                : normalizeRoleCode(role);
    }

    public boolean isTokenExpired(
            String token
    ) {
        Date expiration =
                extractAllClaims(token)
                        .getExpiration();

        return expiration == null
                || expiration.before(new Date());
    }

    private String normalizeRoleCode(
            String roleCode
    ) {
        if (
                roleCode == null
                        || roleCode.isBlank()
        ) {
            return null;
        }

        String normalized =
                roleCode
                        .trim()
                        .toUpperCase(Locale.ROOT);

        if (normalized.startsWith("ROLE_")) {
            normalized =
                    normalized.substring(5);
        }

        return normalized;
    }
}