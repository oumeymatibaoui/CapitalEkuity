package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.ChampAppreciationRequest;
import com.elemar.backendelemar.dto.ChampAppreciationResponse;
import com.elemar.backendelemar.entity.ChampAppreciation;
import com.elemar.backendelemar.entity.Lot;
import com.elemar.backendelemar.repository.ChampAppreciationRepository;
import com.elemar.backendelemar.repository.LotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChampAppreciationService {

    private final ChampAppreciationRepository champRepository;
    private final LotRepository lotRepository;

    @Transactional(readOnly = true)
    public List<ChampAppreciationResponse> getAllChamps() {
        return champRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChampAppreciationResponse> getChampsByLot(Long lotId) {
        return champRepository.findByLot_IdOrderByOrdreAffichageAsc(lotId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ChampAppreciationResponse getChampById(Long id) {
        return toResponse(findChamp(id));
    }

    @Transactional
    public ChampAppreciationResponse createChamp(ChampAppreciationRequest request) {
        Lot lot = findLot(request.getLotId());

        validateBeforeCreate(request);

        ChampAppreciation champ = ChampAppreciation.builder()
                .lot(lot)
                .section(clean(request.getSection()))
                .nomChamp(clean(request.getNomChamp()).toLowerCase())
                .labelChamp(clean(request.getLabelChamp()))
                .descriptionChamp(clean(request.getDescriptionChamp()))
                .modeleReponse(request.getModeleReponse())
                .typeChamp(clean(request.getTypeChamp()))
                .conditionProcedure(clean(request.getConditionProcedure()))
                .codePxx(clean(request.getCodePxx()).toUpperCase())
                .options(request.getOptions() == null ? "" : request.getOptions().trim())
                .obligatoire(request.getObligatoire())
                .ordreAffichage(request.getOrdreAffichage())
                .actif(request.getActif())
                .build();

        ChampAppreciation saved = champRepository.save(champ);

        return toResponse(saved);
    }

    @Transactional
    public ChampAppreciationResponse updateChamp(Long id, ChampAppreciationRequest request) {
        ChampAppreciation champ = findChamp(id);
        Lot lot = findLot(request.getLotId());

        validateBeforeUpdate(id, request);

        champ.setLot(lot);
        champ.setSection(clean(request.getSection()));
        champ.setNomChamp(clean(request.getNomChamp()).toLowerCase());
        champ.setLabelChamp(clean(request.getLabelChamp()));
        champ.setDescriptionChamp(clean(request.getDescriptionChamp()));
        champ.setModeleReponse(request.getModeleReponse());
        champ.setTypeChamp(clean(request.getTypeChamp()));
        champ.setConditionProcedure(clean(request.getConditionProcedure()));
        champ.setCodePxx(clean(request.getCodePxx()).toUpperCase());
        champ.setOptions(request.getOptions() == null ? "" : request.getOptions().trim());
        champ.setObligatoire(request.getObligatoire());
        champ.setOrdreAffichage(request.getOrdreAffichage());
        champ.setActif(request.getActif());

        ChampAppreciation saved = champRepository.save(champ);

        return toResponse(saved);
    }

    @Transactional
    public void deleteChamp(Long id) {
        ChampAppreciation champ = findChamp(id);
        champRepository.delete(champ);
    }

    private void validateBeforeCreate(ChampAppreciationRequest request) {
        String nomChamp = clean(request.getNomChamp()).toLowerCase();
        String codePxx = clean(request.getCodePxx()).toUpperCase();

        if (champRepository.existsByLot_IdAndNomChampIgnoreCase(
                request.getLotId(),
                nomChamp
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce champ existe déjà pour ce lot"
            );
        }

        if (champRepository.existsByLot_IdAndCodePxxIgnoreCase(
                request.getLotId(),
                codePxx
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce code Pxx existe déjà pour ce lot"
            );
        }
    }

    private void validateBeforeUpdate(Long id, ChampAppreciationRequest request) {
        String nomChamp = clean(request.getNomChamp()).toLowerCase();
        String codePxx = clean(request.getCodePxx()).toUpperCase();

        if (champRepository.existsByLot_IdAndNomChampIgnoreCaseAndIdNot(
                request.getLotId(),
                nomChamp,
                id
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce champ existe déjà pour ce lot"
            );
        }

        if (champRepository.existsByLot_IdAndCodePxxIgnoreCaseAndIdNot(
                request.getLotId(),
                codePxx,
                id
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce code Pxx existe déjà pour ce lot"
            );
        }
    }

    private ChampAppreciation findChamp(Long id) {
        return champRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Champ d'appréciation introuvable"
                ));
    }

    private Lot findLot(Long id) {
        return lotRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Lot introuvable"
                ));
    }

    private ChampAppreciationResponse toResponse(ChampAppreciation champ) {
        Lot lot = champ.getLot();

        return ChampAppreciationResponse.builder()
                .id(champ.getId())
                .lotId(lot.getId())
                .lotNom(lot.getNomLot())
                .section(champ.getSection())
                .nomChamp(champ.getNomChamp())
                .labelChamp(champ.getLabelChamp())
                .descriptionChamp(champ.getDescriptionChamp())
                .modeleReponse(champ.getModeleReponse())
                .typeChamp(champ.getTypeChamp())
                .conditionProcedure(champ.getConditionProcedure())
                .codePxx(champ.getCodePxx())
                .options(champ.getOptions())
                .obligatoire(champ.getObligatoire())
                .ordreAffichage(champ.getOrdreAffichage())
                .actif(champ.getActif())
                .build();
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}