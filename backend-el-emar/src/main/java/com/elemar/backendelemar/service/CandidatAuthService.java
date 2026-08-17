package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.CandidatLoginRequest;
import com.elemar.backendelemar.dto.CandidatLoginResponse;
import com.elemar.backendelemar.entity.Candidature;
import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.enums.TypeUtilisateur;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CandidatAuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public CandidatLoginResponse login(
            CandidatLoginRequest request
    ) {
        validateRequest(request);

        String email =
                request.getEmail()
                        .trim()
                        .toLowerCase(Locale.ROOT);

        String rawPassword =
                request.getMotDePasse();

        Utilisateur utilisateur =
                utilisateurRepository
                        .findByEmailIgnoreCase(email)
                        .orElseThrow(() ->
                                unauthorizedCredentials()
                        );

        if (
                utilisateur.getMotDePasse() == null
                        || !passwordMatches(
                        rawPassword,
                        utilisateur.getMotDePasse()
                )
        ) {
            throw unauthorizedCredentials();
        }

        if (
                utilisateur.getTypeUtilisateur()
                        != TypeUtilisateur.CND
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ce compte n'est pas un compte candidat."
            );
        }

        if (Boolean.FALSE.equals(utilisateur.getActif())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Compte utilisateur désactivé."
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
                    "Compte utilisateur désactivé."
            );
        }

        Candidature candidature =
                utilisateur.getCandidature();

        if (candidature == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Aucune candidature associée à ce compte."
            );
        }

        if (
                Boolean.TRUE.equals(
                        candidature.getAccesBloque()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "L'accès de cette candidature est désactivé."
            );
        }

        if (
                Boolean.FALSE.equals(
                        candidature.getActif()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Cette candidature n'est plus active."
            );
        }

        /*
         * Conversion automatique d'un ancien mot de passe
         * texte clair vers BCrypt.
         */
        if (!isEncodedPassword(utilisateur.getMotDePasse())) {
            utilisateur.setMotDePasse(
                    passwordEncoder.encode(rawPassword)
            );

            utilisateurRepository.save(utilisateur);
        }

        return CandidatLoginResponse.builder()
                .utilisateurId(utilisateur.getId())
                .candidatureId(candidature.getId())
                .nom(utilisateur.getNom())
                .email(utilisateur.getEmail())
                .typeUtilisateur(
                        utilisateur.getTypeUtilisateur() != null
                                ? utilisateur
                                .getTypeUtilisateur()
                                .name()
                                : null
                )
                .mustChangePassword(
                        utilisateur.getMustChangePassword()
                )
                .premiereConnexion(
                        utilisateur.getPremiereConnexion()
                )
                .actif(
                        utilisateur.getActif()
                )
                .statutCompte(
                        utilisateur.getStatutCompte() != null
                                ? utilisateur
                                .getStatutCompte()
                                .name()
                                : null
                )
                .build();
    }

    private void validateRequest(
            CandidatLoginRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations de connexion sont obligatoires."
            );
        }

        if (
                request.getEmail() == null
                        || request.getEmail().isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email obligatoire."
            );
        }

        if (
                request.getMotDePasse() == null
                        || request.getMotDePasse().isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mot de passe obligatoire."
            );
        }
    }

    private boolean passwordMatches(
            String rawPassword,
            String storedPassword
    ) {
        if (
                rawPassword == null
                        || storedPassword == null
        ) {
            return false;
        }

        if (isEncodedPassword(storedPassword)) {
            return passwordEncoder.matches(
                    rawPassword,
                    storedPassword
            );
        }

        return storedPassword.equals(rawPassword);
    }

    private boolean isEncodedPassword(
            String value
    ) {
        if (value == null) {
            return false;
        }

        return value.startsWith("$2a$")
                || value.startsWith("$2b$")
                || value.startsWith("$2y$");
    }

    private ResponseStatusException unauthorizedCredentials() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Email ou mot de passe incorrect."
        );
    }
}