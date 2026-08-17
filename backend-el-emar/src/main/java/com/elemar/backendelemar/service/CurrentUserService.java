package com.elemar.backendelemar.service;

import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import com.elemar.backendelemar.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CurrentUserService {

    private final UtilisateurRepository utilisateurRepository;

    /**
     * Retourne l'utilisateur actuellement connecté.
     */
    public Utilisateur getCurrentUser() {

        Authentication authentication =
                getAuthentication();

        Object principal =
                authentication.getPrincipal();

        /*
         * Cas normal avec le JwtAuthFilter actuel.
         */
        if (principal instanceof JwtPrincipal jwtPrincipal) {
            return findUserById(
                    jwtPrincipal.getUserId()
            );
        }

        /*
         * Compatibilité avec les anciennes authentifications
         * dont le principal était directement l'email.
         */
        String email =
                authentication.getName();

        if (
                email == null
                        || email.isBlank()
                        || "anonymousUser".equalsIgnoreCase(email)
        ) {
            throw unauthorized(
                    "L'identité de l'utilisateur connecté est invalide."
            );
        }

        Utilisateur utilisateur =
                utilisateurRepository
                        .findByEmailIgnoreCase(
                                email.trim()
                        )
                        .orElseThrow(() ->
                                unauthorized(
                                        "Aucun compte ne correspond à l'identité contenue dans le JWT."
                                )
                        );

        verifyUserIsActive(utilisateur);

        return utilisateur;
    }

    public Long getCurrentUserId() {
        return getCurrentUser().getId();
    }

    public String getCurrentUserEmail() {
        return getCurrentUser().getEmail();
    }

    public JwtPrincipal getCurrentPrincipal() {

        Authentication authentication =
                getAuthentication();

        Object principal =
                authentication.getPrincipal();

        if (principal instanceof JwtPrincipal jwtPrincipal) {
            return jwtPrincipal;
        }

        Utilisateur utilisateur =
                getCurrentUser();

        return new JwtPrincipal(
                utilisateur.getId(),
                utilisateur.getEmail()
        );
    }

    private Utilisateur findUserById(
            Long userId
    ) {

        if (userId == null) {
            throw unauthorized(
                    "Le JWT ne contient pas l'identifiant utilisateur."
            );
        }

        Utilisateur utilisateur =
                utilisateurRepository
                        .findById(userId)
                        .orElseThrow(() ->
                                unauthorized(
                                        "Aucun compte ne correspond à l'identifiant contenu dans le JWT."
                                )
                        );

        verifyUserIsActive(utilisateur);

        return utilisateur;
    }

    private void verifyUserIsActive(
            Utilisateur utilisateur
    ) {

        if (Boolean.FALSE.equals(utilisateur.getActif())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ce compte utilisateur est désactivé."
            );
        }

        if (
                utilisateur.getStatutCompte() != null
                        && !"ACTIF".equalsIgnoreCase(
                        utilisateur
                                .getStatutCompte()
                                .name()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ce compte utilisateur est inactif."
            );
        }
    }

    private Authentication getAuthentication() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (
                authentication == null
                        || !authentication.isAuthenticated()
                        || authentication instanceof AnonymousAuthenticationToken
        ) {
            throw unauthorized(
                    "Utilisateur non authentifié."
            );
        }

        return authentication;
    }

    private ResponseStatusException unauthorized(
            String message
    ) {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                message
        );
    }
}