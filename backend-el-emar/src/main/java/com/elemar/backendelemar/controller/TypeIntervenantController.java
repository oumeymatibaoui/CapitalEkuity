package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.TypeIntervenantRequest;
import com.elemar.backendelemar.dto.TypeIntervenantResponse;
import com.elemar.backendelemar.service.TypeIntervenantService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/types-intervenant")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TypeIntervenantController {

    private final TypeIntervenantService typeIntervenantService;

    @GetMapping
    public List<TypeIntervenantResponse> getAllTypes(
            @RequestParam(required = false) Boolean activeOnly
    ) {
        if (Boolean.TRUE.equals(activeOnly)) {
            return typeIntervenantService.getActiveTypes();
        }

        return typeIntervenantService.getAllTypes();
    }

    @GetMapping("/{id}")
    public TypeIntervenantResponse getTypeById(@PathVariable Long id) {
        return typeIntervenantService.getTypeById(id);
    }

    @PostMapping
    public TypeIntervenantResponse createType(
            @RequestBody TypeIntervenantRequest request
    ) {
        return typeIntervenantService.createType(request);
    }

    @PutMapping("/{id}")
    public TypeIntervenantResponse updateType(
            @PathVariable Long id,
            @RequestBody TypeIntervenantRequest request
    ) {
        return typeIntervenantService.updateType(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteType(@PathVariable Long id) {
        typeIntervenantService.deleteType(id);
    }
}