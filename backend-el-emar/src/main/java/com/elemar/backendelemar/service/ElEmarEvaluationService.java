package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.*;
import com.elemar.backendelemar.entity.ApplicationCandidature;
import com.elemar.backendelemar.repository.ApplicationCandidatureRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ElEmarEvaluationService {

    private final JdbcTemplate jdbcTemplate;
    private final ApplicationCandidatureRepository applicationCandidatureRepository;
    private final HistoriqueActionService historiqueActionService;
    private static final String BASE_API = "/api/el-emar/evaluations";

    // =====================================================
    // LISTE DES CANDIDATURES SOUMISES
    // =====================================================
    private String normalizeSolvabiliteStatut(
            String statut
    ) {
        String value =
                statut == null
                        ? "A_VERIFIER"
                        : statut.trim().toUpperCase();

        if (
                !List.of(
                        "A_VERIFIER",
                        "SOLVABLE",
                        "NON_SOLVABLE"
                ).contains(value)
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Statut de solvabilité invalide."
            );
        }

        return value;
    }
    @Transactional
    public SaveDocumentsStatutResponse saveDocumentsStatut(
            Long candidatureId,
            SaveDocumentsStatutRequest request
    ) {
        if (candidatureId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant de l’intervenant obligatoire."
            );
        }

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les statuts RNE et CNSS sont obligatoires."
            );
        }

        String rneStatut =
                normalizeStatut(
                        request.getRneStatut()
                );

        String cnssStatut =
                normalizeStatut(
                        request.getCnssStatut()
                );

        boolean dossierRecevable =
                !"NON_CONFORME".equals(rneStatut)
                        &&
                        !"NON_CONFORME".equals(cnssStatut);

        String motif =
                dossierRecevable
                        ? null
                        : "RNE ou CNSS non conforme.";

        int updated =
                jdbcTemplate.update(
                        """
                        UPDATE candidature
                        SET rne_statut = ?,
                            cnss_statut = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                        """,
                        rneStatut,
                        cnssStatut,
                        candidatureId
                );

        if (updated == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Intervenant introuvable."
            );
        }

        historiqueActionService.enregistrerAction(
                request.getEvaluateurId(),
                candidatureId,
                null,
                "EL_EMAR_CONTROLE_DOCUMENTS",
                "Contrôle des pièces générales"
                        + " | RNE : "
                        + rneStatut
                        + " | CNSS : "
                        + cnssStatut
        );

        return SaveDocumentsStatutResponse
                .builder()
                .candidatureId(
                        candidatureId
                )
                .rneStatut(
                        rneStatut
                )
                .cnssStatut(
                        cnssStatut
                )
                .dossierRecevable(
                        dossierRecevable
                )
                .motifNonRecevable(
                        motif
                )
                .build();
    }
    @Transactional
    public SaveSolvabiliteResponse saveSolvabilite(
            Long candidatureId,
            SaveSolvabiliteRequest request
    ) {
        if (candidatureId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant de l’intervenant obligatoire."
            );
        }

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations de solvabilité sont obligatoires."
            );
        }

        String statut = normalizeSolvabiliteStatut(
                request.getStatut()
        );

        String commentaire =
                request.getCommentaire() == null
                        ? null
                        : request.getCommentaire().trim();

        if (
                commentaire != null &&
                        commentaire.isEmpty()
        ) {
            commentaire = null;
        }

        LocalDateTime dateValidation =
                LocalDateTime.now();

        int updated = jdbcTemplate.update(
                """
                UPDATE candidature
                SET solvabilite_statut = ?,
                    solvabilite_commentaire = ?,
                    solvabilite_evaluateur_id = ?,
                    solvabilite_date_validation = ?
                WHERE id = ?
                """,
                statut,
                commentaire,
                request.getEvaluateurId(),
                dateValidation,
                candidatureId
        );

        if (updated == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Intervenant introuvable."
            );
        }

        historiqueActionService.enregistrerAction(
                request.getEvaluateurId(),
                candidatureId,
                null,
                "EL_EMAR_SOLVABILITE",
                "El Emar a mis à jour la solvabilité. Statut : "
                        + statut
                        + " | Commentaire : "
                        + safe(commentaire)
        );

        return SaveSolvabiliteResponse.builder()
                .candidatureId(candidatureId)
                .statut(statut)
                .commentaire(commentaire)
                .evaluateurId(
                        request.getEvaluateurId()
                )
                .dateValidation(dateValidation)
                .build();
    }
    @Transactional(readOnly = true)
    public List<ElEmarCandidatureListItemResponse> getCandidaturesSoumises(
            Long typeIntervenantId
    ) {
        String sql = """
            SELECT
                c.id AS candidature_id,
                c.raison_sociale,
                c.email_principal,
                c.telephone,
                c.ville,
                CAST(c.statut AS TEXT) AS statut,
                c.date_soumission,

                ti.id AS type_intervenant_id,
                ti.code AS type_intervenant_code,
                ti.libelle AS type_intervenant_libelle,

                ac.id AS application_candidature_id,
                ac.lot_id,
                COALESCE(l.nom_lot, 'Lot') AS nom_lot,
                COALESCE(ac.note_finale, 0) AS note_lot,
                CAST(ac.statut AS TEXT) AS statut_lot,
                CAST(ac.decision_finale AS TEXT) AS decision_finale

            FROM candidature c

            LEFT JOIN type_intervenant ti
                ON ti.id = c.type_intervenant_id

            LEFT JOIN application_candidature ac
                ON ac.candidature_id = c.id

            LEFT JOIN lot l
                ON l.id = ac.lot_id

            WHERE UPPER(CAST(c.statut AS TEXT)) IN ('SOUMIS', 'SOUMISE', 'SUBMITTED')
            """;

        List<Object> params = new ArrayList<>();

        if (typeIntervenantId != null) {
            sql += " AND c.type_intervenant_id = ? ";
            params.add(typeIntervenantId);
        }

        sql += """
            ORDER BY
                c.date_soumission DESC,
                c.id DESC,
                COALESCE(l.nom_lot, 'Lot') ASC
            """;

        Map<Long, ElEmarCandidatureListItemResponse> map = new LinkedHashMap<>();

        jdbcTemplate.query(
                sql,
                params.toArray(),
                rs -> {
                    Long candidatureId = rs.getLong("candidature_id");

                    ElEmarCandidatureListItemResponse item = map.get(candidatureId);

                    if (item == null) {
                        item = ElEmarCandidatureListItemResponse.builder()
                                .candidatureId(candidatureId)
                                .raisonSociale(rs.getString("raison_sociale"))
                                .emailPrincipal(rs.getString("email_principal"))
                                .telephone(rs.getString("telephone"))
                                .ville(rs.getString("ville"))
                                .statut(rs.getString("statut"))
                                .dateSoumission(toLocalDateTime(rs.getTimestamp("date_soumission")))
                                .noteGlobale(BigDecimal.ZERO)
                                .typeIntervenantId(
                                        rs.getObject("type_intervenant_id") != null
                                                ? rs.getLong("type_intervenant_id")
                                                : null
                                )
                                .typeIntervenantCode(rs.getString("type_intervenant_code"))
                                .typeIntervenantLibelle(rs.getString("type_intervenant_libelle"))
                                .lots(new ArrayList<>())
                                .lotsNotes(new ArrayList<>())
                                .build();

                        map.put(candidatureId, item);
                    }

                    if (rs.getObject("application_candidature_id") != null) {
                        String nomLot = rs.getString("nom_lot");

                        item.getLots().add(nomLot);

                        item.getLotsNotes().add(
                                LotNoteResponse.builder()
                                        .applicationCandidatureId(rs.getLong("application_candidature_id"))
                                        .lotId(
                                                rs.getObject("lot_id") != null
                                                        ? rs.getLong("lot_id")
                                                        : null
                                        )
                                        .nomLot(nomLot)
                                        .noteLot(scale(rs.getBigDecimal("note_lot")))
                                        .statutLot(rs.getString("statut_lot"))
                                        .decisionFinale(rs.getString("decision_finale"))
                                        .build()
                        );
                    }
                }
        );

        return new ArrayList<>(map.values());
    }
    public List<CandidatLotClassementResponse> getClassementCandidatsParLot(
            BigDecimal minNote,
            Boolean admisOnly
    ) {
        if (minNote == null) {
            minNote = BigDecimal.valueOf(80);
        }

        boolean onlyAdmis = Boolean.TRUE.equals(admisOnly);

        String sql = """
        WITH notes_calculees AS (
            SELECT
                ac.id AS application_candidature_id,
                CASE
                    WHEN SUM(COALESCE(ce.points_max, 0)) > 0 THEN
                        ROUND(
                            (
                                SUM(COALESCE(ec.note_obtenue, 0))
                                / SUM(COALESCE(ce.points_max, 0))
                            ) * 100,
                            2
                        )
                    ELSE 0
                END AS note_calculee
            FROM application_candidature ac
            LEFT JOIN reponse_critere rc
                ON rc.application_candidature_id = ac.id
            LEFT JOIN critere_evaluation ce
                ON ce.id = rc.critere_evaluation_id
               AND ce.actif = true
            LEFT JOIN evaluation_critere ec
                ON ec.reponse_critere_id = rc.id
            GROUP BY ac.id
        ),
        latest_zone AS (
            SELECT DISTINCT ON (cz.application_candidature_id)
                cz.application_candidature_id,
                cz.zone_id
            FROM classement_zone cz
            ORDER BY
                cz.application_candidature_id,
                cz.id DESC
        ),
        base AS (
            SELECT
                ac.id AS application_candidature_id,
                c.id AS candidature_id,
                c.raison_sociale,
                c.email_principal,
                c.telephone,

                ti.libelle AS type_candidat,

                l.id AS lot_id,
                l.nom_lot,

                z.id AS zone_id,
                z.nom_zone,

                COALESCE(ac.note_finale, nc.note_calculee, 0) AS note_lot,

                ac.decision_finale::text AS decision_finale,
                ac.statut::text AS statut,
                ac.date_soumission

            FROM application_candidature ac

            JOIN candidature c
                ON c.id = ac.candidature_id

            JOIN lot l
                ON l.id = ac.lot_id

            JOIN type_intervenant ti
                ON ti.id = l.type_intervenant_id

            LEFT JOIN notes_calculees nc
                ON nc.application_candidature_id = ac.id

            LEFT JOIN latest_zone lz
                ON lz.application_candidature_id = ac.id

            LEFT JOIN zone z
                ON z.id = lz.zone_id

            WHERE COALESCE(ac.note_finale, nc.note_calculee, 0) >= ?
              AND l.actif = true
              AND ti.actif = true
              AND (
                    z.nom_zone IS NULL
                    OR z.nom_zone IN ('Zone 1', 'Zone 2', 'Zone 3')
              )
              AND (
                    ? = false
                    OR ac.decision_finale::text = 'ADMIS'
              )
        )
        SELECT
            *,
            ROW_NUMBER() OVER (
                ORDER BY note_lot DESC, nom_zone ASC, nom_lot ASC, raison_sociale ASC
            )::int AS rang_global,

            ROW_NUMBER() OVER (
                PARTITION BY lot_id
                ORDER BY note_lot DESC, nom_zone ASC, raison_sociale ASC
            )::int AS rang_par_lot,

            ROW_NUMBER() OVER (
                PARTITION BY lot_id, zone_id
                ORDER BY note_lot DESC, raison_sociale ASC
            )::int AS rang_par_lot_zone

        FROM base
        ORDER BY
            note_lot DESC,
            nom_zone ASC,
            nom_lot ASC,
            raison_sociale ASC
        """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> CandidatLotClassementResponse.builder()
                        .applicationCandidatureId(rs.getLong("application_candidature_id"))
                        .candidatureId(rs.getLong("candidature_id"))
                        .raisonSociale(rs.getString("raison_sociale"))
                        .emailPrincipal(rs.getString("email_principal"))
                        .telephone(rs.getString("telephone"))
                        .typeCandidat(rs.getString("type_candidat"))
                        .lotId(rs.getLong("lot_id"))
                        .nomLot(rs.getString("nom_lot"))
                        .zoneId(rs.getObject("zone_id") != null ? rs.getLong("zone_id") : null)
                        .nomZone(rs.getString("nom_zone"))
                        .noteLot(rs.getBigDecimal("note_lot"))
                        .decisionFinale(rs.getString("decision_finale"))
                        .statut(rs.getString("statut"))
                        .rangGlobal(rs.getInt("rang_global"))
                        .rangParLot(rs.getInt("rang_par_lot"))
                        .rangParLotZone(rs.getInt("rang_par_lot_zone"))
                        .dateSoumission(
                                rs.getTimestamp("date_soumission") != null
                                        ? rs.getTimestamp("date_soumission").toLocalDateTime()
                                        : null
                        )
                        .build(),
                minNote,
                onlyAdmis
        );
    }
    // =====================================================
    // DÉTAIL CANDIDATURE
    // =====================================================

    @Transactional(readOnly = true)
    public CandidatureDetailResponse getCandidatureDetail(Long candidatureId) {
        CandidatureDetailResponse detail = loadCandidature(candidatureId);

        List<LotEvaluationResponse> lots = loadLots(candidatureId);

        for (LotEvaluationResponse lot : lots) {
            List<ElEmarCritereEvaluationResponse> criteres =
                    loadCriteres(lot.getApplicationCandidatureId());

            for (ElEmarCritereEvaluationResponse critere : criteres) {
                critere.setPieces(
                        loadPiecesForCritere(
                                lot.getApplicationCandidatureId(),
                                critere.getCritereEvaluationId()
                        )
                );
            }

            lot.setCriteres(criteres);
            lot.setReferences(loadReferences(lot.getApplicationCandidatureId()));
            lot.setNoteLot(computeNoteLot(criteres));
        }

        detail.setLots(lots);
        detail.setNoteGlobale(computeNoteGlobale(lots));

        return detail;
    }

    private CandidatureDetailResponse loadCandidature(
            Long candidatureId
    ) {
        String sql = """
            SELECT
                id,
                raison_sociale,
                forme_juridique,
                rne_matricule_fiscal,
                date_creation_bureau,
                adresse_siege,
                telephone,
                email_principal,
                site_internet,
                ville,
                representant_legal,
                fonction_representant,
                specialites,
                agrements_certifications,
                banque_principale,
                localisation,

                CAST(statut AS TEXT) AS statut,
                date_soumission,

                rne_nom_fichier,
                rne_chemin_fichier,
                COALESCE(
                    rne_statut,
                    'A_VERIFIER'
                ) AS rne_statut,

                cnss_nom_fichier,
                cnss_chemin_fichier,
                COALESCE(
                    cnss_statut,
                    'A_VERIFIER'
                ) AS cnss_statut,

                COALESCE(
                    solvabilite_statut,
                    'A_VERIFIER'
                ) AS solvabilite_statut,

                solvabilite_commentaire,
                solvabilite_evaluateur_id,
                solvabilite_date_validation

            FROM candidature
            WHERE id = ?
            """;

        List<CandidatureDetailResponse> results =
                jdbcTemplate.query(
                        sql,
                        (rs, rowNum) -> {
                            String rneStatut =
                                    rs.getString(
                                            "rne_statut"
                                    );

                            String cnssStatut =
                                    rs.getString(
                                            "cnss_statut"
                                    );

                            boolean dossierRecevable =
                                    !"NON_CONFORME"
                                            .equalsIgnoreCase(
                                                    rneStatut
                                            )
                                            &&
                                            !"NON_CONFORME"
                                                    .equalsIgnoreCase(
                                                            cnssStatut
                                                    );

                            return CandidatureDetailResponse
                                    .builder()

                                    .candidatureId(
                                            rs.getLong("id")
                                    )

                                    .raisonSociale(
                                            rs.getString(
                                                    "raison_sociale"
                                            )
                                    )

                                    .formeJuridique(
                                            rs.getString(
                                                    "forme_juridique"
                                            )
                                    )

                                    .rneMatriculeFiscal(
                                            rs.getString(
                                                    "rne_matricule_fiscal"
                                            )
                                    )

                                    .dateCreationBureau(
                                            toLocalDate(
                                                    rs.getDate(
                                                            "date_creation_bureau"
                                                    )
                                            )
                                    )

                                    .adresseSiege(
                                            rs.getString(
                                                    "adresse_siege"
                                            )
                                    )

                                    .telephone(
                                            rs.getString(
                                                    "telephone"
                                            )
                                    )

                                    .emailPrincipal(
                                            rs.getString(
                                                    "email_principal"
                                            )
                                    )

                                    .siteInternet(
                                            rs.getString(
                                                    "site_internet"
                                            )
                                    )

                                    .ville(
                                            rs.getString(
                                                    "ville"
                                            )
                                    )

                                    .representantLegal(
                                            rs.getString(
                                                    "representant_legal"
                                            )
                                    )

                                    .fonctionRepresentant(
                                            rs.getString(
                                                    "fonction_representant"
                                            )
                                    )

                                    .specialites(
                                            rs.getString(
                                                    "specialites"
                                            )
                                    )

                                    .agrementsCertifications(
                                            rs.getString(
                                                    "agrements_certifications"
                                            )
                                    )

                                    .banquePrincipale(
                                            rs.getString(
                                                    "banque_principale"
                                            )
                                    )

                                    .localisation(
                                            rs.getString(
                                                    "localisation"
                                            )
                                    )

                                    .statut(
                                            rs.getString(
                                                    "statut"
                                            )
                                    )

                                    .dateSoumission(
                                            toLocalDateTime(
                                                    rs.getTimestamp(
                                                            "date_soumission"
                                                    )
                                            )
                                    )

                                    /* =========================
                                       RNE
                                    ========================= */

                                    .rneNomFichier(
                                            rs.getString(
                                                    "rne_nom_fichier"
                                            )
                                    )

                                    .rneStatut(
                                            rneStatut
                                    )

                                    .rnePdfUrl(
                                            hasText(
                                                    rs.getString(
                                                            "rne_chemin_fichier"
                                                    )
                                            )
                                                    ? BASE_API
                                                    + "/candidatures/"
                                                    + rs.getLong("id")
                                                    + "/rne/pdf"
                                                    : null
                                    )

                                    /* =========================
                                       CNSS
                                    ========================= */

                                    .cnssNomFichier(
                                            rs.getString(
                                                    "cnss_nom_fichier"
                                            )
                                    )

                                    .cnssStatut(
                                            cnssStatut
                                    )

                                    .cnssPdfUrl(
                                            hasText(
                                                    rs.getString(
                                                            "cnss_chemin_fichier"
                                                    )
                                            )
                                                    ? BASE_API
                                                    + "/candidatures/"
                                                    + rs.getLong("id")
                                                    + "/cnss/pdf"
                                                    : null
                                    )

                                    .dossierRecevable(
                                            dossierRecevable
                                    )

                                    .motifNonRecevable(
                                            dossierRecevable
                                                    ? null
                                                    : "RNE ou CNSS non conforme."
                                    )

                                    /* =========================
                                       SOLVABILITÉ
                                    ========================= */

                                    .solvabiliteStatut(
                                            rs.getString(
                                                    "solvabilite_statut"
                                            )
                                    )

                                    .solvabiliteCommentaire(
                                            rs.getString(
                                                    "solvabilite_commentaire"
                                            )
                                    )

                                    .solvabiliteEvaluateurId(
                                            rs.getObject(
                                                    "solvabilite_evaluateur_id"
                                            ) != null
                                                    ? rs.getLong(
                                                    "solvabilite_evaluateur_id"
                                            )
                                                    : null
                                    )

                                    .solvabiliteDateValidation(
                                            toLocalDateTime(
                                                    rs.getTimestamp(
                                                            "solvabilite_date_validation"
                                                    )
                                            )
                                    )

                                    .noteGlobale(
                                            BigDecimal.ZERO
                                    )

                                    .lots(
                                            new ArrayList<>()
                                    )

                                    .build();
                        },
                        candidatureId
                );

        if (results.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Intervenant introuvable."
            );
        }

        return results.get(0);
    }

    private List<LotEvaluationResponse> loadLots(Long candidatureId) {
        String sql = """
                SELECT
                    ac.id AS application_candidature_id,
                    ac.lot_id,
                    COALESCE(l.nom_lot, 'Lot') AS nom_lot,
                    CAST(ac.statut AS TEXT) AS statut,
                    ac.date_soumission,
                    ac.note_finale,
                    CAST(ac.decision_finale AS TEXT) AS decision_finale,
                    ac.observation_finale
                FROM application_candidature ac
                LEFT JOIN lot l ON l.id = ac.lot_id
                WHERE ac.candidature_id = ?
                ORDER BY COALESCE(l.nom_lot, 'Lot')
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> LotEvaluationResponse.builder()
                        .applicationCandidatureId(rs.getLong("application_candidature_id"))
                        .lotId(
                                rs.getObject("lot_id") != null
                                        ? rs.getLong("lot_id")
                                        : null
                        )
                        .nomLot(rs.getString("nom_lot"))
                        .statut(rs.getString("statut"))
                        .dateSoumission(toLocalDateTime(rs.getTimestamp("date_soumission")))
                        .noteLot(scale(rs.getBigDecimal("note_finale")))
                        .decisionFinale(rs.getString("decision_finale"))
                        .observationFinale(rs.getString("observation_finale"))
                        .criteres(new ArrayList<>())
                        .references(new ArrayList<>())
                        .build(),
                candidatureId
        );
    }

    private List<ElEmarCritereEvaluationResponse> loadCriteres(
            Long applicationCandidatureId
    ) {
        String sql = """
        SELECT
            rc.id AS reponse_critere_id,
            rc.critere_evaluation_id,

            ce.code_critere,
            ce.section,

            COALESCE(
                NULLIF(ce.label_candidat, ''),
                ce.libelle_critere
            ) AS libelle,

            ce.aide_candidat,
            ce.note_evaluateur,
            ce.type_champ,
            ce.points_max,

            COALESCE(
                NULLIF(rc.valeur_text, ''),
                rc.valeur_number::text,

                CASE
                    WHEN rc.valeur_boolean IS TRUE
                        THEN 'Oui'

                    WHEN rc.valeur_boolean IS FALSE
                        THEN 'Non'

                    ELSE NULL
                END,

                rc.valeur_date::text,
                ''
            ) AS reponse,

            COALESCE(
                CAST(ec.statut AS TEXT),
                'A_VERIFIER'
            ) AS statut_evaluation,

            COALESCE(
                ec.note_obtenue,
                0
            ) AS note_obtenue,

            ec.commentaire_evaluateur

        FROM reponse_critere rc

        JOIN critere_evaluation ce
            ON ce.id = rc.critere_evaluation_id

        LEFT JOIN evaluation_critere ec
            ON ec.reponse_critere_id = rc.id

        WHERE rc.application_candidature_id = ?

        ORDER BY
            ce.section,
            ce.ordre_affichage,
            ce.id
        """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    String statut =
                            Optional.ofNullable(
                                    rs.getString(
                                            "statut_evaluation"
                                    )
                            ).orElse(
                                    "A_VERIFIER"
                            );

                    BigDecimal noteObtenue =
                            Optional.ofNullable(
                                    rs.getBigDecimal(
                                            "note_obtenue"
                                    )
                            ).orElse(
                                    BigDecimal.ZERO
                            );

                    return ElEmarCritereEvaluationResponse
                            .builder()

                            .reponseCritereId(
                                    rs.getLong(
                                            "reponse_critere_id"
                                    )
                            )

                            .critereEvaluationId(
                                    rs.getLong(
                                            "critere_evaluation_id"
                                    )
                            )

                            .codeCritere(
                                    rs.getString(
                                            "code_critere"
                                    )
                            )

                            .section(
                                    rs.getString(
                                            "section"
                                    )
                            )

                            .libelle(
                                    rs.getString(
                                            "libelle"
                                    )
                            )

                            .aideCandidat(
                                    rs.getString(
                                            "aide_candidat"
                                    )
                            )

                            .noteEvaluateur(
                                    rs.getString(
                                            "note_evaluateur"
                                    )
                            )

                            .typeChamp(
                                    rs.getString(
                                            "type_champ"
                                    )
                            )

                            .reponse(
                                    rs.getString(
                                            "reponse"
                                    )
                            )

                            .noteMax(
                                    scale(
                                            rs.getBigDecimal(
                                                    "points_max"
                                            )
                                    )
                            )

                            .statutEvaluation(
                                    statut
                            )

                            .conforme(
                                    "CONFORME"
                                            .equalsIgnoreCase(
                                                    statut
                                            )
                            )

                            .noteObtenue(
                                    scale(
                                            noteObtenue
                                    )
                            )

                            .commentaireEvaluateur(
                                    rs.getString(
                                            "commentaire_evaluateur"
                                    )
                            )

                            .pieces(
                                    new ArrayList<>()
                            )

                            .build();
                },
                applicationCandidatureId
        );
    }
    private List<PieceEvaluationResponse> loadPiecesForCritere(
            Long applicationCandidatureId,
            Long critereEvaluationId
    ) {
        String sql = """
                SELECT
                    cp.id AS critere_piece_id,
                    cp.code_piece,
                    cp.nom_piece,
                    pcd.id AS piece_deposee_id,
                    pcd.nom_fichier,
                    pcd.type_contenu
                FROM critere_piece cp
                LEFT JOIN piece_critere_deposee pcd
                    ON pcd.critere_piece_id = cp.id
                   AND pcd.application_candidature_id = ?
                WHERE cp.critere_evaluation_id = ?
                  AND COALESCE(cp.actif, true) = true
                ORDER BY cp.ordre_affichage, cp.id
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    Long pieceDeposeeId = rs.getObject("piece_deposee_id") != null
                            ? rs.getLong("piece_deposee_id")
                            : null;

                    return PieceEvaluationResponse.builder()
                            .pieceDeposeeId(pieceDeposeeId)
                            .criterePieceId(rs.getLong("critere_piece_id"))
                            .codePiece(rs.getString("code_piece"))
                            .nomPiece(rs.getString("nom_piece"))
                            .nomFichier(rs.getString("nom_fichier"))
                            .typeContenu(rs.getString("type_contenu"))
                            .deposee(pieceDeposeeId != null)
                            .pdfUrl(
                                    pieceDeposeeId != null
                                            ? BASE_API + "/pieces/" + pieceDeposeeId + "/pdf"
                                            : null
                            )
                            .build();
                },
                applicationCandidatureId,
                critereEvaluationId
        );
    }

    private List<ProjetReferenceResponse> loadReferences(
            Long applicationCandidatureId
    ) {
        String sql = """
            SELECT
                id,
                nom_projet,
                maitre_ouvrage,
                ville,
                zone,

                zone_el_emar_id,
                zone_el_emar_nom,
                zone_el_emar_commentaire,
                zone_validee,

                adresse_projet,
                type_projet,
                surface_m2,
                niveaux_r_plus,
                nombre_sous_sols,
                annee_livraison,
                bim_oui_non,
                seuil_ok,
                mission_realisee,
                montant,
                fichier_p11,
                fichier_p12

            FROM projet_reference
            WHERE application_candidature_id = ?
            ORDER BY id
            """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> mapReference(rs),
                applicationCandidatureId
        );
    }

    private ProjetReferenceResponse mapReference(ResultSet rs) throws java.sql.SQLException {
        Long id = rs.getLong("id");

        String fichierP11 = rs.getString("fichier_p11");
        String fichierP12 = rs.getString("fichier_p12");

        return ProjetReferenceResponse.builder()
                .id(id)
                .nomProjet(rs.getString("nom_projet"))
                .maitreOuvrage(rs.getString("maitre_ouvrage"))
                .ville(rs.getString("ville"))
                .zone(rs.getString("zone"))
                .zoneElEmarId(
                        rs.getObject("zone_el_emar_id") != null
                                ? rs.getLong("zone_el_emar_id")
                                : null
                )
                .zoneElEmarId(
                        rs.getObject(
                                "zone_el_emar_id"
                        ) != null
                                ? rs.getLong(
                                "zone_el_emar_id"
                        )
                                : null
                )

                .zoneElEmarNom(
                        rs.getString(
                                "zone_el_emar_nom"
                        )
                )

                .zoneElEmarCommentaire(
                        rs.getString(
                                "zone_el_emar_commentaire"
                        )
                )

                .zoneValidee(
                        rs.getObject(
                                "zone_validee"
                        ) != null
                                ? rs.getBoolean(
                                "zone_validee"
                        )
                                : false
                )

                .adresseProjet(rs.getString("adresse_projet"))
                .typeProjet(rs.getString("type_projet"))
                .surfaceM2(scale(rs.getBigDecimal("surface_m2")))
                .niveauxRPlus(rs.getString("niveaux_r_plus"))
                .nombreSousSols(
                        rs.getObject("nombre_sous_sols") != null
                                ? rs.getInt("nombre_sous_sols")
                                : null
                )
                .anneeLivraison(
                        rs.getObject("annee_livraison") != null
                                ? rs.getInt("annee_livraison")
                                : null
                )
                .bimOuiNon(
                        rs.getObject("bim_oui_non") != null
                                ? rs.getBoolean("bim_oui_non")
                                : null
                )
                .seuilOk(
                        rs.getObject("seuil_ok") != null
                                ? rs.getBoolean("seuil_ok")
                                : null
                )
                .missionRealisee(rs.getString("mission_realisee"))
                .montant(scale(rs.getBigDecimal("montant")))
                .fichierP11(rs.getString("fichier_p11"))
                .fichierP12(rs.getString("fichier_p12"))
                .fichierP11Nom(hasText(fichierP11) ? extractFileName(fichierP11) : null)
                .fichierP11Url(
                        hasText(fichierP11)
                                ? BASE_API + "/references/" + id + "/files/P11"
                                : null
                )
                .fichierP12Nom(hasText(fichierP12) ? extractFileName(fichierP12) : null)
                .fichierP12Url(
                        hasText(fichierP12)
                                ? BASE_API + "/references/" + id + "/files/P12"
                                : null
                )
                .build();
    }

    // =====================================================
    // SAUVEGARDE ÉVALUATION CRITÈRE
    // =====================================================

    @Transactional
    public SaveCritereEvaluationResponse saveCritereEvaluation(
            Long applicationCandidatureId,
            Long reponseCritereId,
            SaveCritereEvaluationRequest request
    ) {
        if (applicationCandidatureId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant du lot obligatoire."
            );
        }

        if (reponseCritereId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant de la réponse obligatoire."
            );
        }

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Évaluation obligatoire."
            );
        }

        /*
         * Vérifier que la réponse appartient bien
         * au lot/application envoyé dans l’URL.
         */
        List<Map<String, Object>> responseRows =
                jdbcTemplate.queryForList(
                        """
                        SELECT
                            rc.id AS reponse_critere_id,
                            rc.application_candidature_id,
                            rc.critere_evaluation_id,
                            ce.points_max,
                            ac.candidature_id
    
                        FROM reponse_critere rc
    
                        JOIN critere_evaluation ce
                            ON ce.id = rc.critere_evaluation_id
    
                        JOIN application_candidature ac
                            ON ac.id = rc.application_candidature_id
    
                        WHERE rc.id = ?
                          AND rc.application_candidature_id = ?
                        """,
                        reponseCritereId,
                        applicationCandidatureId
                );

        if (responseRows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "La réponse critère est introuvable pour ce lot."
            );
        }

        Map<String, Object> responseRow =
                responseRows.get(0);

        BigDecimal pointsMax =
                asBigDecimal(
                        responseRow.get("points_max")
                );

        Long candidatureId =
                ((Number) responseRow.get(
                        "candidature_id"
                )).longValue();

        String statut =
                normalizeStatut(
                        request.getStatut()
                );

        BigDecimal noteObtenue =
                "CONFORME".equals(statut)
                        ? pointsMax
                        : BigDecimal.ZERO;

        Long evaluateurId =
                request.getEvaluateurId();

        String commentaire =
                request.getCommentaireEvaluateur();

        if (commentaire != null) {
            commentaire = commentaire.trim();

            if (commentaire.isEmpty()) {
                commentaire = null;
            }
        }

        /*
         * Mise à jour directe par reponse_critere_id.
         *
         * Aucun ORDER BY.
         * Aucun LIMIT.
         * Aucune recherche de dernière modification.
         */
        int updated = jdbcTemplate.update(
                """
                UPDATE evaluation_critere
    
                SET evaluateur_id = ?,
                    note_obtenue = ?,
                    commentaire_evaluateur = ?,
                    statut = ?,
                    updated_at = CURRENT_TIMESTAMP
    
                WHERE reponse_critere_id = ?
                """,
                evaluateurId,
                noteObtenue,
                commentaire,
                statut,
                reponseCritereId
        );

        /*
         * Première évaluation de cette réponse :
         * aucune ligne n’existe encore, donc INSERT.
         */
        if (updated == 0) {
            jdbcTemplate.update(
                    """
                    INSERT INTO evaluation_critere
                    (
                        reponse_critere_id,
                        evaluateur_id,
                        note_obtenue,
                        commentaire_evaluateur,
                        statut,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        ?, ?, ?, ?, ?,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    """,
                    reponseCritereId,
                    evaluateurId,
                    noteObtenue,
                    commentaire,
                    statut
            );
        }

        /*
         * Recalcul et sauvegarde de la note du lot.
         */
        BigDecimal noteLot =
                recalculateAndSaveApplicationNote(
                        applicationCandidatureId
                );

        /*
         * Recalcul de la note globale de l’intervenant.
         */
        BigDecimal noteGlobale =
                recalculateGlobalNote(
                        candidatureId
                );

        historiqueActionService.enregistrerAction(
                evaluateurId,
                candidatureId,
                applicationCandidatureId,
                "EL_EMAR_EVALUATION_CRITERE",
                "Évaluation du critère"
                        + " | Réponse ID : "
                        + reponseCritereId
                        + " | Statut : "
                        + statut
                        + " | Note : "
                        + scale(noteObtenue)
                        + " | Commentaire : "
                        + safe(commentaire)
        );

        return SaveCritereEvaluationResponse.builder()
                .reponseCritereId(
                        reponseCritereId
                )
                .applicationCandidatureId(
                        applicationCandidatureId
                )
                .statutEvaluation(
                        statut
                )
                .conforme(
                        "CONFORME".equals(statut)
                )
                .noteObtenue(
                        scale(noteObtenue)
                )
                .noteLot(
                        scale(noteLot)
                )
                .noteGlobale(
                        scale(noteGlobale)
                )
                .commentaireEvaluateur(
                        commentaire
                )
                .build();
    }

    private BigDecimal recalculateAndSaveApplicationNote(Long applicationCandidatureId) {
        Map<String, Object> totals =
                jdbcTemplate.queryForMap(
                        """
                        SELECT
                            COALESCE(
                                SUM(
                                    COALESCE(
                                        ec.note_obtenue,
                                        0
                                    )
                                ),
                                0
                            ) AS total_obtenu,
        
                            COALESCE(
                                SUM(
                                    COALESCE(
                                        ce.points_max,
                                        0
                                    )
                                ),
                                0
                            ) AS total_max
        
                        FROM reponse_critere rc
        
                        JOIN critere_evaluation ce
                            ON ce.id =
                               rc.critere_evaluation_id
        
                        LEFT JOIN evaluation_critere ec
                            ON ec.reponse_critere_id =
                               rc.id
        
                        WHERE rc.application_candidature_id = ?
                        """,
                        applicationCandidatureId
                );

        BigDecimal totalObtenu = asBigDecimal(totals.get("total_obtenu"));
        BigDecimal totalMax = asBigDecimal(totals.get("total_max"));

        BigDecimal noteLot = totalMax.compareTo(BigDecimal.ZERO) > 0
                ? totalObtenu
                .multiply(BigDecimal.valueOf(100))
                .divide(totalMax, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        jdbcTemplate.update(
                """
                UPDATE application_candidature
                SET note_finale = ?
                WHERE id = ?
                """,
                noteLot,
                applicationCandidatureId
        );

        return noteLot;
    }

    private BigDecimal recalculateGlobalNote(Long candidatureId) {
        BigDecimal note = jdbcTemplate.queryForObject(
                """
                SELECT COALESCE(AVG(COALESCE(note_finale, 0)), 0)
                FROM application_candidature
                WHERE candidature_id = ?
                """,
                BigDecimal.class,
                candidatureId
        );

        return scale(note);
    }

    private BigDecimal computeNoteLot(List<ElEmarCritereEvaluationResponse> criteres) {
        BigDecimal totalMax = BigDecimal.ZERO;
        BigDecimal totalObtenu = BigDecimal.ZERO;

        for (ElEmarCritereEvaluationResponse critere : criteres) {
            totalMax = totalMax.add(asBigDecimal(critere.getNoteMax()));
            totalObtenu = totalObtenu.add(asBigDecimal(critere.getNoteObtenue()));
        }

        if (totalMax.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        return totalObtenu
                .multiply(BigDecimal.valueOf(100))
                .divide(totalMax, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal computeNoteGlobale(List<LotEvaluationResponse> lots) {
        if (lots == null || lots.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal sum = BigDecimal.ZERO;

        for (LotEvaluationResponse lot : lots) {
            sum = sum.add(asBigDecimal(lot.getNoteLot()));
        }

        return sum.divide(
                BigDecimal.valueOf(lots.size()),
                2,
                RoundingMode.HALF_UP
        );
    }

    // =====================================================
    // DÉCISION FINALE PAR LOT
    // =====================================================
    private String safe(String value) {
        return value == null || value.trim().isEmpty()
                ? "-"
                : value.trim();
    }
    @Transactional
    public SaveDecisionFinaleResponse saveDecisionFinaleParLot(
            Long applicationCandidatureId,
            SaveDecisionFinaleRequest request
    ) {
        ApplicationCandidature application =
                applicationCandidatureRepository.findById(applicationCandidatureId)
                        .orElseThrow(() -> new RuntimeException(
                                "Application candidature introuvable : " + applicationCandidatureId
                        ));

        if (request.getDecisionFinale() == null) {
            throw new RuntimeException("La décision finale est obligatoire.");
        }

        application.setDecisionFinale(request.getDecisionFinale());
        application.setObservationFinale(request.getObservationFinale());
        application.setDateDecision(LocalDateTime.now());
        application.setEvaluateurDecisionId(request.getEvaluateurId());

        applicationCandidatureRepository.save(application);

        Long candidatureId = application.getCandidature() != null
                ? application.getCandidature().getId()
                : null;

        String raisonSociale = application.getCandidature() != null
                ? application.getCandidature().getRaisonSociale()
                : "-";

        String nomLot = application.getLot() != null
                ? application.getLot().getNomLot()
                : "-";

        historiqueActionService.enregistrerAction(
                request.getEvaluateurId(),
                candidatureId,
                application.getId(),
                "EL_EMAR_DECISION_FINALE_LOT",
                "El Emar a enregistré la décision finale du lot. Candidature: "
                        + safe(raisonSociale)
                        + " | Lot: "
                        + safe(nomLot)
                        + " | Décision: "
                        + application.getDecisionFinale()
                        + " | Observation: "
                        + safe(application.getObservationFinale())
        );

        CandidatureDetailResponse detail = getCandidatureDetail(candidatureId);

        return SaveDecisionFinaleResponse.builder()
                .candidatureId(candidatureId)
                .applicationCandidatureId(application.getId())
                .decisionFinale(application.getDecisionFinale())
                .observationFinale(application.getObservationFinale())
                .noteLot(application.getNoteFinale())
                .noteGlobale(detail.getNoteGlobale())
                .statutLot(
                        application.getStatut() != null
                                ? application.getStatut().name()
                                : null
                )
                .build();
    }

    // =====================================================
    // PDF
    // =====================================================

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> openPieceCriterePdf(Long pieceDeposeeId) {
        Map<String, Object> row = jdbcTemplate.queryForMap(
                """
                SELECT nom_fichier, chemin_fichier, type_contenu
                FROM piece_critere_deposee
                WHERE id = ?
                """,
                pieceDeposeeId
        );

        return buildPdfResponse(
                asString(row.get("chemin_fichier")),
                asString(row.get("nom_fichier")),
                asString(row.get("type_contenu"))
        );
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> openRnePdf(Long candidatureId) {
        Map<String, Object> row = jdbcTemplate.queryForMap(
                """
                SELECT rne_nom_fichier, rne_chemin_fichier, rne_type_contenu
                FROM candidature
                WHERE id = ?
                """,
                candidatureId
        );

        return buildPdfResponse(
                asString(row.get("rne_chemin_fichier")),
                asString(row.get("rne_nom_fichier")),
                asString(row.get("rne_type_contenu"))
        );
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> openCnssPdf(Long candidatureId) {
        Map<String, Object> row = jdbcTemplate.queryForMap(
                """
                SELECT cnss_nom_fichier, cnss_chemin_fichier, cnss_type_contenu
                FROM candidature
                WHERE id = ?
                """,
                candidatureId
        );

        return buildPdfResponse(
                asString(row.get("cnss_chemin_fichier")),
                asString(row.get("cnss_nom_fichier")),
                asString(row.get("cnss_type_contenu"))
        );
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> openReferenceFile(
            Long projetReferenceId,
            String typeFichier
    ) {
        String type = typeFichier == null
                ? ""
                : typeFichier.trim().toUpperCase();

        if (!type.equals("P11") && !type.equals("P12")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Type fichier invalide"
            );
        }

        String column = type.equals("P11") ? "fichier_p11" : "fichier_p12";

        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT " + column + " AS chemin FROM projet_reference WHERE id = ?",
                projetReferenceId
        );

        String chemin = asString(row.get("chemin"));

        return buildPdfResponse(
                chemin,
                extractFileName(chemin),
                "application/pdf"
        );
    }

    private ResponseEntity<Resource> buildPdfResponse(
            String cheminFichier,
            String nomFichier,
            String typeContenu
    ) {
        if (!hasText(cheminFichier)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Fichier introuvable en base"
            );
        }

        try {
            Path path = Path.of(cheminFichier);

            if (!Files.exists(path)) {
                Path relativePath = Path.of(System.getProperty("user.dir"))
                        .resolve(cheminFichier)
                        .normalize();

                if (Files.exists(relativePath)) {
                    path = relativePath;
                }
            }

            if (!Files.exists(path)) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Fichier introuvable sur le serveur : " + cheminFichier
                );
            }

            Resource resource = new UrlResource(path.toUri());

            String fileName = hasText(nomFichier)
                    ? nomFichier
                    : extractFileName(cheminFichier);

            String contentType = hasText(typeContenu)
                    ? typeContenu
                    : "application/pdf";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            ContentDisposition.inline()
                                    .filename(fileName)
                                    .build()
                                    .toString()
                    )
                    .body(resource);

        } catch (MalformedURLException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur ouverture fichier PDF"
            );
        }
    }

    // =====================================================
    // HELPERS
    // =====================================================

    private String normalizeStatut(String statut) {
        String value = statut == null
                ? "A_VERIFIER"
                : statut.trim().toUpperCase();

        if (!List.of("A_VERIFIER", "CONFORME", "NON_CONFORME").contains(value)) {
            return "A_VERIFIER";
        }

        return value;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private BigDecimal asBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }

        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }

        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }

        try {
            return new BigDecimal(String.valueOf(value));
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal scale(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }

        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null
                ? null
                : timestamp.toLocalDateTime();
    }

    private LocalDate toLocalDate(Date date) {
        return date == null
                ? null
                : date.toLocalDate();
    }

    private String extractFileName(String path) {
        if (!hasText(path)) {
            return null;
        }

        String clean = path.replace("\\", "/");
        int index = clean.lastIndexOf('/');

        if (index >= 0 && index < clean.length() - 1) {
            return clean.substring(index + 1);
        }

        return clean;
    }
}