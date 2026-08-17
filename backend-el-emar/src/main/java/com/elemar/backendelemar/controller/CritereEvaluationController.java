package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.CritereEvaluationRequest;
import com.elemar.backendelemar.dto.CritereEvaluationResponse;
import com.elemar.backendelemar.service.CritereEvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/criteres-evaluation")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class CritereEvaluationController {

    private final CritereEvaluationService critereEvaluationService;

    @GetMapping("/pieces/noms")
    public List<String> getPieceNames() {
        return critereEvaluationService.getPieceNames();
    }

    @GetMapping
    public List<CritereEvaluationResponse> getAll() {
        return critereEvaluationService.getAll();
    }

    @GetMapping("/{id}")
    public CritereEvaluationResponse getById(@PathVariable Long id) {
        return critereEvaluationService.getById(id);
    }

    @GetMapping("/lot/{lotId}")
    public List<CritereEvaluationResponse> getByLot(@PathVariable Long lotId) {
        return critereEvaluationService.getByLot(lotId);
    }

    @GetMapping("/lot/{lotId}/actifs")
    public List<CritereEvaluationResponse> getActiveByLot(@PathVariable Long lotId) {
        return critereEvaluationService.getActiveByLot(lotId);
    }

    @GetMapping("/lot/{lotId}/total")
    public BigDecimal getTotalByLot(@PathVariable Long lotId) {
        return critereEvaluationService.getTotalByLot(lotId);
    }

    @GetMapping("/lot/{lotId}/reste")
    public BigDecimal getResteByLot(@PathVariable Long lotId) {
        return critereEvaluationService.getResteByLot(lotId);
    }

    @PostMapping
    public CritereEvaluationResponse create(
            @RequestBody CritereEvaluationRequest request
    ) {
        return critereEvaluationService.create(request);
    }

    @PutMapping("/{id}")
    public CritereEvaluationResponse update(
            @PathVariable Long id,
            @RequestBody CritereEvaluationRequest request
    ) {
        return critereEvaluationService.update(id, request);
    }

    @PatchMapping("/{id}/deactivate")
    public void deactivate(@PathVariable Long id) {
        critereEvaluationService.deactivate(id);
    }

    @PatchMapping("/{id}/toggle-actif")
    public CritereEvaluationResponse toggleActif(@PathVariable Long id) {
        return critereEvaluationService.toggleActif(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        critereEvaluationService.delete(id);
    }
}
