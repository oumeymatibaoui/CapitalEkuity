package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.RoleCategorieAccessResponse;
import com.elemar.backendelemar.dto.UpdateRoleCategoriesRequest;
import com.elemar.backendelemar.service.RoleCategorieAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/roles-acces")
@RequiredArgsConstructor
@PreAuthorize("""
    hasAnyAuthority(
        'IT',
        'ADMIN',
        'ROLE_IT',
        'ROLE_ADMIN'
    )
""")
public class RoleCategorieAccessController {

    private final RoleCategorieAccessService roleCategorieAccessService;

    @GetMapping("/roles/{roleId}/categories")
    public List<RoleCategorieAccessResponse> getCategories(
            @PathVariable Long roleId
    ) {
        return roleCategorieAccessService
                .getCategoriesByRole(roleId);
    }

    @PutMapping("/roles/{roleId}/categories")
    public List<RoleCategorieAccessResponse> updateCategories(
            @PathVariable Long roleId,
            @RequestBody UpdateRoleCategoriesRequest request
    ) {
        return roleCategorieAccessService
                .updateCategoriesForRole(
                        roleId,
                        request
                );
    }
}