package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.AppelCandidatureRequest;
import com.elemar.backendelemar.dto.AppelCandidatureResponse;
import com.elemar.backendelemar.service.AppelCandidatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appels")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class AppelCandidatureController {

    private final AppelCandidatureService appelService;

    @GetMapping
    public List<AppelCandidatureResponse> getAllAppels() {
        return appelService.getAllAppels();
    }

    @GetMapping("/{id}")
    public AppelCandidatureResponse getAppelById(@PathVariable Long id) {
        return appelService.getAppelById(id);
    }

    @PostMapping
    public AppelCandidatureResponse createAppel(@RequestBody AppelCandidatureRequest request) {
        return appelService.createAppel(request);
    }

    @PutMapping("/{id}")
    public AppelCandidatureResponse updateAppel(
            @PathVariable Long id,
            @RequestBody AppelCandidatureRequest request
    ) {
        return appelService.updateAppel(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteAppel(@PathVariable Long id) {
        appelService.deleteAppel(id);
    }
}