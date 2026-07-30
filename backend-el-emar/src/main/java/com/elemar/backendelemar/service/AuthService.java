package com.elemar.backendelemar.service;

import com.elemar.backendelemar.config.JwtService;
import com.elemar.backendelemar.dto.LoginRequest;
import com.elemar.backendelemar.dto.LoginResponse;
import com.elemar.backendelemar.entity.RoleAcces;
import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        Utilisateur utilisateur = authenticate(request);
        return toLoginResponse(utilisateur);
    }

    @Transactional
    public LoginResponse loginCandidat(LoginRequest request) {
        Utilisateur utilisateur = authenticate(request);

        String type = utilisateur.getTypeUtilisateur() == null
                ? ""
                : utilisateur.getTypeUtilisateur().name();

        if (!"CND".equalsIgnoreCase(type)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Cet accès est réservé aux candidats / prestataires"
            );
        }

        return toLoginResponse(utilisateur);
    }

    @Transactional
    public LoginResponse loginElEmar(LoginRequest request) {
        Utilisateur utilisateur = authenticate(request);

        String type = utilisateur.getTypeUtilisateur() == null
                ? ""
                : utilisateur.getTypeUtilisateur().name();

        if ("CND".equalsIgnoreCase(type)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ce compte est un compte candidat. "
                            + "Veuillez utiliser l’espace candidat."
            );
        }

        return toLoginResponse(utilisateur);
    }

    private Utilisateur authenticate(LoginRequest request) {
        if (
                request == null
                        || request.email() == null
                        || request.motDePasse() == null
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email et mot de passe sont obligatoires"
            );
        }

        String email = request.email().trim();

        Utilisateur utilisateur =
                utilisateurRepository.findByEmail(email)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED,
                                        "Email ou mot de passe incorrect"
                                )
                        );

        if (
                utilisateur.getMotDePasse() == null
                        || !passwordMatches(
                        request.motDePasse(),
                        utilisateur.getMotDePasse()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Email ou mot de passe incorrect"
            );
        }

        if (Boolean.FALSE.equals(utilisateur.getActif())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ce compte est inactif"
            );
        }

        if (
                utilisateur.getStatutCompte() != null
                        && !"ACTIF".equalsIgnoreCase(
                        utilisateur.getStatutCompte().name()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ce compte est inactif"
            );
        }

        if (
                !isEncodedPassword(utilisateur.getMotDePasse())
                        && utilisateur.getMotDePasse()
                        .equals(request.motDePasse())
        ) {
            utilisateur.setMotDePasse(
                    passwordEncoder.encode(
                            request.motDePasse()
                    )
            );

            utilisateurRepository.save(utilisateur);
        }

        return utilisateur;
    }

    private boolean passwordMatches(
            String rawPassword,
            String storedPassword
    ) {
        if (rawPassword == null || storedPassword == null) {
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

    private boolean isEncodedPassword(String value) {
        return value.startsWith("$2a$")
                || value.startsWith("$2b$")
                || value.startsWith("$2y$");
    }

    private LoginResponse toLoginResponse(
            Utilisateur utilisateur
    ) {
        RoleAcces role = utilisateur.getRoleAcces();

        Long roleId = role == null
                ? null
                : role.getId();

        String roleCode = role == null
                ? utilisateur.getTypeUtilisateur().name()
                : role.getCodeRole();

        String roleNom = role == null
                ? null
                : role.getNomRole();

        String token = jwtService.generateToken(utilisateur
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
}