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
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CandidatAuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;

    public CandidatLoginResponse login(CandidatLoginRequest request) {

        System.out.println("=== LOGIN CANDIDAT ===");
        System.out.println("Email reçu = " + request.getEmail());
        System.out.println("Mot de passe reçu = [" + request.getMotDePasse() + "]");

        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email obligatoire."
            );
        }

        if (request.getMotDePasse() == null || request.getMotDePasse().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mot de passe obligatoire."
            );
        }

        String email = request.getEmail().trim().toLowerCase();
        String motDePasseRecu = request.getMotDePasse().trim();

        Utilisateur user = utilisateurRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> {
                    System.out.println("AUCUN UTILISATEUR TROUVÉ AVEC EMAIL = " + email);

                    return new ResponseStatusException(
                            HttpStatus.UNAUTHORIZED,
                            "Email ou mot de passe incorrect"
                    );
                });

        System.out.println("Utilisateur trouvé ID = " + user.getId());
        System.out.println("Type utilisateur = " + user.getTypeUtilisateur());
        System.out.println("Actif = " + user.getActif());
        System.out.println("Statut compte = " + user.getStatutCompte());
        System.out.println("Mot de passe en base = " + user.getMotDePasse());

        if (user.getTypeUtilisateur() != TypeUtilisateur.CND) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Ce compte n'est pas un compte candidat."
            );
        }

        if (Boolean.FALSE.equals(user.getActif())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Compte désactivé."
            );
        }

        String passwordInDatabase = user.getMotDePasse();

        boolean passwordOk;

        if (passwordInDatabase != null && passwordInDatabase.startsWith("$2")) {
            passwordOk = passwordEncoder.matches(motDePasseRecu, passwordInDatabase);
            System.out.println("Vérification BCrypt = " + passwordOk);
        } else {
            passwordOk = motDePasseRecu.equals(passwordInDatabase);
            System.out.println("Vérification ancien mot de passe clair = " + passwordOk);
        }

        if (!passwordOk) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Email ou mot de passe incorrect"
            );
        }

        Candidature candidature = user.getCandidature();

        return CandidatLoginResponse.builder()
                .utilisateurId(user.getId())
                .candidatureId(candidature != null ? candidature.getId() : null)
                .nom(user.getNom())
                .email(user.getEmail())
                .typeUtilisateur(user.getTypeUtilisateur() != null ? user.getTypeUtilisateur().name() : null)
                .mustChangePassword(user.getMustChangePassword())
                .premiereConnexion(user.getPremiereConnexion())
                .actif(user.getActif())
                .statutCompte(user.getStatutCompte() != null ? user.getStatutCompte().name() : null)
                .build();
    }
}