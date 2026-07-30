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

    public CandidatLoginResponse login(
            CandidatLoginRequest request
    ) {

        System.out.println("=== LOGIN CANDIDAT ===");
        System.out.println("Email reçu = " + request.getEmail());

        if (
                request.getEmail() == null ||
                        request.getEmail().isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email obligatoire."
            );
        }

        if (
                request.getMotDePasse() == null ||
                        request.getMotDePasse().isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mot de passe obligatoire."
            );
        }

        String email =
                request.getEmail()
                        .trim()
                        .toLowerCase();

        String motDePasseRecu =
                request.getMotDePasse().trim();

        Utilisateur user =
                utilisateurRepository
                        .findByEmailIgnoreCase(email)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED,
                                        "Email ou mot de passe incorrect"
                                )
                        );

        if (
                user.getTypeUtilisateur() !=
                        TypeUtilisateur.CND
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Ce compte n'est pas un compte candidat."
            );
        }

        /*
         * Vérifier le compte utilisateur.
         */
        if (Boolean.FALSE.equals(user.getActif())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Compte utilisateur désactivé."
            );
        }

        /*
         * Vérifier la candidature associée.
         */
        Candidature candidature =
                user.getCandidature();

        if (candidature == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Aucune candidature associée à ce compte."
            );
        }

        /*
         * Vérifier si El Emar a bloqué l’accès.
         */
        if (
                Boolean.TRUE.equals(
                        candidature.getAccesBloque()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "L’accès de cette candidature est désactivé."
            );
        }

        /*
         * Vérifier si la candidature existe encore
         * comme candidature active.
         */
        if (
                Boolean.FALSE.equals(
                        candidature.getActif()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Cette candidature n’est plus active."
            );
        }

        String passwordInDatabase =
                user.getMotDePasse();

        boolean passwordOk;

        if (
                passwordInDatabase != null &&
                        passwordInDatabase.startsWith("$2")
        ) {
            passwordOk =
                    passwordEncoder.matches(
                            motDePasseRecu,
                            passwordInDatabase
                    );
        } else {
            passwordOk =
                    motDePasseRecu.equals(
                            passwordInDatabase
                    );
        }

        if (!passwordOk) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Email ou mot de passe incorrect"
            );
        }

        return CandidatLoginResponse.builder()
                .utilisateurId(user.getId())
                .candidatureId(candidature.getId())
                .nom(user.getNom())
                .email(user.getEmail())

                .typeUtilisateur(
                        user.getTypeUtilisateur() != null
                                ? user.getTypeUtilisateur().name()
                                : null
                )

                .mustChangePassword(
                        user.getMustChangePassword()
                )

                .premiereConnexion(
                        user.getPremiereConnexion()
                )

                .actif(
                        user.getActif()
                )

                .statutCompte(
                        user.getStatutCompte() != null
                                ? user.getStatutCompte().name()
                                : null
                )

                .build();
    }
}