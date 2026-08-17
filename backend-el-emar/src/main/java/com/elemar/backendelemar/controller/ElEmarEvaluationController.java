package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.*;
import com.elemar.backendelemar.security.IdCryptoService;
import com.elemar.backendelemar.security.IdResource;
import com.elemar.backendelemar.service.ElEmarEvaluationService;

import lombok.RequiredArgsConstructor;

import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/el-emar/evaluations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ElEmarEvaluationController {

    private final ElEmarEvaluationService
            elEmarEvaluationService;

    private final IdCryptoService
            idCryptoService;

    // =====================================================
    // CLASSEMENT CANDIDATS PAR LOT
    // =====================================================

    /*
     * Pas encore migré vers références chiffrées.
     *
     * Aucun identifiant n'est reçu dans l'URL ici.
     */
    @GetMapping("/classement-candidats-par-lot")
    public List<CandidatLotClassementResponse>
    getClassementCandidatsParLot(
            @RequestParam(defaultValue = "80")
            BigDecimal minNote,

            @RequestParam(defaultValue = "false")
            Boolean admisOnly
    ) {

        return elEmarEvaluationService
                .getClassementCandidatsParLot(
                        minNote,
                        admisOnly
                );
    }

    // =====================================================
    // LISTE DES CANDIDATURES
    // =====================================================

    /*
     * Le service retourne maintenant :
     *
     * candidatureId  -> temporaire / compatibilité
     * candidatureRef -> à utiliser par Angular
     */
    @GetMapping("/candidatures")
    public List<ElEmarCandidatureListItemResponse>
    getCandidaturesSoumises(
            @RequestParam(required = false)
            Long typeIntervenantId
    ) {

        return elEmarEvaluationService
                .getCandidaturesSoumises(
                        typeIntervenantId
                );
    }

    // =====================================================
    // DETAIL CANDIDATURE
    // =====================================================

    /*
     * AVANT :
     *
     * GET /candidatures/15
     *
     * APRES :
     *
     * GET /candidatures/v1.CANDIDATURE.xxxxx
     */
    @GetMapping(
            "/candidatures/{candidatureRef}"
    )
    public CandidatureDetailResponse
    getCandidatureDetail(
            @PathVariable
            String candidatureRef
    ) {

        Long candidatureId =
                decryptCandidatureRef(
                        candidatureRef
                );

        return elEmarEvaluationService
                .getCandidatureDetail(
                        candidatureId
                );
    }

    // =====================================================
    // SOLVABILITE
    // =====================================================

    /*
     * AVANT :
     *
     * PUT /candidatures/15/solvabilite
     *
     * APRES :
     *
     * PUT /candidatures/{candidatureRef}/solvabilite
     */
    @PutMapping(
            "/candidatures/{candidatureRef}/solvabilite"
    )
    public SaveSolvabiliteResponse
    saveSolvabilite(
            @PathVariable
            String candidatureRef,

            @RequestBody
            SaveSolvabiliteRequest request
    ) {

        Long candidatureId =
                decryptCandidatureRef(
                        candidatureRef
                );

        return elEmarEvaluationService
                .saveSolvabilite(
                        candidatureId,
                        request
                );
    }

    // =====================================================
    // DOCUMENTS RNE / CNSS
    // =====================================================

    /*
     * AVANT :
     *
     * PUT /candidatures/15/documents-statut
     *
     * APRES :
     *
     * PUT /candidatures/{candidatureRef}/documents-statut
     */
    @PutMapping(
            "/candidatures/{candidatureRef}/documents-statut"
    )
    public SaveDocumentsStatutResponse
    saveDocumentsStatut(
            @PathVariable
            String candidatureRef,

            @RequestBody
            SaveDocumentsStatutRequest request
    ) {

        Long candidatureId =
                decryptCandidatureRef(
                        candidatureRef
                );

        return elEmarEvaluationService
                .saveDocumentsStatut(
                        candidatureId,
                        request
                );
    }

    // =====================================================
    // PDF RNE
    // =====================================================

    /*
     * AVANT :
     *
     * GET /candidatures/15/rne/pdf
     *
     * APRES :
     *
     * GET /candidatures/{candidatureRef}/rne/pdf
     */
    @GetMapping(
            "/candidatures/{candidatureRef}/rne/pdf"
    )
    public ResponseEntity<Resource>
    openRnePdf(
            @PathVariable
            String candidatureRef
    ) {

        Long candidatureId =
                decryptCandidatureRef(
                        candidatureRef
                );

        return elEmarEvaluationService
                .openRnePdf(
                        candidatureId
                );
    }

    // =====================================================
    // PDF CNSS
    // =====================================================

    /*
     * AVANT :
     *
     * GET /candidatures/15/cnss/pdf
     *
     * APRES :
     *
     * GET /candidatures/{candidatureRef}/cnss/pdf
     */
    @GetMapping(
            "/candidatures/{candidatureRef}/cnss/pdf"
    )
    public ResponseEntity<Resource>
    openCnssPdf(
            @PathVariable
            String candidatureRef
    ) {

        Long candidatureId =
                decryptCandidatureRef(
                        candidatureRef
                );

        return elEmarEvaluationService
                .openCnssPdf(
                        candidatureId
                );
    }

    // =====================================================
    // EVALUATION CRITERE
    // =====================================================

    /*
     * ATTENTION :
     *
     * Pour le moment ON NE CHANGE PAS encore :
     *
     * applicationCandidatureId
     * reponseCritereId
     *
     * Cette migration viendra après que candidatureRef
     * fonctionne correctement.
     */
    @PutMapping(
            "/applications/{applicationCandidatureId}/reponses/{reponseCritereId}"
    )
    public SaveCritereEvaluationResponse
    saveCritereEvaluation(
            @PathVariable
            Long applicationCandidatureId,

            @PathVariable
            Long reponseCritereId,

            @RequestParam(required = false)
            Long evaluateurId,

            @RequestBody
            SaveCritereEvaluationRequest request
    ) {

        /*
         * Compatibilité temporaire avec ton frontend actuel.
         *
         * L'identité réellement utilisée par ton service
         * vient déjà du JWT via CurrentUserService /
         * requireActionPermission().
         */
        if (
                request != null
                        &&
                        request.getEvaluateurId() == null
        ) {

            request.setEvaluateurId(
                    evaluateurId
            );
        }

        return elEmarEvaluationService
                .saveCritereEvaluation(
                        applicationCandidatureId,
                        reponseCritereId,
                        request
                );
    }

    // =====================================================
    // DECISION FINALE PAR LOT
    // =====================================================

    /*
     * applicationCandidatureId reste numérique
     * temporairement.
     *
     * On le migrera ensuite vers applicationRef.
     */
    @PutMapping(
            "/applications/{applicationCandidatureId}/decision-finale"
    )
    public SaveDecisionFinaleResponse
    saveDecisionFinaleParLot(
            @PathVariable
            Long applicationCandidatureId,

            @RequestParam(required = false)
            Long evaluateurId,

            @RequestBody
            SaveDecisionFinaleRequest request
    ) {

        /*
         * Compatibilité temporaire.
         *
         * Le service ne fait pas confiance à cet ID
         * pour déterminer l'utilisateur connecté.
         */
        if (
                request != null
                        &&
                        request.getEvaluateurId() == null
        ) {

            request.setEvaluateurId(
                    evaluateurId
            );
        }

        return elEmarEvaluationService
                .saveDecisionFinaleParLot(
                        applicationCandidatureId,
                        request
                );
    }

    // =====================================================
    // PDF PIECE CRITERE
    // =====================================================

    /*
     * Pas encore migré.
     *
     * AVANT/APRES pour cette ressource sera fait
     * dans l'étape suivante :
     *
     * pieceDeposeeId -> pieceRef
     */
    @GetMapping(
            "/pieces/{pieceDeposeeId}/pdf"
    )
    public ResponseEntity<Resource>
    openPieceCriterePdf(
            @PathVariable
            Long pieceDeposeeId
    ) {

        return elEmarEvaluationService
                .openPieceCriterePdf(
                        pieceDeposeeId
                );
    }

    // =====================================================
    // FICHIERS REFERENCES P11 / P12
    // =====================================================

    /*
     * Pas encore migré.
     *
     * projetReferenceId -> referenceRef
     * viendra dans une prochaine étape.
     */
    @GetMapping(
            "/references/{projetReferenceId}/files/{typeFichier}"
    )
    public ResponseEntity<Resource>
    openReferenceFile(
            @PathVariable
            Long projetReferenceId,

            @PathVariable
            String typeFichier
    ) {

        return elEmarEvaluationService
                .openReferenceFile(
                        projetReferenceId,
                        typeFichier
                );
    }

    // =====================================================
    // DECHIFFREMENT CENTRAL CANDIDATURE
    // =====================================================

    /**
     * Toutes les routes concernant une candidature
     * passent par cette méthode.
     *
     * Exemple :
     *
     * v1.CANDIDATURE.xxxxxx
     *
     *             ↓
     *
     * candidatureId = 15L
     *
     * Le reste du backend continue donc à fonctionner
     * exactement avec les Long existants.
     */
    private Long decryptCandidatureRef(
            String candidatureRef
    ) {

        return idCryptoService.decryptId(
                candidatureRef,
                IdResource.CANDIDATURE
        );
    }
}