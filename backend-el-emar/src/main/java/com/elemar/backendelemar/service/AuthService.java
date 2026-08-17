package com.elemar.backendelemar.service;

import com.elemar.backendelemar.config.JwtService;
import com.elemar.backendelemar.dto.LoginRequest;
import com.elemar.backendelemar.dto.LoginResponse;
import com.elemar.backendelemar.entity.RoleAcces;
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
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public LoginResponse login(
            LoginRequest request
    ) {
        Utilisateur utilisateur =
                authenticate(request);

        return toLoginResponse(utilisateur);
    }

    @Transactional
    public LoginResponse loginCandidat(
            LoginRequest request
    ) {

        Utilisateur utilisateur =
                authenticate(request);

        if (
                utilisateur.getTypeUtilisateur()
                        != TypeUtilisateur.CND
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Cet accès est réservé aux candidats / prestataires."
            );
        }

        return toLoginResponse(utilisateur);
    }

    @Transactional
    public LoginResponse loginElEmar(
            LoginRequest request
    ) {

        Utilisateur utilisateur =
                authenticate(request);

        if (
                utilisateur.getTypeUtilisateur()
                        == TypeUtilisateur.CND
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ce compte est un compte candidat. "
                            + "Veuillez utiliser l'espace candidat."
            );
        }

        return toLoginResponse(utilisateur);
    }

    private Utilisateur authenticate(
            LoginRequest request
    ) {

        validateRequest(request);

        String email =
                request.email()
                        .trim()
                        .toLowerCase(Locale.ROOT);

        String rawPassword =
                request.motDePasse();

        Utilisateur utilisateur =
                utilisateurRepository
                        .findByEmailIgnoreCase(email)
                        .orElseThrow(
                                this::invalidCredentials
                        );

        String storedPassword =
                utilisateur.getMotDePasse();

        if (
                storedPassword == null
                        || !passwordMatches(
                        rawPassword,
                        storedPassword
                )
        ) {
            throw invalidCredentials();
        }

        if (Boolean.FALSE.equals(utilisateur.getActif())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ce compte est inactif."
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
                    "Ce compte est inactif."
            );
        }

        /*
         * Convertit automatiquement les anciens mots
         * de passe texte clair en BCrypt.
         */
        if (!isEncodedPassword(storedPassword)) {

            utilisateur.setMotDePasse(
                    passwordEncoder.encode(
                            rawPassword
                    )
            );

            utilisateur =
                    utilisateurRepository.save(
                            utilisateur
                    );
        }

        return utilisateur;
    }

    private void validateRequest(
            LoginRequest request
    ) {

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations de connexion sont obligatoires."
            );
        }

        if (
                request.email() == null
                        || request.email().isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "L'email est obligatoire."
            );
        }

        if (
                request.motDePasse() == null
                        || request.motDePasse().isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le mot de passe est obligatoire."
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

        return storedPassword.equals(
                rawPassword
        );
    }

    private boolean isEncodedPassword(
            String password
    ) {

        if (password == null) {
            return false;
        }

        return password.startsWith("$2a$")
                || password.startsWith("$2b$")
                || password.startsWith("$2y$");
    }

    private LoginResponse toLoginResponse(
            Utilisateur utilisateur
    ) {

        RoleAcces role =
                utilisateur.getRoleAcces();

        Long roleId = null;
        String roleCode = null;
        String roleNom = null;

        if (role != null) {

            roleId =
                    role.getId();

            roleCode =
                    normalizeRoleCode(
                            role.getCodeRole()
                    );

            roleNom =
                    role.getNomRole();
        }

        /*
         * Si aucun rôle personnalisé n'est associé,
         * utiliser le type utilisateur.
         */
        if (
                roleCode == null
                        && utilisateur.getTypeUtilisateur() != null
        ) {
            roleCode =
                    utilisateur
                            .getTypeUtilisateur()
                            .name();
        }

        if (
                roleNom == null
                        && utilisateur.getTypeUtilisateur() != null
        ) {
            roleNom =
                    utilisateur
                            .getTypeUtilisateur()
                            .name();
        }

        String token =
                jwtService.generateToken(
                        utilisateur
                );

        return new LoginResponse(
                utilisateur.getId(),
                utilisateur.getNom(),
                utilisateur.getEmail(),
                utilisateur.getTypeUtilisateur(),
                roleId,
                roleCode,
                roleNom,
                token
        );
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

    private ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Email ou mot de passe incorrect."
        );
    }
}