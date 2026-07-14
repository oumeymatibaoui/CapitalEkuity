package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.TypeIntervenantRequest;
import com.elemar.backendelemar.dto.TypeIntervenantResponse;
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
public class TypeIntervenantService {

    private final TypeIntervenantRepository typeIntervenantRepository;
    private final LotRepository lotRepository;

    @Transactional(readOnly = true)
    public List<TypeIntervenantResponse> getAllTypes() {
        return typeIntervenantRepository
                .findAllByOrderByOrdreAffichageAscLibelleAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TypeIntervenantResponse> getActiveTypes() {
        return typeIntervenantRepository
                .findByActifTrueOrderByOrdreAffichageAscLibelleAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TypeIntervenantResponse getTypeById(Long id) {
        return toResponse(findType(id));
    }

    @Transactional
    public TypeIntervenantResponse createType(TypeIntervenantRequest request) {
        String code = normalizeCode(request.getCode());

        typeIntervenantRepository.findByCodeIgnoreCase(code).ifPresent(existing -> {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce code de type existe déjà"
            );
        });

        TypeIntervenant type = TypeIntervenant.builder()
                .code(code)
                .libelle(cleanRequired(request.getLibelle(), "Le libellé est obligatoire"))
                .description(cleanNullable(request.getDescription()))
                .actif(request.getActif() != null ? request.getActif() : true)
                .ordreAffichage(request.getOrdreAffichage() != null ? request.getOrdreAffichage() : 0)
                .build();

        return toResponse(typeIntervenantRepository.save(type));
    }

    @Transactional
    public TypeIntervenantResponse updateType(Long id, TypeIntervenantRequest request) {
        TypeIntervenant type = findType(id);
        String code = normalizeCode(request.getCode());

        typeIntervenantRepository.findByCodeIgnoreCase(code).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ce code de type existe déjà"
                );
            }
        });

        type.setCode(code);
        type.setLibelle(cleanRequired(request.getLibelle(), "Le libellé est obligatoire"));
        type.setDescription(cleanNullable(request.getDescription()));
        type.setActif(request.getActif() != null ? request.getActif() : true);
        type.setOrdreAffichage(request.getOrdreAffichage() != null ? request.getOrdreAffichage() : 0);

        return toResponse(typeIntervenantRepository.save(type));
    }

    @Transactional
    public void deleteType(Long id) {
        TypeIntervenant type = findType(id);

        long lotsCount = lotRepository.countByTypeIntervenantId(id);

        if (lotsCount > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Impossible de supprimer ce type car il contient des domaines / lots"
            );
        }

        typeIntervenantRepository.delete(type);
    }

    private TypeIntervenant findType(Long id) {
        return typeIntervenantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Type d’intervenant introuvable"
                ));
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le code du type est obligatoire"
            );
        }

        return code.trim().toUpperCase();
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

    private TypeIntervenantResponse toResponse(TypeIntervenant type) {
        return TypeIntervenantResponse.builder()
                .id(type.getId())
                .code(type.getCode())
                .libelle(type.getLibelle())
                .description(type.getDescription())
                .actif(type.getActif())
                .ordreAffichage(type.getOrdreAffichage())
                .createdAt(type.getCreatedAt())
                .updatedAt(type.getUpdatedAt())
                .build();
    }
}