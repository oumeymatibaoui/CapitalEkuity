package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.LotRequest;
import com.elemar.backendelemar.dto.LotResponse;
import com.elemar.backendelemar.service.LotService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lots")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LotController {

    private final LotService lotService;

    @GetMapping
    public List<LotResponse> getAllLots(
            @RequestParam(required = false) Long typeIntervenantId
    ) {
        return lotService.getAllLots(typeIntervenantId);
    }

    @GetMapping("/{id}")
    public LotResponse getLotById(@PathVariable Long id) {
        return lotService.getLotById(id);
    }

    @PostMapping
    public LotResponse createLot(@RequestBody LotRequest request) {
        return lotService.createLot(request);
    }

    @PutMapping("/{id}")
    public LotResponse updateLot(
            @PathVariable Long id,
            @RequestBody LotRequest request
    ) {
        return lotService.updateLot(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteLot(@PathVariable Long id) {
        lotService.deleteLot(id);
    }
}