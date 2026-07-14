package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.CritereEvaluationRequest;
import com.elemar.backendelemar.dto.CritereEvaluationResponse;
import com.elemar.backendelemar.dto.CriterePieceRequest;
import com.elemar.backendelemar.dto.CriterePieceResponse;
import com.elemar.backendelemar.entity.CategorieEvaluation;
import com.elemar.backendelemar.entity.CritereEvaluation;
import com.elemar.backendelemar.entity.CriterePiece;
import com.elemar.backendelemar.entity.GrilleEvaluationLot;
import com.elemar.backendelemar.entity.Lot;
import com.elemar.backendelemar.repository.CategorieEvaluationRepository;
import com.elemar.backendelemar.repository.CritereEvaluationRepository;
import com.elemar.backendelemar.repository.CriterePieceRepository;
import com.elemar.backendelemar.repository.GrilleEvaluationLotRepository;
import com.elemar.backendelemar.repository.LotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CritereEvaluationService {

    private final CritereEvaluationRepository critereEvaluationRepository;
    private final CriterePieceRepository criterePieceRepository;
    private final GrilleEvaluationLotRepository grilleEvaluationLotRepository;
    private final LotRepository lotRepository;
    private final CategorieEvaluationRepository categorieEvaluationRepository;

    @Transactional(readOnly = true)
    public List<CritereEvaluationResponse> getAll() {
        return critereEvaluationRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(
                        critere -> critere.getOrdreAffichage() == null
                                ? 0
                                : critere.getOrdreAffichage()
                ))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CritereEvaluationResponse getById(Long id) {
        return toResponse(findCritere(id));
    }

    @Transactional(readOnly = true)
    public List<String> getPieceNames() {
        return criterePieceRepository.findDistinctNomPieces();
    }

    @Transactional(readOnly = true)
    public List<CritereEvaluationResponse> getByLot(Long lotId) {
        return critereEvaluationRepository
                .findByLot_IdOrderByOrdreAffichageAsc(lotId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CritereEvaluationResponse> getActiveByLot(Long lotId) {
        return critereEvaluationRepository
                .findByLot_IdAndActifTrueOrderByOrdreAffichageAsc(lotId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalByLot(Long lotId) {
        return critereEvaluationRepository
                .findByLot_IdAndActifTrueOrderByOrdreAffichageAsc(lotId)
                .stream()
                .map(CritereEvaluation::getPointsMax)
                .filter(points -> points != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional(readOnly = true)
    public BigDecimal getResteByLot(Long lotId) {
        BigDecimal totalGrille = getTotalGrilleByLot(lotId);
        BigDecimal totalUtilise = getTotalByLot(lotId);

        return totalGrille.subtract(totalUtilise);
    }

    @Transactional
    public CritereEvaluationResponse create(CritereEvaluationRequest request) {
        Lot lot = findLot(request.getLotId());

        CategorieEvaluation categorie = findCategorieIfPresent(
                request.getCategorieEvaluationId(),
                lot
        );

        String sectionFinale = categorie != null
                ? categorie.getLibelle()
                : clean(request.getSection());

        GrilleEvaluationLot grille = findOrCreateGrille(
                request.getGrilleEvaluationLotId(),
                lot
        );

        BigDecimal points = safePoints(request.getPointsMax());

        validateTotalPointsForCreate(
                lot.getId(),
                grille,
                points,
                request.getActif()
        );

        CritereEvaluation critere = CritereEvaluation.builder()
                .grilleEvaluationLot(grille)
                .lot(lot)
                .categorieEvaluation(categorie)

                .codeCritere(cleanUpper(request.getCodeCritere()))
                .section(sectionFinale)
                .libelleCritere(clean(request.getLibelleCritere()))

                .labelCandidat(clean(request.getLabelCandidat()))
                .aideCandidat(clean(request.getAideCandidat()))
                .raisonDonnee(clean(request.getRaisonDonnee()))
                .noteCandidat(clean(request.getNoteCandidat()))

                .noteEvaluateur(clean(request.getNoteEvaluateur()))

                .pointsMax(points)
                .baremeNotation(clean(request.getBaremeNotation()))
                .typeNotation(defaultValue(request.getTypeNotation(), "MANUEL"))

                .typeChamp(defaultValue(request.getTypeChamp(), "TEXT"))
                .optionsChamp(clean(request.getOptionsChamp()))
                .obligatoire(request.getObligatoire() != null ? request.getObligatoire() : false)

                .ordreAffichage(request.getOrdreAffichage() != null ? request.getOrdreAffichage() : 0)
                .actif(request.getActif() != null ? request.getActif() : true)
                .build();

        CritereEvaluation saved = critereEvaluationRepository.save(critere);

        replacePieces(saved, request.getPieces());

        return toResponse(saved);
    }

    @Transactional
    public CritereEvaluationResponse update(Long id, CritereEvaluationRequest request) {
        CritereEvaluation critere = findCritere(id);

        Lot lot = findLot(request.getLotId());

        CategorieEvaluation categorie = findCategorieIfPresent(
                request.getCategorieEvaluationId(),
                lot
        );

        String sectionFinale = categorie != null
                ? categorie.getLibelle()
                : clean(request.getSection());

        GrilleEvaluationLot grille = findOrCreateGrille(
                request.getGrilleEvaluationLotId(),
                lot
        );

        BigDecimal points = safePoints(request.getPointsMax());

        validateTotalPointsForUpdate(
                lot.getId(),
                grille,
                points,
                request.getActif(),
                id
        );

        critere.setGrilleEvaluationLot(grille);
        critere.setLot(lot);
        critere.setCategorieEvaluation(categorie);

        critere.setCodeCritere(cleanUpper(request.getCodeCritere()));
        critere.setSection(sectionFinale);
        critere.setLibelleCritere(clean(request.getLibelleCritere()));

        critere.setLabelCandidat(clean(request.getLabelCandidat()));
        critere.setAideCandidat(clean(request.getAideCandidat()));
        critere.setRaisonDonnee(clean(request.getRaisonDonnee()));
        critere.setNoteCandidat(clean(request.getNoteCandidat()));

        critere.setNoteEvaluateur(clean(request.getNoteEvaluateur()));

        critere.setPointsMax(points);
        critere.setBaremeNotation(clean(request.getBaremeNotation()));
        critere.setTypeNotation(defaultValue(request.getTypeNotation(), "MANUEL"));

        critere.setTypeChamp(defaultValue(request.getTypeChamp(), "TEXT"));
        critere.setOptionsChamp(clean(request.getOptionsChamp()));
        critere.setObligatoire(request.getObligatoire() != null ? request.getObligatoire() : false);

        critere.setOrdreAffichage(request.getOrdreAffichage() != null ? request.getOrdreAffichage() : 0);
        critere.setActif(request.getActif() != null ? request.getActif() : true);

        CritereEvaluation saved = critereEvaluationRepository.save(critere);

        replacePieces(saved, request.getPieces());

        return toResponse(saved);
    }

    @Transactional
    public void deactivate(Long id) {
        CritereEvaluation critere = findCritere(id);
        critere.setActif(false);
        critereEvaluationRepository.save(critere);
    }

    @Transactional
    public CritereEvaluationResponse toggleActif(Long id) {
        CritereEvaluation critere = findCritere(id);

        Boolean current = critere.getActif() != null ? critere.getActif() : false;
        Boolean next = !current;

        if (next) {
            validateTotalPointsForUpdate(
                    critere.getLot().getId(),
                    critere.getGrilleEvaluationLot(),
                    safePoints(critere.getPointsMax()),
                    true,
                    critere.getId()
            );
        }

        critere.setActif(next);

        return toResponse(critereEvaluationRepository.save(critere));
    }

    @Transactional
    public void delete(Long id) {
        CritereEvaluation critere = findCritere(id);
        critereEvaluationRepository.delete(critere);
    }

    private void replacePieces(
            CritereEvaluation critere,
            List<CriterePieceRequest> pieces
    ) {
        List<CriterePiece> oldPieces =
                criterePieceRepository.findByCritereEvaluation_IdOrderByOrdreAffichageAsc(
                        critere.getId()
                );

        criterePieceRepository.deleteAll(oldPieces);

        if (pieces == null || pieces.isEmpty()) {
            return;
        }

        int ordre = 1;

        for (CriterePieceRequest request : pieces) {
            String nomPiece = clean(request.getNomPiece());

            if (nomPiece.isBlank()) {
                continue;
            }

            CriterePiece piece = CriterePiece.builder()
                    .critereEvaluation(critere)
                    .codePiece(
                            hasText(request.getCodePiece())
                                    ? cleanUpper(request.getCodePiece())
                                    : generatePieceCode(nomPiece)
                    )
                    .nomPiece(nomPiece)
                    .raisonPiece(clean(request.getRaisonPiece()))
                    .noteCandidat(clean(request.getNoteCandidat()))
                    .noteEvaluateur(clean(request.getNoteEvaluateur()))
                    .formatAccepte(
                            clean(request.getFormatAccepte()).isBlank()
                                    ? "PDF"
                                    : clean(request.getFormatAccepte())
                    )
                    .obligatoire(request.getObligatoire() != null ? request.getObligatoire() : true)
                    .conditionReponse(clean(request.getConditionReponse()))
                    .ordreAffichage(request.getOrdreAffichage() != null ? request.getOrdreAffichage() : ordre)
                    .actif(request.getActif() != null ? request.getActif() : true)
                    .build();

            criterePieceRepository.save(piece);
            ordre++;
        }
    }

    private CritereEvaluationResponse toResponse(CritereEvaluation critere) {
        List<CriterePieceResponse> pieces =
                criterePieceRepository.findByCritereEvaluation_IdOrderByOrdreAffichageAsc(
                                critere.getId()
                        )
                        .stream()
                        .map(this::toPieceResponse)
                        .toList();

        CategorieEvaluation categorie = critere.getCategorieEvaluation();

        return CritereEvaluationResponse.builder()
                .critereEvaluationId(critere.getId())

                .grilleEvaluationLotId(
                        critere.getGrilleEvaluationLot() != null
                                ? critere.getGrilleEvaluationLot().getId()
                                : null
                )

                .lotId(
                        critere.getLot() != null
                                ? critere.getLot().getId()
                                : null
                )
                .lotNom(
                        critere.getLot() != null
                                ? critere.getLot().getNomLot()
                                : null
                )

                .categorieEvaluationId(
                        categorie != null
                                ? categorie.getId()
                                : null
                )
                .categorieEvaluationCode(
                        categorie != null
                                ? categorie.getCode()
                                : null
                )
                .categorieEvaluationLibelle(
                        categorie != null
                                ? categorie.getLibelle()
                                : null
                )

                .codeCritere(critere.getCodeCritere())
                .section(critere.getSection())
                .libelleCritere(critere.getLibelleCritere())

                .labelCandidat(critere.getLabelCandidat())
                .aideCandidat(critere.getAideCandidat())
                .raisonDonnee(critere.getRaisonDonnee())
                .noteCandidat(critere.getNoteCandidat())

                .noteEvaluateur(critere.getNoteEvaluateur())

                .pointsMax(critere.getPointsMax())
                .baremeNotation(critere.getBaremeNotation())
                .typeNotation(critere.getTypeNotation())

                .typeChamp(critere.getTypeChamp())
                .optionsChamp(critere.getOptionsChamp())
                .obligatoire(critere.getObligatoire())

                .ordreAffichage(critere.getOrdreAffichage())
                .actif(critere.getActif())

                .pieces(pieces)
                .build();
    }

    private CriterePieceResponse toPieceResponse(CriterePiece piece) {
        return CriterePieceResponse.builder()
                .id(piece.getId())
                .critereEvaluationId(
                        piece.getCritereEvaluation() != null
                                ? piece.getCritereEvaluation().getId()
                                : null
                )
                .codePiece(piece.getCodePiece())
                .nomPiece(piece.getNomPiece())
                .raisonPiece(piece.getRaisonPiece())
                .noteCandidat(piece.getNoteCandidat())
                .noteEvaluateur(piece.getNoteEvaluateur())
                .formatAccepte(piece.getFormatAccepte())
                .obligatoire(piece.getObligatoire())
                .conditionReponse(piece.getConditionReponse())
                .ordreAffichage(piece.getOrdreAffichage())
                .actif(piece.getActif())
                .build();
    }

    private CritereEvaluation findCritere(Long id) {
        return critereEvaluationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Critère d'évaluation introuvable"
                ));
    }

    private Lot findLot(Long lotId) {
        if (lotId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le lot est obligatoire pour un critère d'évaluation"
            );
        }

        return lotRepository.findById(lotId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Lot introuvable"
                ));
    }

    private CategorieEvaluation findCategorieIfPresent(
            Long categorieId,
            Lot lot
    ) {
        if (categorieId == null) {
            return null;
        }

        CategorieEvaluation categorie = categorieEvaluationRepository.findById(categorieId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Catégorie d’évaluation introuvable"
                ));

        if (
                categorie.getTypeIntervenant() != null
                        && lot.getTypeIntervenant() != null
                        && !categorie.getTypeIntervenant().getId()
                        .equals(lot.getTypeIntervenant().getId())
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La catégorie ne correspond pas au type du lot"
            );
        }

        if (
                categorie.getLot() != null
                        && !categorie.getLot().getId().equals(lot.getId())
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La catégorie ne correspond pas au lot sélectionné"
            );
        }

        return categorie;
    }

    private GrilleEvaluationLot findOrCreateGrille(
            Long grilleId,
            Lot lot
    ) {
        if (grilleId != null) {
            return grilleEvaluationLotRepository.findById(grilleId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Grille d'évaluation introuvable"
                    ));
        }

        return grilleEvaluationLotRepository.findFirstByLot_IdAndActifTrue(lot.getId())
                .orElseGet(() -> {
                    GrilleEvaluationLot grille = GrilleEvaluationLot.builder()
                            .lot(lot)
                            .codeGrille("GRILLE-" + cleanUpper(lot.getNomLot()))
                            .nomGrille("Grille d'évaluation - " + lot.getNomLot())
                            .description("Grille générée automatiquement pour le lot " + lot.getNomLot())
                            .totalPoints(BigDecimal.valueOf(100))
                            .seuilAdmission(BigDecimal.valueOf(80))
                            .actif(true)
                            .build();

                    return grilleEvaluationLotRepository.save(grille);
                });
    }

    private BigDecimal getTotalGrilleByLot(Long lotId) {
        return grilleEvaluationLotRepository.findFirstByLot_IdAndActifTrue(lotId)
                .map(GrilleEvaluationLot::getTotalPoints)
                .orElse(BigDecimal.valueOf(100));
    }

    private void validateTotalPointsForCreate(
            Long lotId,
            GrilleEvaluationLot grille,
            BigDecimal newPoints,
            Boolean actif
    ) {
        if (Boolean.FALSE.equals(actif)) {
            return;
        }

        BigDecimal currentTotal = getTotalByLot(lotId);
        BigDecimal newTotal = currentTotal.add(newPoints);
        BigDecimal max = grille.getTotalPoints() != null
                ? grille.getTotalPoints()
                : BigDecimal.valueOf(100);

        if (newTotal.compareTo(max) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Total des points du lot dépassé. Total actuel : "
                            + currentTotal
                            + ", nouveau total : "
                            + newTotal
                            + ", maximum : "
                            + max
            );
        }
    }

    private void validateTotalPointsForUpdate(
            Long lotId,
            GrilleEvaluationLot grille,
            BigDecimal newPoints,
            Boolean actif,
            Long currentCritereId
    ) {
        if (Boolean.FALSE.equals(actif)) {
            return;
        }

        BigDecimal currentTotalWithoutThis =
                critereEvaluationRepository.findByLot_IdAndActifTrueOrderByOrdreAffichageAsc(lotId)
                        .stream()
                        .filter(critere -> !critere.getId().equals(currentCritereId))
                        .map(CritereEvaluation::getPointsMax)
                        .filter(points -> points != null)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal newTotal = currentTotalWithoutThis.add(newPoints);
        BigDecimal max = grille.getTotalPoints() != null
                ? grille.getTotalPoints()
                : BigDecimal.valueOf(100);

        if (newTotal.compareTo(max) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Total des points du lot dépassé. Total sans ce critère : "
                            + currentTotalWithoutThis
                            + ", nouveau total : "
                            + newTotal
                            + ", maximum : "
                            + max
            );
        }
    }

    private String generatePieceCode(String nomPiece) {
        if (!hasText(nomPiece)) {
            return "PIECE";
        }

        String cleaned = nomPiece
                .trim()
                .toUpperCase()
                .replace("É", "E")
                .replace("È", "E")
                .replace("Ê", "E")
                .replace("À", "A")
                .replace("Â", "A")
                .replace("Ç", "C")
                .replace("Ù", "U")
                .replace("Û", "U")
                .replace("Î", "I")
                .replace("Ï", "I")
                .replaceAll("[^A-Z0-9]+", "-")
                .replaceAll("^-|-$", "");

        if (cleaned.length() > 25) {
            cleaned = cleaned.substring(0, 25);
        }

        return cleaned.isBlank() ? "PIECE" : cleaned;
    }

    private BigDecimal safePoints(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String cleanUpper(String value) {
        return clean(value).toUpperCase();
    }

    private String defaultValue(String value, String defaultValue) {
        String cleaned = clean(value);
        return cleaned.isBlank() ? defaultValue : cleaned;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}