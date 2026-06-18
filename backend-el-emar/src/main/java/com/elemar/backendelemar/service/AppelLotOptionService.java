package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.AppelLotOptionResponse;
import com.elemar.backendelemar.entity.AppelLot;
import com.elemar.backendelemar.repository.AppelLotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppelLotOptionService {

    private final AppelLotRepository appelLotRepository;

    @Transactional(readOnly = true)
    public List<AppelLotOptionResponse> getOptions() {
        return appelLotRepository.findAllWithAppelAndLot()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private AppelLotOptionResponse toResponse(AppelLot appelLot) {
        String appelTitre = appelLot.getAppel().getTitre();
        String lotNom = appelLot.getLot().getNomLot();

        return AppelLotOptionResponse.builder()
                .appelLotId(appelLot.getId())
                .appelId(appelLot.getAppel().getId())
                .appelTitre(appelTitre)
                .lotId(appelLot.getLot().getId())
                .lotNom(lotNom)
                .label(appelTitre + " — " + lotNom)
                .build();
    }
}