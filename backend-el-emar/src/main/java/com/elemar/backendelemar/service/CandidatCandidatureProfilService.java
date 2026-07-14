package com.elemar.backendelemar.service;


import com.elemar.backendelemar.dto.UpdateCandidatureProfilRequest;
import com.elemar.backendelemar.entity.Candidature;
import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.repository.CandidatureRepository;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CandidatCandidatureProfilService {

    private final UtilisateurRepository utilisateurRepository;
    private final CandidatureRepository candidatureRepository;

    public Candidature getProfilByUserId(Long userId) {
        Utilisateur user = findUser(userId);

        if (user.getCandidature() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Aucune candidature liée à cet utilisateur."
            );
        }

        return user.getCandidature();
    }

    @Transactional
    public Candidature updateProfilByUserId(
            Long userId,
            UpdateCandidatureProfilRequest request
    ) {
        Utilisateur user = findUser(userId);

        if (user.getCandidature() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Aucune candidature liée à cet utilisateur."
            );
        }

        Candidature candidature = user.getCandidature();

        candidature.setNomEntreprise(clean(request.getNomEntreprise()));
        candidature.setEmailPrincipal(clean(request.getEmailPrincipal()));
        candidature.setTelephone(clean(request.getTelephone()));
        candidature.setAdresse(clean(request.getAdresse()));
        candidature.setVille(clean(request.getVille()));

        boolean complete =
                notBlank(candidature.getNomEntreprise())
                        && notBlank(candidature.getEmailPrincipal())
                        && notBlank(candidature.getTelephone())
                        && notBlank(candidature.getAdresse());

        candidature.setProfilComplete(complete);
        candidature.setUpdatedAt(LocalDateTime.now());

        return candidatureRepository.save(candidature);
    }

    private Utilisateur findUser(Long userId) {
        return utilisateurRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable."
                ));
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }
}