package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.CandidatureInfoRequest;
import com.elemar.backendelemar.dto.CandidatureResponse;
import com.elemar.backendelemar.dto.LotOptionResponse;
import com.elemar.backendelemar.entity.ApplicationCandidature;
import com.elemar.backendelemar.entity.Candidature;
import com.elemar.backendelemar.entity.Utilisateur;
import com.elemar.backendelemar.enums.StatutApplication;
import com.elemar.backendelemar.enums.StatutCandidature;
import com.elemar.backendelemar.repository.ApplicationCandidatureRepository;
import com.elemar.backendelemar.repository.CandidatureLotRepository;
import com.elemar.backendelemar.repository.CandidatureRepository;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CandidatCandidatureService {

    private final CandidatureLotRepository candidatureLotRepository;
    private final CandidatureRepository candidatureRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final ApplicationCandidatureRepository applicationCandidatureRepository;
    private final JdbcTemplate jdbcTemplate;
    private final HistoriqueActionService historiqueActionService;
    private final PdfFileSecurityService pdfFileSecurityService;
    // =========================================================
    // GET OR CREATE CANDIDATURE
    // =========================================================

    @Transactional
    public CandidatureResponse getOrCreateCurrent(Long utilisateurId) {

        Candidature candidature = getCandidatureConnectee(utilisateurId);

        historiqueActionService.enregistrerAction(
                utilisateurId,
                candidature.getId(),
                null,
                "CONSULTATION_CANDIDATURE",
                "Le candidat a ouvert son espace candidature."
        );

        return toResponse(candidature);
    }

    private Candidature getCandidatureConnectee(Long utilisateurId) {

        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable"
                ));

        if (utilisateur.getCandidature() != null
                && utilisateur.getCandidature().getId() != null) {

            return candidatureRepository
                    .findById(utilisateur.getCandidature().getId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "La candidature liée à cet utilisateur est introuvable"
                    ));
        }

        Candidature candidatureExistante = candidatureRepository
                .findFirstByUtilisateur_IdOrderByIdDesc(utilisateurId)
                .orElse(null);

        if (candidatureExistante != null) {
            utilisateur.setCandidature(candidatureExistante);
            utilisateurRepository.save(utilisateur);

            return candidatureExistante;
        }

        Candidature nouvelleCandidature = createEmptyCandidature(utilisateurId);

        utilisateur.setCandidature(nouvelleCandidature);
        utilisateurRepository.save(utilisateur);

        return nouvelleCandidature;
    }

    private Candidature createEmptyCandidature(Long utilisateurId) {

        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable"
                ));

        Candidature candidature = Candidature.builder()
//                .utilisateur(utilisateur)
                .statut(StatutCandidature.BROUILLON)
                .accesBloque(false)
                .rneStatut("NON_DEPOSE")
                .cnssStatut("NON_DEPOSE")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Candidature saved = candidatureRepository.save(candidature);

        utilisateur.setCandidature(saved);
        utilisateurRepository.save(utilisateur);

        historiqueActionService.enregistrerAction(
                utilisateurId,
                saved.getId(),
                null,
                "CREATION_CANDIDATURE",
                "Création automatique d’une candidature brouillon pour le candidat."
        );

        return saved;
    }

    // =========================================================
    // UPDATE STEP 1 SOCIETE
    // =========================================================

    @Transactional
    public CandidatureResponse updateInformationsSociete(
            Long utilisateurId,
            CandidatureInfoRequest request
    ) {
        Candidature candidature = getCandidatureConnectee(utilisateurId);

        String ancienneValeur =
                "Raison sociale: " + safe(candidature.getRaisonSociale())
                        + ", Email: " + safe(candidature.getEmailPrincipal())
                        + ", Téléphone: " + safe(candidature.getTelephone());

        candidature.setRaisonSociale(clean(request.getRaisonSociale()));
        candidature.setFormeJuridique(clean(request.getFormeJuridique()));
        candidature.setRneMatriculeFiscal(clean(request.getRneMatriculeFiscal()));
        candidature.setDateCreationBureau(request.getDateCreationBureau());

        candidature.setAdresseSiege(clean(request.getAdresseSiege()));
        candidature.setTelephone(clean(request.getTelephone()));
        candidature.setEmailPrincipal(clean(request.getEmailPrincipal()));
        candidature.setSiteInternet(clean(request.getSiteInternet()));
        candidature.setVille(clean(request.getVille()));

        candidature.setRepresentantLegal(clean(request.getRepresentantLegal()));
        candidature.setFonctionRepresentant(clean(request.getFonctionRepresentant()));

        candidature.setSpecialites(clean(request.getSpecialites()));
        candidature.setAgrementsCertifications(clean(request.getAgrementsCertifications()));

        candidature.setBanquePrincipale(clean(request.getBanquePrincipale()));
        candidature.setLocalisation(clean(request.getLocalisation()));

        if (candidature.getStatut() == null) {
            candidature.setStatut(StatutCandidature.BROUILLON);
        }

        if (candidature.getAccesBloque() == null) {
            candidature.setAccesBloque(false);
        }

        if (candidature.getRneStatut() == null) {
            candidature.setRneStatut("NON_DEPOSE");
        }

        if (candidature.getCnssStatut() == null) {
            candidature.setCnssStatut("NON_DEPOSE");
        }

        if (candidature.getCreatedAt() == null) {
            candidature.setCreatedAt(LocalDateTime.now());
        }

        candidature.setUpdatedAt(LocalDateTime.now());

        Candidature saved = candidatureRepository.save(candidature);

        String nouvelleValeur =
                "Raison sociale: " + safe(saved.getRaisonSociale())
                        + ", Email: " + safe(saved.getEmailPrincipal())
                        + ", Téléphone: " + safe(saved.getTelephone());

        historiqueActionService.enregistrerAction(
                utilisateurId,
                saved.getId(),
                null,
                "MODIFICATION_INFOS_SOCIETE",
                "Le candidat a modifié les informations générales de la société. Ancien: "
                        + ancienneValeur
                        + " | Nouveau: "
                        + nouvelleValeur
        );

        return toResponse(saved);
    }

    // =========================================================
    // UPLOAD RNE
    // =========================================================

    @Transactional
    public CandidatureResponse uploadRne(
            Long candidatureId,
            MultipartFile file
    ) {
        Candidature candidature =
                findCandidature(candidatureId);

        String ancienFichier =
                candidature.getRneNomFichier();

        String ancienChemin =
                candidature.getRneCheminFichier();

        PdfFileSecurityService.StoredPdf storedPdf =
                pdfFileSecurityService
                        .validateAndStoreCandidaturePdf(
                                candidatureId,
                                "RNE",
                                file
                        );

        try {
            candidature.setRneNomFichier(
                    storedPdf.originalFileName()
            );
            candidature.setRneCheminFichier(
                    storedPdf.storedPath()
            );
            candidature.setRneTypeContenu(
                    PdfFileSecurityService.PDF_CONTENT_TYPE
            );
            candidature.setRneTailleFichier(
                    storedPdf.size()
            );
            candidature.setRneStatut("DEPOSE");
            candidature.setUpdatedAt(LocalDateTime.now());

            Candidature saved =
                    candidatureRepository.save(candidature);

            Long utilisateurId =
                    getUtilisateurIdFromCandidature(saved);

            historiqueActionService.enregistrerAction(
                    utilisateurId,
                    saved.getId(),
                    null,
                    "UPLOAD_RNE",
                    "Le candidat a déposé ou modifié le fichier RNE."
                            + " Ancien fichier : "
                            + safe(ancienFichier)
                            + " | Nouveau fichier : "
                            + safe(storedPdf.originalFileName())
            );

            if (ancienChemin != null
                    && !ancienChemin.equals(
                    storedPdf.storedPath()
            )) {
                pdfFileSecurityService
                        .deleteStoredFileQuietly(
                                ancienChemin
                        );
            }

            return toResponse(saved);

        } catch (RuntimeException ex) {
            pdfFileSecurityService
                    .deleteStoredFileQuietly(
                            storedPdf.storedPath()
                    );
            throw ex;
        }
    }

    // =========================================================
    // UPLOAD CNSS
    // =========================================================

    @Transactional
    public CandidatureResponse uploadCnss(
            Long candidatureId,
            MultipartFile file
    ) {
        Candidature candidature =
                findCandidature(candidatureId);

        String ancienFichier =
                candidature.getCnssNomFichier();

        String ancienChemin =
                candidature.getCnssCheminFichier();

        PdfFileSecurityService.StoredPdf storedPdf =
                pdfFileSecurityService
                        .validateAndStoreCandidaturePdf(
                                candidatureId,
                                "CNSS",
                                file
                        );

        try {
            candidature.setCnssNomFichier(
                    storedPdf.originalFileName()
            );
            candidature.setCnssCheminFichier(
                    storedPdf.storedPath()
            );
            candidature.setCnssTypeContenu(
                    PdfFileSecurityService.PDF_CONTENT_TYPE
            );
            candidature.setCnssTailleFichier(
                    storedPdf.size()
            );
            candidature.setCnssStatut("DEPOSE");
            candidature.setUpdatedAt(LocalDateTime.now());

            Candidature saved =
                    candidatureRepository.save(candidature);

            Long utilisateurId =
                    getUtilisateurIdFromCandidature(saved);

            historiqueActionService.enregistrerAction(
                    utilisateurId,
                    saved.getId(),
                    null,
                    "UPLOAD_CNSS",
                    "Le candidat a déposé ou modifié le fichier CNSS."
                            + " Ancien fichier : "
                            + safe(ancienFichier)
                            + " | Nouveau fichier : "
                            + safe(storedPdf.originalFileName())
            );

            if (ancienChemin != null
                    && !ancienChemin.equals(
                    storedPdf.storedPath()
            )) {
                pdfFileSecurityService
                        .deleteStoredFileQuietly(
                                ancienChemin
                        );
            }

            return toResponse(saved);

        } catch (RuntimeException ex) {
            pdfFileSecurityService
                    .deleteStoredFileQuietly(
                            storedPdf.storedPath()
                    );
            throw ex;
        }
    }

    // =========================================================
    // SUBMIT CANDIDATURE
    // =========================================================

    @Transactional
    public CandidatureResponse submitCandidature(Long candidatureId) {

        Candidature candidature = candidatureRepository.findById(candidatureId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Candidature introuvable"
                ));

        List<ApplicationCandidature> applications =
                applicationCandidatureRepository.findByCandidature_Id(candidatureId);

        if (applications.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vous devez remplir au moins un lot avant de soumettre."
            );
        }

        candidature.setStatut(StatutCandidature.SOUMIS);
        candidature.setAccesBloque(true);
        candidature.setDateSoumission(LocalDateTime.now());
        candidature.setUpdatedAt(LocalDateTime.now());

        for (ApplicationCandidature application : applications) {
            application.setStatut(StatutApplication.SOUMIS);
            application.setDateSoumission(LocalDateTime.now());
        }

        applicationCandidatureRepository.saveAll(applications);

        Candidature saved = candidatureRepository.save(candidature);

        Long utilisateurId = getUtilisateurIdFromCandidature(saved);

        historiqueActionService.enregistrerAction(
                utilisateurId,
                saved.getId(),
                null,
                "SOUMISSION_CANDIDATURE",
                "Le candidat a soumis définitivement sa candidature. Nombre de lots soumis: "
                        + applications.size()
        );

        return toResponse(saved);
    }

    // =========================================================
    // LOTS AUTORISES
    // =========================================================

    @Transactional(readOnly = true)
    public List<LotOptionResponse> getLotsAutorises(Long candidatureId) {

        String sql = """
            SELECT DISTINCT
                l.id AS lot_id,
                l.code_lot,
                l.nom_lot,
                l.type_intervenant_id,
                ti.code AS type_intervenant_code,
                ti.libelle AS type_intervenant_libelle,
                COALESCE(l.actif, true) AS lot_actif
            FROM candidature_lot cl
            JOIN lot l
                ON l.id = cl.lot_id
            LEFT JOIN type_intervenant ti
                ON ti.id = l.type_intervenant_id
            WHERE cl.candidature_id = ?
              AND COALESCE(cl.actif, true) = true
              AND COALESCE(l.actif, true) = true
            ORDER BY l.nom_lot ASC
            """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> LotOptionResponse.builder()
                        .id(rs.getLong("lot_id"))
                        .codeLot(rs.getString("code_lot"))
                        .nomLot(rs.getString("nom_lot"))
                        .typeIntervenantId(
                                rs.getObject("type_intervenant_id") != null
                                        ? rs.getLong("type_intervenant_id")
                                        : null
                        )
                        .typeIntervenantCode(rs.getString("type_intervenant_code"))
                        .typeIntervenantLibelle(rs.getString("type_intervenant_libelle"))
                        .actif(rs.getBoolean("lot_actif"))
                        .build(),
                candidatureId
        );
    }
    // =========================================================
    // HELPERS
    // =========================================================
    @Transactional
    public void deleteCandidature(Long candidatureId) {

        if (candidatureId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant candidature obligatoire."
            );
        }

        Integer exists = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM candidature
                WHERE id = ?
                """,
                Integer.class,
                candidatureId
        );

        if (exists == null || exists == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Candidature introuvable."
            );
        }

    /*
     Suppression logique :
     On garde l'historique et les relations, mais on masque la candidature.
    */

        jdbcTemplate.update(
                """
                UPDATE candidature
                SET actif = false,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                candidatureId
        );

        jdbcTemplate.update(
                """
                UPDATE candidature_lot
                SET actif = false
                WHERE candidature_id = ?
                """,
                candidatureId
        );

        jdbcTemplate.update(
                """
                UPDATE utilisateur
                SET actif = false,
                    updated_at = CURRENT_TIMESTAMP
                WHERE candidature_id = ?
                """,
                candidatureId
        );

        try {
            jdbcTemplate.update(
                    """
                    UPDATE application_candidature
                    SET actif = false,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE candidature_id = ?
                    """,
                    candidatureId
            );
        } catch (Exception ignored) {
        /*
         Si application_candidature n'a pas la colonne actif ou updated_at,
         on ignore pour ne pas bloquer la suppression logique.
        */
        }
    }
    private Candidature findCandidature(Long candidatureId) {
        return candidatureRepository.findById(candidatureId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Candidature introuvable"
                ));
    }

    private Long getUtilisateurIdFromCandidature(Candidature candidature) {

        if (candidature == null) {
            return null;
        }

//        if (candidature.getUtilisateur() != null
//                && candidature.getUtilisateur().getId() != null) {
//            return candidature.getUtilisateur().getId();
//        }

        return getUtilisateurIdFromCandidatureId(candidature.getId());
    }

    private Long getUtilisateurIdFromCandidatureId(Long candidatureId) {

        if (candidatureId == null) {
            return null;
        }

        String sql = """
                SELECT u.id
                FROM utilisateur u
                WHERE u.candidature_id = ?
                LIMIT 1
                """;

        List<Long> ids = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> rs.getLong("id"),
                candidatureId
        );

        return ids.isEmpty() ? null : ids.get(0);
    }

    private CandidatureResponse toResponse(Candidature candidature) {
        return CandidatureResponse.builder()
                .id(candidature.getId())

//                .utilisateurId(
//                        candidature.getUtilisateur() != null
//                                ? candidature.getUtilisateur().getId()
//                                : null
//                )
//                .appelCandidatureId(
//                        candidature.getAppelCandidature() != null
//                                ? candidature.getAppelCandidature().getId()
//                                : null
//                )
                .creeParUtilisateurId(
                        candidature.getCreeParUtilisateur() != null
                                ? candidature.getCreeParUtilisateur().getId()
                                : null
                )

                .raisonSociale(candidature.getRaisonSociale())
                .formeJuridique(candidature.getFormeJuridique())
                .rneMatriculeFiscal(candidature.getRneMatriculeFiscal())
                .dateCreationBureau(candidature.getDateCreationBureau())

                .adresseSiege(candidature.getAdresseSiege())
                .telephone(candidature.getTelephone())
                .emailPrincipal(candidature.getEmailPrincipal())
                .siteInternet(candidature.getSiteInternet())
                .ville(candidature.getVille())

                .representantLegal(candidature.getRepresentantLegal())
                .fonctionRepresentant(candidature.getFonctionRepresentant())

                .specialites(candidature.getSpecialites())
                .agrementsCertifications(candidature.getAgrementsCertifications())

                .banquePrincipale(candidature.getBanquePrincipale())
                .localisation(candidature.getLocalisation())

                .lienAcces(candidature.getLienAcces())
                .tokenAcces(candidature.getTokenAcces())
                .dateExpirationAcces(candidature.getDateExpirationAcces())

                .statut(candidature.getStatut())
                .accesBloque(candidature.getAccesBloque())
                .dateSoumission(candidature.getDateSoumission())

                .rneNomFichier(candidature.getRneNomFichier())
                .rneCheminFichier(candidature.getRneCheminFichier())
                .rneTypeContenu(candidature.getRneTypeContenu())
                .rneTailleFichier(candidature.getRneTailleFichier())
                .rneStatut(candidature.getRneStatut())

                .cnssNomFichier(candidature.getCnssNomFichier())
                .cnssCheminFichier(candidature.getCnssCheminFichier())
                .cnssTypeContenu(candidature.getCnssTypeContenu())
                .cnssTailleFichier(candidature.getCnssTailleFichier())
                .cnssStatut(candidature.getCnssStatut())

                .createdAt(candidature.getCreatedAt())
                .updatedAt(candidature.getUpdatedAt())
                .build();
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }

    private String safe(String value) {
        return value == null || value.trim().isEmpty()
                ? "-"
                : value.trim();
    }
}