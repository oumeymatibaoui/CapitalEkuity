package com.elemar.backendelemar.service;
import java.util.UUID;
import com.elemar.backendelemar.dto.*;
import com.elemar.backendelemar.entity.*;
import com.elemar.backendelemar.enums.StatutApplication;
import com.elemar.backendelemar.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
@Slf4j
@Service
@RequiredArgsConstructor
public class CandidatFormulaireSauvegardeService {

    private final CandidatureRepository candidatureRepository;
    private final LotRepository lotRepository;
    private final ApplicationCandidatureRepository applicationCandidatureRepository;
    private final CritereEvaluationRepository critereEvaluationRepository;
    private final CriterePieceRepository criterePieceRepository;
    private final ReponseCritereRepository reponseCritereRepository;
    private final PieceCritereDeposeeRepository pieceCritereDeposeeRepository;

    @Transactional
    public ApplicationCandidature getOrCreateApplication(Long candidatureId, Long lotId) {
        return applicationCandidatureRepository
                .findByCandidature_IdAndLot_Id(candidatureId, lotId)
                .orElseGet(() -> {
                    Candidature candidature = candidatureRepository.findById(candidatureId)
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Candidature introuvable"
                            ));

                    Lot lot = lotRepository.findById(lotId)
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Lot introuvable"
                            ));

                    ApplicationCandidature application = new ApplicationCandidature();
                    application.setCandidature(candidature);
                    application.setLot(lot);
                    application.setStatut(StatutApplication.BROUILLON);
                    application.setDateCreation(java.time.LocalDateTime.now());
                    application.setTauxCompletion(java.math.BigDecimal.ZERO);
                    application.setPhase1Validee(false);

                    return applicationCandidatureRepository.save(application);
                });
    }

    @Transactional
    public FormulaireLotSavedResponse saveReponses(
            Long candidatureId,
            Long lotId,
            FormulaireLotSaveRequest request
    ) {
        ApplicationCandidature application = getOrCreateApplication(candidatureId, lotId);

        if (request.getReponses() != null) {
            for (ReponseCritereSaveRequest item : request.getReponses()) {
                if (item.getCritereId() == null) {
                    continue;
                }

                CritereEvaluation critere = critereEvaluationRepository.findById(item.getCritereId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Critère introuvable"
                        ));

                if (critere.getLot() != null && !critere.getLot().getId().equals(lotId)) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Ce critère ne correspond pas au lot sélectionné"
                    );
                }

                ReponseCritere reponse = reponseCritereRepository
                        .findByApplicationCandidature_IdAndCritereEvaluation_Id(
                                application.getId(),
                                critere.getId()
                        )
                        .orElseGet(() -> {
                            ReponseCritere r = new ReponseCritere();
                            r.setCandidature(application.getCandidature());
                            r.setApplicationCandidature(application);
                            r.setCritereEvaluation(critere);
                            return r;
                        });

                fillReponseValue(reponse, critere, item.getValeur());

                reponseCritereRepository.save(reponse);
            }
        }

        return getSavedFormulaire(candidatureId, lotId);
    }

    @Transactional
    public PieceCritereDeposeeResponse uploadPieceCritere(
            Long candidatureId,
            Long lotId,
            Long criterePieceId,
            MultipartFile file
    ) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Fichier vide"
            );
        }

        ApplicationCandidature application = getOrCreateApplication(candidatureId, lotId);

        CriterePiece criterePiece = criterePieceRepository.findById(criterePieceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Pièce critère introuvable : " + criterePieceId
                ));

        try {
            Path uploadDir = Path.of(System.getProperty("user.dir"))
                    .resolve("uploads")
                    .resolve("candidatures")
                    .resolve(String.valueOf(candidatureId))
                    .resolve("applications")
                    .resolve(String.valueOf(application.getId()))
                    .resolve("pieces-criteres");

            Files.createDirectories(uploadDir);

            String originalName = file.getOriginalFilename() != null
                    ? file.getOriginalFilename()
                    : "piece.pdf";

            String extension = "";

            int dotIndex = originalName.lastIndexOf(".");
            if (dotIndex >= 0) {
                extension = originalName.substring(dotIndex);
            }

            String baseName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");

            String safeName =
                    "piece_"
                            + criterePieceId
                            + "_"
                            + UUID.randomUUID()
                            + "_"
                            + baseName;

            Path filePath = uploadDir.resolve(safeName);

            Files.copy(
                    file.getInputStream(),
                    filePath,
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING
            );

            PieceCritereDeposee piece = pieceCritereDeposeeRepository
                    .findByApplicationCandidature_IdAndCriterePiece_Id(
                            application.getId(),
                            criterePiece.getId()
                    )
                    .orElseGet(() -> {
                        PieceCritereDeposee p = new PieceCritereDeposee();
                        p.setCandidature(application.getCandidature());
                        p.setApplicationCandidature(application);
                        p.setCriterePiece(criterePiece);
                        return p;
                    });

            piece.setNomFichier(originalName);
            piece.setCheminFichier(filePath.toString());
            piece.setTypeContenu(file.getContentType());
            piece.setTailleFichier(file.getSize());
            piece.setStatut("DEPOSE");

            PieceCritereDeposee saved = pieceCritereDeposeeRepository.save(piece);

            return PieceCritereDeposeeResponse.builder()
                    .criterePieceId(saved.getCriterePiece().getId())
                    .nomFichier(saved.getNomFichier())
                    .statut(saved.getStatut())
                    .build();

        } catch (Exception e) {
            log.error(
                    "ERREUR UPLOAD PIECE CRITERE | candidatureId={} | lotId={} | criterePieceId={} | file={}",
                    candidatureId,
                    lotId,
                    criterePieceId,
                    file.getOriginalFilename(),
                    e
            );

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur upload pièce critère : " + e.getMessage()
            );
        }
    }

    @Transactional(readOnly = true)
    public FormulaireLotSavedResponse getSavedFormulaire(Long candidatureId, Long lotId) {
        ApplicationCandidature application = applicationCandidatureRepository
                .findByCandidature_IdAndLot_Id(candidatureId, lotId)
                .orElse(null);

        if (application == null) {
            return FormulaireLotSavedResponse.builder()
                    .candidatureId(candidatureId)
                    .applicationCandidatureId(null)
                    .lotId(lotId)
                    .reponses(List.of())
                    .pieces(List.of())
                    .build();
        }

        List<ReponseCritereSavedResponse> reponses =
                reponseCritereRepository.findByApplicationCandidature_Id(application.getId())
                        .stream()
                        .map(this::toReponseSaved)
                        .toList();

        List<PieceCritereDeposeeResponse> pieces =
                pieceCritereDeposeeRepository.findByApplicationCandidature_Id(application.getId())
                        .stream()
                        .map(piece -> PieceCritereDeposeeResponse.builder()
                                .criterePieceId(piece.getCriterePiece().getId())
                                .nomFichier(piece.getNomFichier())
                                .statut(piece.getStatut())
                                .build())
                        .toList();

        return FormulaireLotSavedResponse.builder()
                .candidatureId(candidatureId)
                .applicationCandidatureId(application.getId())
                .lotId(lotId)
                .reponses(reponses)
                .pieces(pieces)
                .build();
    }

    @Transactional(readOnly = true)
    public List<Long> getLotsRemplis(Long candidatureId) {
        return applicationCandidatureRepository.findByCandidature_Id(candidatureId)
                .stream()
                .map(app -> app.getLot().getId())
                .distinct()
                .toList();
    }

    private void fillReponseValue(
            ReponseCritere reponse,
            CritereEvaluation critere,
            String value
    ) {
        String type = critere.getTypeChamp() != null
                ? critere.getTypeChamp().trim().toUpperCase()
                : "TEXT";

        reponse.setValeurText(null);
        reponse.setValeurNumber(null);
        reponse.setValeurBoolean(null);
        reponse.setValeurDate(null);

        if (value == null || value.isBlank()) {
            return;
        }

        switch (type) {
            case "NUMBER" -> reponse.setValeurNumber(new BigDecimal(value));
            case "BOOLEAN" -> reponse.setValeurBoolean(Boolean.parseBoolean(value));
            case "DATE" -> reponse.setValeurDate(LocalDate.parse(value));
            default -> reponse.setValeurText(value);
        }
    }

    private ReponseCritereSavedResponse toReponseSaved(ReponseCritere reponse) {
        String value = "";

        if (reponse.getValeurText() != null) {
            value = reponse.getValeurText();
        } else if (reponse.getValeurNumber() != null) {
            value = reponse.getValeurNumber().toPlainString();
        } else if (reponse.getValeurBoolean() != null) {
            value = String.valueOf(reponse.getValeurBoolean());
        } else if (reponse.getValeurDate() != null) {
            value = reponse.getValeurDate().toString();
        }

        return ReponseCritereSavedResponse.builder()
                .critereId(reponse.getCritereEvaluation().getId())
                .valeur(value)
                .build();
    }
}