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

    private static final BigDecimal TOTAL_POINTS_PAR_DEFAUT = BigDecimal.valueOf(100);
    private static final BigDecimal SEUIL_ADMISSION_PAR_DEFAUT = BigDecimal.valueOf(80);

    private final CritereEvaluationRepository critereEvaluationRepository;
    private final CriterePieceRepository criterePieceRepository;
    private final GrilleEvaluationLotRepository grilleEvaluationLotRepository;
    private final LotRepository lotRepository;
    private final CategorieEvaluationRepository categorieEvaluationRepository;

    /* =====================================================
       CONSULTATION
    ===================================================== */

    @Transactional(readOnly = true)
    public List<CritereEvaluationResponse> getAll() {
        return critereEvaluationRepository.findAll()
                .stream()
                .sorted(
                        Comparator.comparing(
                                critere -> critere.getOrdreAffichage() == null
                                        ? 0
                                        : critere.getOrdreAffichage()
                        )
                )
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
        requireLotId(lotId);

        return critereEvaluationRepository
                .findByLot_IdOrderByOrdreAffichageAsc(lotId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CritereEvaluationResponse> getActiveByLot(Long lotId) {
        requireLotId(lotId);

        return critereEvaluationRepository
                .findByLot_IdAndActifTrueOrderByOrdreAffichageAsc(lotId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalByLot(Long lotId) {
        if (lotId == null) {
            return BigDecimal.ZERO;
        }

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
        BigDecimal reste = totalGrille.subtract(totalUtilise);

        return reste.compareTo(BigDecimal.ZERO) < 0
                ? BigDecimal.ZERO
                : reste;
    }

    /* =====================================================
       CRÉATION
    ===================================================== */

    @Transactional
    public CritereEvaluationResponse create(CritereEvaluationRequest request) {
        validateRequest(request);

        Lot lot = findLot(request.getLotId());
        CategorieEvaluation categorie = findCategorieRequired(
                request.getCategorieEvaluationId(),
                lot
        );

        GrilleEvaluationLot grille = findOrCreateGrille(
                request.getGrilleEvaluationLotId(),
                lot
        );

        validateGrilleMatchesLot(grille, lot);

        BigDecimal points = safePoints(request.getPointsMax());
        Boolean actif = request.getActif() != null ? request.getActif() : true;

        validateTotalPointsForCreate(
                lot.getId(),
                grille,
                points,
                actif
        );

        String libelleCritere = cleanRequired(
                request.getLibelleCritere(),
                "Le libellé du critère est obligatoire"
        );

        String typeChamp = resolveTypeChamp(request.getTypeChamp());
        String typeNotation = resolveTypeNotation(
                request.getTypeNotation(),
                typeChamp
        );

        CritereEvaluation critere = CritereEvaluation.builder()
                .grilleEvaluationLot(grille)
                .lot(lot)
                .categorieEvaluation(categorie)

                /*
                 * IMPORTANT : la colonne section est NOT NULL en base.
                 * L'utilisateur ne la saisit plus : elle est automatiquement
                 * synchronisée avec la catégorie choisie.
                 */
                .section(resolveSection(categorie))

                .codeCritere(cleanUpper(request.getCodeCritere()))
                .libelleCritere(libelleCritere)

                /*
                 * Si aucun label candidat n'est saisi, le libellé métier
                 * devient automatiquement le label affiché au candidat.
                 */
                .labelCandidat(
                        hasText(request.getLabelCandidat())
                                ? request.getLabelCandidat().trim()
                                : libelleCritere
                )
                .aideCandidat(cleanNullable(request.getAideCandidat()))
                .raisonDonnee(cleanNullable(request.getRaisonDonnee()))
                .noteCandidat(cleanNullable(request.getNoteCandidat()))
                .noteEvaluateur(cleanNullable(request.getNoteEvaluateur()))

                .pointsMax(points)
                .baremeNotation(cleanNullable(request.getBaremeNotation()))
                .typeNotation(typeNotation)

                .typeChamp(typeChamp)
                .optionsChamp(cleanNullable(request.getOptionsChamp()))
                .obligatoire(request.getObligatoire() == null
                        || Boolean.TRUE.equals(request.getObligatoire()))

                .ordreAffichage(resolveCreateOrder(lot.getId(), request.getOrdreAffichage()))
                .actif(actif)
                .build();

        CritereEvaluation saved = critereEvaluationRepository.save(critere);

        replacePieces(saved, request.getPieces());

        return toResponse(saved);
    }

    /* =====================================================
       MODIFICATION
    ===================================================== */

    @Transactional
    public CritereEvaluationResponse update(
            Long id,
            CritereEvaluationRequest request
    ) {
        validateRequest(request);

        CritereEvaluation critere = findCritere(id);
        Lot lot = findLot(request.getLotId());

        CategorieEvaluation categorie = findCategorieRequired(
                request.getCategorieEvaluationId(),
                lot
        );

        GrilleEvaluationLot grille = findOrCreateGrille(
                request.getGrilleEvaluationLotId(),
                lot
        );

        validateGrilleMatchesLot(grille, lot);

        BigDecimal points = safePoints(request.getPointsMax());
        Boolean actif = request.getActif() != null
                ? request.getActif()
                : Boolean.TRUE.equals(critere.getActif());

        validateTotalPointsForUpdate(
                lot.getId(),
                grille,
                points,
                actif,
                id
        );

        String libelleCritere = cleanRequired(
                request.getLibelleCritere(),
                "Le libellé du critère est obligatoire"
        );

        String typeChamp = resolveTypeChamp(request.getTypeChamp());
        String typeNotation = resolveTypeNotation(
                request.getTypeNotation(),
                typeChamp
        );

        critere.setGrilleEvaluationLot(grille);
        critere.setLot(lot);
        critere.setCategorieEvaluation(categorie);

        /* Synchronisation automatique avec la catégorie. */
        critere.setSection(resolveSection(categorie));

        critere.setCodeCritere(cleanUpper(request.getCodeCritere()));
        critere.setLibelleCritere(libelleCritere);

        critere.setLabelCandidat(
                hasText(request.getLabelCandidat())
                        ? request.getLabelCandidat().trim()
                        : libelleCritere
        );
        critere.setAideCandidat(cleanNullable(request.getAideCandidat()));
        critere.setRaisonDonnee(cleanNullable(request.getRaisonDonnee()));
        critere.setNoteCandidat(cleanNullable(request.getNoteCandidat()));
        critere.setNoteEvaluateur(cleanNullable(request.getNoteEvaluateur()));

        critere.setPointsMax(points);
        critere.setBaremeNotation(cleanNullable(request.getBaremeNotation()));
        critere.setTypeNotation(typeNotation);

        critere.setTypeChamp(typeChamp);
        critere.setOptionsChamp(cleanNullable(request.getOptionsChamp()));
        critere.setObligatoire(
                request.getObligatoire() == null
                        ? Boolean.TRUE.equals(critere.getObligatoire())
                        : Boolean.TRUE.equals(request.getObligatoire())
        );

        if (request.getOrdreAffichage() != null
                && request.getOrdreAffichage() > 0) {
            critere.setOrdreAffichage(request.getOrdreAffichage());
        }

        critere.setActif(actif);

        CritereEvaluation saved = critereEvaluationRepository.save(critere);

        replacePieces(saved, request.getPieces());

        return toResponse(saved);
    }

    /* =====================================================
       ACTIVATION / SUPPRESSION
    ===================================================== */

    @Transactional
    public void deactivate(Long id) {
        CritereEvaluation critere = findCritere(id);
        critere.setActif(false);
        critereEvaluationRepository.save(critere);
    }

    @Transactional
    public CritereEvaluationResponse toggleActif(Long id) {
        CritereEvaluation critere = findCritere(id);

        boolean current = Boolean.TRUE.equals(critere.getActif());
        boolean next = !current;

        if (next) {
            GrilleEvaluationLot grille = critere.getGrilleEvaluationLot();

            if (grille == null) {
                grille = findOrCreateGrille(null, critere.getLot());
                critere.setGrilleEvaluationLot(grille);
            }

            validateTotalPointsForUpdate(
                    critere.getLot().getId(),
                    grille,
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

        List<CriterePiece> pieces = criterePieceRepository
                .findByCritereEvaluation_IdOrderByOrdreAffichageAsc(id);

        if (!pieces.isEmpty()) {
            criterePieceRepository.deleteAll(pieces);
        }

        critereEvaluationRepository.delete(critere);
    }

    /* =====================================================
       PIÈCES
    ===================================================== */

    private void replacePieces(
            CritereEvaluation critere,
            List<CriterePieceRequest> pieces
    ) {
        List<CriterePiece> oldPieces = criterePieceRepository
                .findByCritereEvaluation_IdOrderByOrdreAffichageAsc(
                        critere.getId()
                );

        if (!oldPieces.isEmpty()) {
            criterePieceRepository.deleteAll(oldPieces);
        }

        if (pieces == null || pieces.isEmpty()) {
            return;
        }

        int ordreParDefaut = 1;

        for (CriterePieceRequest request : pieces) {
            if (request == null) {
                continue;
            }

            String nomPiece = clean(request.getNomPiece());

            if (nomPiece.isBlank()) {
                continue;
            }

            String format = clean(request.getFormatAccepte());

            CriterePiece piece = CriterePiece.builder()
                    .critereEvaluation(critere)
                    .codePiece(
                            hasText(request.getCodePiece())
                                    ? cleanUpper(request.getCodePiece())
                                    : generatePieceCode(nomPiece)
                    )
                    .nomPiece(nomPiece)
                    .raisonPiece(cleanNullable(request.getRaisonPiece()))
                    .noteCandidat(cleanNullable(request.getNoteCandidat()))
                    .noteEvaluateur(cleanNullable(request.getNoteEvaluateur()))
                    .formatAccepte(format.isBlank() ? "PDF" : format)
                    .obligatoire(
                            request.getObligatoire() != null
                                    ? request.getObligatoire()
                                    : true
                    )
                    .conditionReponse(cleanNullable(request.getConditionReponse()))
                    .ordreAffichage(
                            request.getOrdreAffichage() != null
                                    ? request.getOrdreAffichage()
                                    : ordreParDefaut
                    )
                    .actif(
                            request.getActif() != null
                                    ? request.getActif()
                                    : true
                    )
                    .build();

            criterePieceRepository.save(piece);
            ordreParDefaut++;
        }
    }

    /* =====================================================
       MAPPING RESPONSE
    ===================================================== */

    private CritereEvaluationResponse toResponse(CritereEvaluation critere) {
        List<CriterePieceResponse> pieces = criterePieceRepository
                .findByCritereEvaluation_IdOrderByOrdreAffichageAsc(
                        critere.getId()
                )
                .stream()
                .map(this::toPieceResponse)
                .toList();

        CategorieEvaluation categorie = critere.getCategorieEvaluation();

        String section = hasText(critere.getSection())
                ? critere.getSection().trim()
                : categorie != null
                ? cleanNullable(categorie.getLibelle())
                : null;

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
                        categorie != null ? categorie.getId() : null
                )
                .categorieEvaluationCode(
                        categorie != null ? categorie.getCode() : null
                )
                .categorieEvaluationLibelle(
                        categorie != null ? categorie.getLibelle() : null
                )
                .codeCritere(critere.getCodeCritere())
                .section(section)
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

    /* =====================================================
       RECHERCHE ET VALIDATION
    ===================================================== */

    private CritereEvaluation findCritere(Long id) {
        if (id == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "L'identifiant du critère est obligatoire"
            );
        }

        return critereEvaluationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Critère d'évaluation introuvable"
                ));
    }

    private Lot findLot(Long lotId) {
        requireLotId(lotId);

        return lotRepository.findById(lotId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Lot introuvable"
                ));
    }

    private void requireLotId(Long lotId) {
        if (lotId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le lot est obligatoire"
            );
        }
    }

    private CategorieEvaluation findCategorieRequired(
            Long categorieId,
            Lot lot
    ) {
        if (categorieId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La catégorie d'évaluation est obligatoire"
            );
        }

        CategorieEvaluation categorie = categorieEvaluationRepository
                .findById(categorieId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Catégorie d'évaluation introuvable"
                ));

        validateCategorieForLot(categorie, lot);
        return categorie;
    }

    private void validateCategorieForLot(
            CategorieEvaluation categorie,
            Lot lot
    ) {
        if (!Boolean.TRUE.equals(categorie.getActif())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La catégorie sélectionnée est désactivée"
            );
        }

        if (categorie.getTypeIntervenant() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La catégorie ne possède pas de type d'intervenant"
            );
        }

        if (lot.getTypeIntervenant() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le lot ne possède pas de type d'intervenant"
            );
        }

        if (!categorie.getTypeIntervenant().getId()
                .equals(lot.getTypeIntervenant().getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La catégorie ne correspond pas au type du lot"
            );
        }

        if (categorie.getLot() != null
                && !categorie.getLot().getId().equals(lot.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La catégorie ne correspond pas au lot sélectionné"
            );
        }
    }

    private void validateRequest(CritereEvaluationRequest request) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations du critère sont obligatoires"
            );
        }

        if (request.getLotId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le lot est obligatoire"
            );
        }

        if (request.getCategorieEvaluationId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La catégorie est obligatoire"
            );
        }

        if (!hasText(request.getLibelleCritere())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le libellé du critère est obligatoire"
            );
        }

        if (request.getPointsMax() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nombre de points est obligatoire"
            );
        }

        if (request.getPointsMax().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nombre de points doit être supérieur à zéro"
            );
        }

        String typeChamp = resolveTypeChamp(request.getTypeChamp());

        if ("SELECT".equals(typeChamp)
                && !hasText(request.getOptionsChamp())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les options sont obligatoires pour un champ de type liste"
            );
        }
    }

    /* =====================================================
       GRILLE ET TOTAL DES POINTS
    ===================================================== */

    private GrilleEvaluationLot findOrCreateGrille(
            Long grilleId,
            Lot lot
    ) {
        if (grilleId != null) {
            return grilleEvaluationLotRepository
                    .findById(grilleId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Grille d'évaluation introuvable"
                    ));
        }

        return grilleEvaluationLotRepository
                .findFirstByLot_IdAndActifTrue(lot.getId())
                .orElseGet(() -> {
                    GrilleEvaluationLot grille = GrilleEvaluationLot.builder()
                            .lot(lot)
                            .codeGrille("GRILLE-" + cleanUpper(lot.getNomLot()))
                            .nomGrille("Grille d'évaluation - " + lot.getNomLot())
                            .description(
                                    "Grille générée automatiquement pour le lot "
                                            + lot.getNomLot()
                            )
                            .totalPoints(TOTAL_POINTS_PAR_DEFAUT)
                            .seuilAdmission(SEUIL_ADMISSION_PAR_DEFAUT)
                            .actif(true)
                            .build();

                    return grilleEvaluationLotRepository.save(grille);
                });
    }

    private void validateGrilleMatchesLot(
            GrilleEvaluationLot grille,
            Lot lot
    ) {
        if (grille == null
                || grille.getLot() == null
                || !grille.getLot().getId().equals(lot.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La grille ne correspond pas au lot sélectionné"
            );
        }
    }

    private BigDecimal getTotalGrilleByLot(Long lotId) {
        if (lotId == null) {
            return TOTAL_POINTS_PAR_DEFAUT;
        }

        return grilleEvaluationLotRepository
                .findFirstByLot_IdAndActifTrue(lotId)
                .map(GrilleEvaluationLot::getTotalPoints)
                .filter(points -> points != null)
                .orElse(TOTAL_POINTS_PAR_DEFAUT);
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
        BigDecimal maximum = grille.getTotalPoints() != null
                ? grille.getTotalPoints()
                : TOTAL_POINTS_PAR_DEFAUT;

        if (newTotal.compareTo(maximum) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Total des points du lot dépassé. "
                            + "Total actuel : " + currentTotal
                            + ", nouveau total : " + newTotal
                            + ", maximum : " + maximum
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

        BigDecimal totalSansCritere = critereEvaluationRepository
                .findByLot_IdAndActifTrueOrderByOrdreAffichageAsc(lotId)
                .stream()
                .filter(critere -> !critere.getId().equals(currentCritereId))
                .map(CritereEvaluation::getPointsMax)
                .filter(points -> points != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal newTotal = totalSansCritere.add(newPoints);
        BigDecimal maximum = grille.getTotalPoints() != null
                ? grille.getTotalPoints()
                : TOTAL_POINTS_PAR_DEFAUT;

        if (newTotal.compareTo(maximum) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Total des points du lot dépassé. "
                            + "Total sans ce critère : " + totalSansCritere
                            + ", nouveau total : " + newTotal
                            + ", maximum : " + maximum
            );
        }
    }

    /* =====================================================
       AUTOMATISATION / SIMPLIFICATION DU FORMULAIRE
    ===================================================== */

    private String resolveSection(CategorieEvaluation categorie) {
        if (categorie == null || !hasText(categorie.getLibelle())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La catégorie sélectionnée ne possède pas de libellé"
            );
        }

        return categorie.getLibelle().trim();
    }

    private String resolveTypeChamp(String typeChamp) {
        String value = cleanUpper(typeChamp);
        return value.isBlank() ? "TEXT" : value;
    }

    private String resolveTypeNotation(
            String requestedTypeNotation,
            String typeChamp
    ) {
        if (hasText(requestedTypeNotation)) {
            return cleanUpper(requestedTypeNotation);
        }

        return switch (resolveTypeChamp(typeChamp)) {
            case "BOOLEAN" -> "OUI_NON";
            case "NUMBER" -> "SEUIL_NUMERIQUE";
            case "SELECT" -> "AUTOMATIQUE";
            default -> "MANUEL";
        };
    }

    private Integer resolveCreateOrder(
            Long lotId,
            Integer requestedOrder
    ) {
        if (requestedOrder != null && requestedOrder > 0) {
            return requestedOrder;
        }

        return critereEvaluationRepository
                .findByLot_IdOrderByOrdreAffichageAsc(lotId)
                .size() + 1;
    }

    /* =====================================================
       UTILITAIRES
    ===================================================== */

    private String generatePieceCode(String nomPiece) {
        if (!hasText(nomPiece)) {
            return "PIECE";
        }

        String generated = nomPiece
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

        if (generated.length() > 25) {
            generated = generated.substring(0, 25);
        }

        return generated.isBlank() ? "PIECE" : generated;
    }

    private BigDecimal safePoints(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String cleanNullable(String value) {
        if (!hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String cleanRequired(String value, String message) {
        if (!hasText(value)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    message
            );
        }
        return value.trim();
    }

    private String cleanUpper(String value) {
        return clean(value).toUpperCase();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
