package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.*;
import com.elemar.backendelemar.entity.CritereEvaluation;
import com.elemar.backendelemar.entity.CriterePiece;
import com.elemar.backendelemar.entity.Lot;
import com.elemar.backendelemar.repository.CritereEvaluationRepository;
import com.elemar.backendelemar.repository.CriterePieceRepository;
import com.elemar.backendelemar.repository.LotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
@Service
@RequiredArgsConstructor
public class CandidatFormulaireEvaluationService {

    private final LotRepository lotRepository;
    private final CritereEvaluationRepository critereEvaluationRepository;
    private final CriterePieceRepository criterePieceRepository;

    @Transactional(readOnly = true)
    public FormulaireLotCandidatResponse getFormulaireByLot(Long lotId) {

        Lot lot = lotRepository.findById(lotId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Lot introuvable"
                ));

        List<CritereEvaluation> criteres =
                critereEvaluationRepository.findByLot_IdAndActifTrueOrderByOrdreAffichageAsc(lotId);

        Map<String, List<CritereFormulaireCandidatResponse>> sections = new LinkedHashMap<>();

        for (CritereEvaluation critere : criteres) {
            String section = critere.getSection();

            if (section == null || section.isBlank()) {
                section = "Autres critères";
            }

            sections
                    .computeIfAbsent(section, key -> new ArrayList<>())
                    .add(toCritereCandidat(critere));
        }

        List<SectionFormulaireCandidatResponse> sectionResponses =
                sections.entrySet()
                        .stream()
                        .map(entry -> SectionFormulaireCandidatResponse.builder()
                                .section(entry.getKey())
                                .criteres(entry.getValue())
                                .build())
                        .toList();

        return FormulaireLotCandidatResponse.builder()
                .lotId(lot.getId())
                .nomLot(lot.getNomLot())
                .sections(sectionResponses)
                .build();
    }

    private CritereFormulaireCandidatResponse toCritereCandidat(CritereEvaluation critere) {

        List<PieceFormulaireCandidatResponse> pieces =
                criterePieceRepository
                        .findByCritereEvaluation_IdAndActifTrueOrderByOrdreAffichageAsc(critere.getId())
                        .stream()
                        .map(this::toPieceCandidat)
                        .toList();

        return CritereFormulaireCandidatResponse.builder()
                .id(critere.getId())
                .codeCritere(critere.getCodeCritere())
                .labelCandidat(critere.getLabelCandidat())
                .aideCandidat(critere.getAideCandidat())
                .raisonDonnee(critere.getRaisonDonnee())
                .noteCandidat(critere.getNoteCandidat())
                .typeChamp(critere.getTypeChamp())
                .optionsChamp(critere.getOptionsChamp())
                .obligatoire(critere.getObligatoire())
                .ordreAffichage(critere.getOrdreAffichage())
                .pieces(pieces)
                .build();
    }

    private PieceFormulaireCandidatResponse toPieceCandidat(CriterePiece piece) {
        return PieceFormulaireCandidatResponse.builder()
                .id(piece.getId())
                .codePiece(piece.getCodePiece())
                .nomPiece(piece.getNomPiece())
                .raisonPiece(piece.getRaisonPiece())
                .noteCandidat(piece.getNoteCandidat())
                .formatAccepte(piece.getFormatAccepte())
                .obligatoire(piece.getObligatoire())
                .conditionReponse(piece.getConditionReponse())
                .ordreAffichage(piece.getOrdreAffichage())
                .build();
    }
}