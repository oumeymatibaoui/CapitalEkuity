package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.CategorieEvaluationRequest;
import com.elemar.backendelemar.dto.CategorieEvaluationResponse;
import com.elemar.backendelemar.entity.CategorieEvaluation;
import com.elemar.backendelemar.entity.Lot;
import com.elemar.backendelemar.entity.TypeIntervenant;
import com.elemar.backendelemar.repository.CategorieEvaluationRepository;
import com.elemar.backendelemar.repository.CritereEvaluationRepository;
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
public class CategorieEvaluationService {

    private final CategorieEvaluationRepository categorieRepository;
    private final TypeIntervenantRepository typeRepository;
    private final LotRepository lotRepository;
    private final CritereEvaluationRepository critereRepository;

    @Transactional(readOnly = true)
    public List<CategorieEvaluationResponse> getByScope(
            Long typeIntervenantId,
            Long lotId
    ) {
        if (typeIntervenantId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le type d’intervenant est obligatoire"
            );
        }

        return categorieRepository
                .findByScope(typeIntervenantId, lotId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CategorieEvaluationResponse getById(Long id) {
        return toResponse(findCategorie(id));
    }

    @Transactional
    public CategorieEvaluationResponse create(CategorieEvaluationRequest request) {
        TypeIntervenant type = findType(request.getTypeIntervenantId());
        Lot lot = findLotIfPresent(request.getLotId(), type);

        String code = normalizeCode(request.getCode(), request.getLibelle());
        String libelle = cleanRequired(request.getLibelle(), "Le libellé est obligatoire");

        checkDuplicates(null, type.getId(), lot != null ? lot.getId() : null, code, libelle);

        CategorieEvaluation categorie = CategorieEvaluation.builder()
                .typeIntervenant(type)
                .lot(lot)
                .code(code)
                .libelle(libelle)
                .description(cleanNullable(request.getDescription()))
                .actif(request.getActif() != null ? request.getActif() : true)
                .ordreAffichage(request.getOrdreAffichage() != null ? request.getOrdreAffichage() : 0)
                .build();

        return toResponse(categorieRepository.save(categorie));
    }

    @Transactional
    public CategorieEvaluationResponse update(Long id, CategorieEvaluationRequest request) {
        CategorieEvaluation categorie = findCategorie(id);

        TypeIntervenant type = findType(request.getTypeIntervenantId());
        Lot lot = findLotIfPresent(request.getLotId(), type);

        String code = normalizeCode(request.getCode(), request.getLibelle());
        String libelle = cleanRequired(request.getLibelle(), "Le libellé est obligatoire");

        checkDuplicates(id, type.getId(), lot != null ? lot.getId() : null, code, libelle);

        categorie.setTypeIntervenant(type);
        categorie.setLot(lot);
        categorie.setCode(code);
        categorie.setLibelle(libelle);
        categorie.setDescription(cleanNullable(request.getDescription()));
        categorie.setActif(request.getActif() != null ? request.getActif() : true);
        categorie.setOrdreAffichage(request.getOrdreAffichage() != null ? request.getOrdreAffichage() : 0);

        return toResponse(categorieRepository.save(categorie));
    }

    @Transactional
    public CategorieEvaluationResponse toggleActif(Long id) {
        CategorieEvaluation categorie = findCategorie(id);

        boolean current = Boolean.TRUE.equals(categorie.getActif());
        categorie.setActif(!current);

        return toResponse(categorieRepository.save(categorie));
    }

    @Transactional
    public void delete(Long id) {
        CategorieEvaluation categorie = findCategorie(id);

        long used = critereRepository.countByCategorieEvaluation_Id(id);

        if (used > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Impossible de supprimer cette catégorie car elle est utilisée par des critères"
            );
        }

        categorieRepository.delete(categorie);
    }

    private void checkDuplicates(
            Long currentId,
            Long typeIntervenantId,
            Long lotId,
            String code,
            String libelle
    ) {
        categorieRepository.findDuplicateCode(typeIntervenantId, lotId, code)
                .ifPresent(existing -> {
                    if (currentId == null || !existing.getId().equals(currentId)) {
                        throw new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "Ce code de catégorie existe déjà dans ce périmètre"
                        );
                    }
                });

        categorieRepository.findDuplicateLibelle(typeIntervenantId, lotId, libelle)
                .ifPresent(existing -> {
                    if (currentId == null || !existing.getId().equals(currentId)) {
                        throw new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "Ce libellé de catégorie existe déjà dans ce périmètre"
                        );
                    }
                });
    }

    private CategorieEvaluation findCategorie(Long id) {
        return categorieRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Catégorie d’évaluation introuvable"
                ));
    }

    private TypeIntervenant findType(Long typeIntervenantId) {
        if (typeIntervenantId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le type d’intervenant est obligatoire"
            );
        }

        return typeRepository.findById(typeIntervenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Type d’intervenant introuvable"
                ));
    }

    private Lot findLotIfPresent(Long lotId, TypeIntervenant type) {
        if (lotId == null) {
            return null;
        }

        Lot lot = lotRepository.findById(lotId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Lot introuvable"
                ));

        if (
                lot.getTypeIntervenant() != null
                        && lot.getTypeIntervenant().getId() != null
                        && !lot.getTypeIntervenant().getId().equals(type.getId())
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ce lot n’appartient pas au type d’intervenant sélectionné"
            );
        }

        return lot;
    }

    private String normalizeCode(String code, String libelle) {
        String source = hasText(code) ? code : libelle;

        if (!hasText(source)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le code ou le libellé est obligatoire"
            );
        }

        String normalized = source.trim()
                .toUpperCase()
                .replace("É", "E")
                .replace("È", "E")
                .replace("Ê", "E")
                .replace("À", "A")
                .replace("Â", "A")
                .replace("Ç", "C")
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_|_$", "");

        return normalized.isBlank() ? "CATEGORIE" : normalized;
    }

    private String cleanRequired(String value, String message) {
        if (!hasText(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }

        return value.trim();
    }

    private String cleanNullable(String value) {
        return value == null ? null : value.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private CategorieEvaluationResponse toResponse(CategorieEvaluation categorie) {
        TypeIntervenant type = categorie.getTypeIntervenant();
        Lot lot = categorie.getLot();

        return CategorieEvaluationResponse.builder()
                .id(categorie.getId())
                .typeIntervenantId(type != null ? type.getId() : null)
                .typeIntervenantCode(type != null ? type.getCode() : null)
                .typeIntervenantLibelle(type != null ? type.getLibelle() : null)
                .lotId(lot != null ? lot.getId() : null)
                .lotCode(lot != null ? lot.getCodeLot() : null)
                .lotNom(lot != null ? lot.getNomLot() : null)
                .code(categorie.getCode())
                .libelle(categorie.getLibelle())
                .description(categorie.getDescription())
                .actif(categorie.getActif())
                .ordreAffichage(categorie.getOrdreAffichage())
                .createdAt(categorie.getCreatedAt())
                .updatedAt(categorie.getUpdatedAt())
                .build();
    }
}