package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.ZoneRequest;
import com.elemar.backendelemar.dto.ZoneResponse;
import com.elemar.backendelemar.service.ZoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/zones")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ZoneController {

    private final ZoneService zoneService;

    @GetMapping
    public List<ZoneResponse> getAllZones() {
        return zoneService.getAllZones();
    }

    @GetMapping("/{id}")
    public ZoneResponse getZoneById(@PathVariable Long id) {
        return zoneService.getZoneById(id);
    }

    @PostMapping
    public ZoneResponse createZone(
            @Valid @RequestBody ZoneRequest request,
            @RequestHeader(value = "X-USER-ID", required = false) Long utilisateurId
    ) {
        return zoneService.createZone(request, utilisateurId);
    }

    @PutMapping("/{id}")
    public ZoneResponse updateZone(
            @PathVariable Long id,
            @Valid @RequestBody ZoneRequest request
    ) {
        return zoneService.updateZone(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteZone(@PathVariable Long id) {
        zoneService.deleteZone(id);
    }
}