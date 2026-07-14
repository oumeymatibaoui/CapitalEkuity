package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.ClassementZoneResponse;
import com.elemar.backendelemar.dto.SaveReferenceZoneRequest;
import com.elemar.backendelemar.service.ClassementZoneService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/el-emar/evaluations/zones")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ClassementZoneController {

    private final ClassementZoneService classementZoneService;

    @PostMapping("/valider-reference")
    public ClassementZoneResponse validerReferenceZone(
            @RequestBody SaveReferenceZoneRequest request
    ) {
        return classementZoneService.validerReferenceZoneEtCalculerClassement(request);
    }

    @GetMapping("/classements")
    public List<ClassementZoneResponse> getClassements() {
        return classementZoneService.getClassements();
    }

    @GetMapping("/classements/application/{applicationCandidatureId}")
    public List<ClassementZoneResponse> getClassementsByApplication(
            @PathVariable Long applicationCandidatureId
    ) {
        return classementZoneService.getClassementsByApplication(applicationCandidatureId);
    }
}