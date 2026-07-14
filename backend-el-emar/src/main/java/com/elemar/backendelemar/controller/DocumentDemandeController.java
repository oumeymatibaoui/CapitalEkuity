package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.DocumentDemandeRequest;
import com.elemar.backendelemar.dto.DocumentDemandeResponse;
import com.elemar.backendelemar.service.DocumentDemandeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/documents-demandes")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class DocumentDemandeController {
//
//    private final DocumentDemandeService documentDemandeService;
//
//    @GetMapping
//    public List<DocumentDemandeResponse> getAll() {
//        return documentDemandeService.getAll();
//    }
//
//    @GetMapping("/actifs")
//    public List<DocumentDemandeResponse> getActifs() {
//        return documentDemandeService.getActifs();
//    }
//
//    @GetMapping("/{id}")
//    public DocumentDemandeResponse getById(@PathVariable Long id) {
//        return documentDemandeService.getById(id);
//    }
//
//    @PostMapping
//    public DocumentDemandeResponse create(@RequestBody DocumentDemandeRequest request) {
//        return documentDemandeService.create(request);
//    }
//
//    @PutMapping("/{id}")
//    public DocumentDemandeResponse update(
//            @PathVariable Long id,
//            @RequestBody DocumentDemandeRequest request
//    ) {
//        return documentDemandeService.update(id, request);
//    }
//
//    @PatchMapping("/{id}/deactivate")
//    public void deactivate(@PathVariable Long id) {
//        documentDemandeService.deactivate(id);
//    }
//
//    @DeleteMapping("/{id}")
//    public void delete(@PathVariable Long id) {
//        documentDemandeService.delete(id);
//    }
//    @PatchMapping("/{id}/toggle-actif")
//    public DocumentDemandeResponse toggleActif(@PathVariable Long id) {
//        return documentDemandeService.toggleActif(id);
//    }
}