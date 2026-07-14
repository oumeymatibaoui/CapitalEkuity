package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.CategorieEvaluationRequest;
import com.elemar.backendelemar.dto.CategorieEvaluationResponse;
import com.elemar.backendelemar.service.CategorieEvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories-evaluation")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class CategorieEvaluationController {

    private final CategorieEvaluationService categorieService;

    @GetMapping
    public List<CategorieEvaluationResponse> getByScope(
            @RequestParam Long typeIntervenantId,
            @RequestParam(required = false) Long lotId,
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly
    ) {
        return categorieService.getByScope(typeIntervenantId, lotId, activeOnly);
    }

    @GetMapping("/{id}")
    public CategorieEvaluationResponse getById(@PathVariable Long id) {
        return categorieService.getById(id);
    }

    @PostMapping
    public CategorieEvaluationResponse create(
            @RequestBody CategorieEvaluationRequest request
    ) {
        return categorieService.create(request);
    }

    @PutMapping("/{id}")
    public CategorieEvaluationResponse update(
            @PathVariable Long id,
            @RequestBody CategorieEvaluationRequest request
    ) {
        return categorieService.update(id, request);
    }

    @PatchMapping("/{id}/toggle-actif")
    public CategorieEvaluationResponse toggleActif(@PathVariable Long id) {
        return categorieService.toggleActif(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        categorieService.delete(id);
    }
}