package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.ChangePasswordRequest;
import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CandidatCompteService {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        Utilisateur user = utilisateurRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable."
                ));

        if (request.getOldPassword() == null || request.getOldPassword().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ancien mot de passe obligatoire."
            );
        }

        if (request.getNewPassword() == null || request.getNewPassword().length() < 8) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nouveau mot de passe doit contenir au moins 8 caractères."
            );
        }

        String currentPassword = user.getMotDePasse();

        boolean matchesEncrypted = passwordEncoder.matches(
                request.getOldPassword(),
                currentPassword
        );

        boolean matchesOldPlainTextData = request.getOldPassword().equals(currentPassword);

        if (!matchesEncrypted && !matchesOldPlainTextData) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ancien mot de passe incorrect."
            );
        }

        user.setMotDePasse(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        user.setUpdatedAt(LocalDateTime.now());

        utilisateurRepository.save(user);
    }
}