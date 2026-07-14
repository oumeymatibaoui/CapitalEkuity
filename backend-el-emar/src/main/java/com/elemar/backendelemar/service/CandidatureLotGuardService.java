package com.elemar.backendelemar.service;

import com.elemar.backendelemar.repository.CandidatureLotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CandidatureLotGuardService {

    private final CandidatureLotRepository candidatureLotRepository;

    public void ensureLotAllowed(Long candidatureId, Long lotId) {
        boolean allowed = candidatureLotRepository
                .existsByCandidature_IdAndLot_IdAndActifTrue(candidatureId, lotId);

        if (!allowed) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ce lot n'est pas autorisé pour cette candidature."
            );
        }
    }
}