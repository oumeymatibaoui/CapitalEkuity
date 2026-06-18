package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.ChampAppreciationRequest;
import com.elemar.backendelemar.dto.ChampAppreciationResponse;
import com.elemar.backendelemar.service.ChampAppreciationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/champs-appreciation")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ChampAppreciationController {

    private final ChampAppreciationService champService;

    @GetMapping
    public List<ChampAppreciationResponse> getAllChamps() {
        return champService.getAllChamps();
    }

    @GetMapping("/lot/{lotId}")
    public List<ChampAppreciationResponse> getChampsByLot(@PathVariable Long lotId) {
        return champService.getChampsByLot(lotId);
    }

    @GetMapping("/{id}")
    public ChampAppreciationResponse getChampById(@PathVariable Long id) {
        return champService.getChampById(id);
    }

    @PostMapping
    public ChampAppreciationResponse createChamp(
            @Valid @RequestBody ChampAppreciationRequest request
    ) {
        return champService.createChamp(request);
    }

    @PutMapping("/{id}")
    public ChampAppreciationResponse updateChamp(
            @PathVariable Long id,
            @Valid @RequestBody ChampAppreciationRequest request
    ) {
        return champService.updateChamp(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteChamp(@PathVariable Long id) {
        champService.deleteChamp(id);
    }
}