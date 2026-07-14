package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.LoginRequest;
import com.elemar.backendelemar.dto.LoginResponse;
import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;

    public LoginResponse login(LoginRequest request) {
        Utilisateur utilisateur = authenticate(request);

        return toLoginResponse(utilisateur);
    }

    public LoginResponse loginCandidat(LoginRequest request) {
        Utilisateur utilisateur = authenticate(request);

        String role = String.valueOf(utilisateur.getTypeUtilisateur());

        if (!"CND".equalsIgnoreCase(role)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Cet accès est réservé aux candidats / prestataires"
            );
        }

        return toLoginResponse(utilisateur);
    }

    public LoginResponse loginElEmar(LoginRequest request) {
        Utilisateur utilisateur = authenticate(request);

        String role = String.valueOf(utilisateur.getTypeUtilisateur());

        if ("CND".equalsIgnoreCase(role)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ce compte est un compte candidat. Veuillez utiliser l’espace candidat."
            );
        }

        return toLoginResponse(utilisateur);
    }

    private Utilisateur authenticate(LoginRequest request) {

        if (request == null || request.email() == null || request.motDePasse() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email et mot de passe sont obligatoires"
            );
        }

        String email = request.email().trim();

        Utilisateur utilisateur = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Email ou mot de passe incorrect"
                ));

        if (utilisateur.getMotDePasse() == null ||
                !utilisateur.getMotDePasse().equals(request.motDePasse())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Email ou mot de passe incorrect"
            );
        }

        // Contrôle du statut du compte
        if (utilisateur.getStatutCompte() != null) {
            String statut = String.valueOf(utilisateur.getStatutCompte());

            if (!"ACTIF".equalsIgnoreCase(statut)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Ce compte est inactif"
                );
            }
        }

        return utilisateur;
    }

    private LoginResponse toLoginResponse(Utilisateur utilisateur) {
        return new LoginResponse(
                utilisateur.getId(),
                utilisateur.getNom(),
                utilisateur.getEmail(),
                utilisateur.getTypeUtilisateur()
        );
    }
}