package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.LotRequest;
import com.elemar.backendelemar.dto.LotResponse;
import com.elemar.backendelemar.entity.Lot;
import com.elemar.backendelemar.entity.TypeIntervenant;
import com.elemar.backendelemar.repository.LotRepository;
import com.elemar.backendelemar.repository.TypeIntervenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LotService {

    private final LotRepository lotRepository;
    private final TypeIntervenantRepository typeIntervenantRepository;

    @Transactional(readOnly = true)
    public List<LotResponse> getAllLots(Long typeIntervenantId) {
        List<Lot> lots;

        if (typeIntervenantId != null) {
            lots = lotRepository.findByTypeIntervenantIdOrderByNomLotAsc(typeIntervenantId);
        } else {
            lots = lotRepository.findAllByOrderByNomLotAsc();
        }

        return lots.stream()
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
                    "Ce code de domaine existe déjà"
            );
        });

        TypeIntervenant type = findType(request.getTypeIntervenantId());

        Lot lot = Lot.builder()
                .codeLot(codeLot)
                .nomLot(cleanRequired(request.getNomLot(), "Le nom du domaine est obligatoire"))
                .description(cleanNullable(request.getDescription()))
                .actif(request.getActif() != null ? request.getActif() : true)
                .typeIntervenant(type)
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
                        "Ce code de domaine existe déjà"
                );
            }
        });

        TypeIntervenant type = findType(request.getTypeIntervenantId());

        lot.setCodeLot(codeLot);
        lot.setNomLot(cleanRequired(request.getNomLot(), "Le nom du domaine est obligatoire"));
        lot.setDescription(cleanNullable(request.getDescription()));
        lot.setActif(request.getActif() != null ? request.getActif() : true);
        lot.setTypeIntervenant(type);

        return toResponse(lotRepository.save(lot));
    }

    @Transactional
    public void deleteLot(Long id) {
        Lot lot = findLot(id);
        lotRepository.delete(lot);
    }

    private Lot findLot(Long id) {
        return lotRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Domaine / lot introuvable"
                ));
    }

    private TypeIntervenant findType(Long typeIntervenantId) {
        if (typeIntervenantId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le type d’intervenant est obligatoire"
            );
        }

        return typeIntervenantRepository.findById(typeIntervenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Type d’intervenant introuvable"
                ));
    }

    private String normalizeCode(String codeLot) {
        if (codeLot == null || codeLot.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le code du domaine est obligatoire"
            );
        }

        return codeLot.trim().toUpperCase();
    }

    private String cleanRequired(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }

        return value.trim();
    }

    private String cleanNullable(String value) {
        return value == null ? null : value.trim();
    }

    private LotResponse toResponse(Lot lot) {
        TypeIntervenant type = lot.getTypeIntervenant();

        return LotResponse.builder()
                .id(lot.getId())
                .codeLot(lot.getCodeLot())
                .nomLot(lot.getNomLot())
                .description(lot.getDescription())
                .actif(lot.getActif())
                .typeIntervenantId(type != null ? type.getId() : null)
                .typeIntervenantCode(type != null ? type.getCode() : null)
                .typeIntervenantLibelle(type != null ? type.getLibelle() : null)
                .createdAt(lot.getCreatedAt())
                .updatedAt(lot.getUpdatedAt())
                .build();
    }
}