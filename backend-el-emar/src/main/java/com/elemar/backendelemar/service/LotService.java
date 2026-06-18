package com.elemar.backendelemar.service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.elemar.backendelemar.dto.LotRequest;
import com.elemar.backendelemar.dto.LotResponse;
import com.elemar.backendelemar.entity.Lot;
import com.elemar.backendelemar.repository.LotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LotService {

    private final LotRepository lotRepository;

    @Transactional(readOnly = true)
    public List<LotResponse> getAllLots() {
        return lotRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LotResponse getLotById(Long id) {
        return toResponse(findLot(id));
    }

    @Transactional
    public LotResponse createLot(LotRequest request) {
        String codeLot = normalizeCode(request.getCodeLot());

        lotRepository.findByCodeLotIgnoreCase(codeLot).ifPresent(existing -> {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce code de lot existe déjà"
            );
        });

        Lot lot = Lot.builder()
                .codeLot(codeLot)
                .nomLot(request.getNomLot())
                .description(request.getDescription())
                .actif(request.getActif() != null ? request.getActif() : true)
                .createdAt(LocalDateTime.now())
                .build();

        return toResponse(lotRepository.save(lot));
    }
    @Transactional
    public LotResponse updateLot(Long id, LotRequest request) {
        Lot lot = findLot(id);

        String codeLot = normalizeCode(request.getCodeLot());

        lotRepository.findByCodeLotIgnoreCase(codeLot).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ce code de lot existe déjà"
                );
            }
        });

        lot.setCodeLot(codeLot);
        lot.setNomLot(request.getNomLot());
        lot.setDescription(request.getDescription());
        lot.setActif(request.getActif() != null ? request.getActif() : true);

        return toResponse(lotRepository.save(lot));
    }
    @Transactional
    public void deleteLot(Long id) {
        Lot lot = findLot(id);
        lotRepository.delete(lot);
    }

    private Lot findLot(Long id) {
        return lotRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lot introuvable"));
    }

    private String normalizeCode(String codeLot) {
        if (codeLot == null || codeLot.isBlank()) {
            throw new RuntimeException("Le code du lot est obligatoire");
        }

        return codeLot.trim().toUpperCase();
    }

    private LotResponse toResponse(Lot lot) {
        return LotResponse.builder()
                .id(lot.getId())
                .codeLot(lot.getCodeLot())
                .nomLot(lot.getNomLot())
                .description(lot.getDescription())
                .actif(lot.getActif())
                .createdAt(lot.getCreatedAt())
                .build();
    }
}