package com.elemar.backendelemar.config;

import com.elemar.backendelemar.security.JwtPrincipal;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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

        String authHeader =
                request.getHeader("Authorization");

        if (
                authHeader == null ||
                        !authHeader.startsWith("Bearer ")
        ) {
            filterChain.doFilter(
                    request,
                    response
            );
            return;
        }

        String token =
                authHeader.substring(7);

        try {
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
                    String.valueOf(
                                    claims.get("role")
                            )
                            .trim()
                            .toUpperCase();

            if (
                    email != null &&
                            userId != null &&
                            SecurityContextHolder
                                    .getContext()
                                    .getAuthentication() == null
            ) {
                JwtPrincipal principal =
                        new JwtPrincipal(
                                userId,
                                email
                        );

                List<SimpleGrantedAuthority>
                        authorities =
                        new ArrayList<>();

                if (
                        roleCode != null &&
                                !roleCode.isBlank() &&
                                !"NULL".equals(roleCode)
                ) {
                    authorities.add(
                            new SimpleGrantedAuthority(
                                    "ROLE_" + roleCode
                            )
                    );
                }

                UsernamePasswordAuthenticationToken
                        authentication =
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
                        .setAuthentication(
                                authentication
                        );
            }

        } catch (Exception exception) {
            System.out.println(
                    "JWT invalide : "
                            + exception.getMessage()
            );

            SecurityContextHolder
                    .clearContext();
        }

        filterChain.doFilter(
                request,
                response
        );
    }

    private Long readLongClaim(
            Claims claims,
            String name
    ) {
        Object value = claims.get(name);

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
}