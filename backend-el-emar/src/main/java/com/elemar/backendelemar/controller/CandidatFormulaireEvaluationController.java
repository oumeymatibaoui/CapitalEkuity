package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.FormulaireLotCandidatResponse;
import com.elemar.backendelemar.service.CandidatFormulaireEvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cnd/formulaire-evaluation")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class CandidatFormulaireEvaluationController {

    private final CandidatFormulaireEvaluationService formulaireEvaluationService;

    @GetMapping("/lots/{lotId}")
    public FormulaireLotCandidatResponse getFormulaireByLot(@PathVariable Long lotId) {
        return formulaireEvaluationService.getFormulaireByLot(lotId);
    }
}