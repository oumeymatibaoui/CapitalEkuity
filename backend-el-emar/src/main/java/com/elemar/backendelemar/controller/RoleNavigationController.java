package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.ModuleAccessResponse;
import com.elemar.backendelemar.service.RoleAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/roles-acces/navigation")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class RoleNavigationController {

    private final RoleAccessService roleAccessService;

    @GetMapping("/{roleCode}")
    public List<ModuleAccessResponse> getNavigation(
            @PathVariable String roleCode
    ) {
        if (
                roleCode == null
                        || roleCode.trim().isEmpty()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le code du rôle est obligatoire."
            );
        }

        return roleAccessService.getNavigationByRoleCode(
                roleCode.trim().toUpperCase()
        );
    }
}