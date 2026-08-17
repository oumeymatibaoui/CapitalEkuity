package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.CandidatureDetailResponse;
import com.elemar.backendelemar.dto.CandidatLotClassementResponse;
import com.elemar.backendelemar.dto.ElEmarCandidatureListItemResponse;
import com.elemar.backendelemar.dto.ElEmarCritereEvaluationResponse;
import com.elemar.backendelemar.dto.LotEvaluationResponse;
import com.elemar.backendelemar.dto.LotNoteResponse;
import com.elemar.backendelemar.dto.SaveCritereEvaluationResponse;
import com.elemar.backendelemar.dto.SaveDecisionFinaleResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EvaluationNoteVisibilityService {

    public static final String PERMISSION_VOIR_NOTE =
            "EVAL_ACTION_VOIR_NOTE";

    private final JdbcTemplate jdbcTemplate;
    private final CurrentUserService currentUserService;

    public boolean peutVoirNotes() {
        Long utilisateurId =
                currentUserService.getCurrentUserId();

        if (utilisateurId == null) {
            return false;
        }

        Boolean autorise = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM utilisateur u

                    JOIN role_acces r
                      ON r.id = u.role_id

                    WHERE u.id = ?
                      AND COALESCE(u.actif, FALSE) = TRUE
                      AND COALESCE(r.actif, FALSE) = TRUE
                      AND (
                            UPPER(TRIM(COALESCE(r.code_role, '')))
                                IN ('ADMIN', 'ROLE_ADMIN')
                            OR EXISTS (
                                SELECT 1
                                FROM role_module_acces rma

                                JOIN module_navbar m
                                  ON m.id = rma.module_id

                                WHERE rma.role_id = r.id
                                  AND COALESCE(rma.autorise, FALSE) = TRUE
                                  AND COALESCE(m.actif, FALSE) = TRUE
                                  AND UPPER(TRIM(m.code_module)) = ?
                            )
                      )
                )
                """,
                Boolean.class,
                utilisateurId,
                PERMISSION_VOIR_NOTE
        );

        return Boolean.TRUE.equals(autorise);
    }

    public CandidatureDetailResponse masquerSiInterdit(
            CandidatureDetailResponse detail
    ) {
        if (detail == null || peutVoirNotes()) {
            return detail;
        }

        detail.setNoteGlobale(null);

        if (detail.getLots() == null) {
            return detail;
        }

        for (LotEvaluationResponse lot : detail.getLots()) {
            if (lot == null) {
                continue;
            }

            lot.setNoteLot(null);

            if (lot.getCriteres() == null) {
                continue;
            }

            for (
                    ElEmarCritereEvaluationResponse critere
                    : lot.getCriteres()
            ) {
                if (critere == null) {
                    continue;
                }

                critere.setNoteMax(null);
                critere.setNoteObtenue(null);
            }
        }

        return detail;
    }

    public List<ElEmarCandidatureListItemResponse>
    masquerListeSiInterdit(
            List<ElEmarCandidatureListItemResponse> items
    ) {
        if (items == null || peutVoirNotes()) {
            return items;
        }

        for (ElEmarCandidatureListItemResponse item : items) {
            if (item == null) {
                continue;
            }

            item.setNoteGlobale(null);

            if (item.getLotsNotes() == null) {
                continue;
            }

            for (LotNoteResponse lot : item.getLotsNotes()) {
                if (lot != null) {
                    lot.setNoteLot(null);
                }
            }
        }

        return items;
    }

    public SaveCritereEvaluationResponse masquerSiInterdit(
            SaveCritereEvaluationResponse response
    ) {
        if (response == null || peutVoirNotes()) {
            return response;
        }

        response.setNoteObtenue(null);
        response.setNoteLot(null);
        response.setNoteGlobale(null);
        return response;
    }

    public SaveDecisionFinaleResponse masquerSiInterdit(
            SaveDecisionFinaleResponse response
    ) {
        if (response == null || peutVoirNotes()) {
            return response;
        }

        response.setNoteLot(null);
        response.setNoteGlobale(null);
        return response;
    }

    public Object masquerObjetSiInterdit(Object body) {
        if (body == null || !contientDonneesNote(body)) {
            return body;
        }

        if (peutVoirNotes()) {
            return body;
        }

        if (body instanceof CandidatureDetailResponse detail) {
            return masquerDetail(detail);
        }

        if (body instanceof ElEmarCandidatureListItemResponse item) {
            return masquerItemListe(item);
        }

        if (body instanceof SaveCritereEvaluationResponse response) {
            response.setNoteObtenue(null);
            response.setNoteLot(null);
            response.setNoteGlobale(null);
            return response;
        }

        if (body instanceof SaveDecisionFinaleResponse response) {
            response.setNoteLot(null);
            response.setNoteGlobale(null);
            return response;
        }

        if (body instanceof CandidatLotClassementResponse response) {
            response.setNoteLot(null);
            return response;
        }

        if (body instanceof List<?> list) {
            for (Object item : list) {
                masquerObjetSansNouvelleVerification(item);
            }
        }

        return body;
    }



    private boolean contientDonneesNote(Object body) {
        if (
                body instanceof CandidatureDetailResponse
                        || body instanceof ElEmarCandidatureListItemResponse
                        || body instanceof SaveCritereEvaluationResponse
                        || body instanceof SaveDecisionFinaleResponse
                        || body instanceof CandidatLotClassementResponse
        ) {
            return true;
        }

        if (body instanceof List<?> list) {
            return list.stream().anyMatch(this::contientDonneesNote);
        }

        return false;
    }
    private Object masquerObjetSansNouvelleVerification(Object body) {
        if (body instanceof CandidatureDetailResponse detail) {
            return masquerDetail(detail);
        }

        if (body instanceof ElEmarCandidatureListItemResponse item) {
            return masquerItemListe(item);
        }

        if (body instanceof SaveCritereEvaluationResponse response) {
            response.setNoteObtenue(null);
            response.setNoteLot(null);
            response.setNoteGlobale(null);
            return response;
        }

        if (body instanceof SaveDecisionFinaleResponse response) {
            response.setNoteLot(null);
            response.setNoteGlobale(null);
            return response;
        }

        if (body instanceof CandidatLotClassementResponse response) {
            response.setNoteLot(null);
            return response;
        }

        return body;
    }

    private CandidatureDetailResponse masquerDetail(
            CandidatureDetailResponse detail
    ) {
        detail.setNoteGlobale(null);

        if (detail.getLots() == null) {
            return detail;
        }

        for (LotEvaluationResponse lot : detail.getLots()) {
            if (lot == null) {
                continue;
            }

            lot.setNoteLot(null);

            if (lot.getCriteres() == null) {
                continue;
            }

            for (ElEmarCritereEvaluationResponse critere : lot.getCriteres()) {
                if (critere != null) {
                    critere.setNoteMax(null);
                    critere.setNoteObtenue(null);
                }
            }
        }

        return detail;
    }

    private ElEmarCandidatureListItemResponse masquerItemListe(
            ElEmarCandidatureListItemResponse item
    ) {
        item.setNoteGlobale(null);

        if (item.getLotsNotes() != null) {
            for (LotNoteResponse lot : item.getLotsNotes()) {
                if (lot != null) {
                    lot.setNoteLot(null);
                }
            }
        }

        return item;
    }

}