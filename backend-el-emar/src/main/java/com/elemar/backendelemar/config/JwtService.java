package com.elemar.backendelemar.config;

import com.elemar.backendelemar.entity.Utilisateur;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long expirationMs;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(
            Utilisateur utilisateur
    ) {
        Map<String, Object> claims =
                new HashMap<>();

        claims.put(
                "userId",
                utilisateur.getId()
        );

        if (utilisateur.getFonction() != null) {
            claims.put(
                    "role",
                    utilisateur.getRoleAcces().getCodeRole()
            );
        }

        return buildToken(
                claims,
                utilisateur.getEmail()
        );
    }
    private String buildToken(
            Map<String, Object> claims,
            String subject
    ) {
        Date issuedAt = new Date();

        Date expiration = new Date(
                issuedAt.getTime() + expirationMs
        );

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(issuedAt)
                .expiration(expiration)
                .signWith(getSigningKey())
                .compact();
    }
    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }
}