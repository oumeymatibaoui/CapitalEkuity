package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.CreateRoleRequest;
import com.elemar.backendelemar.dto.ModuleGroupResponse;
import com.elemar.backendelemar.dto.RoleResponse;
import com.elemar.backendelemar.dto.UpdateModuleAccessRequest;
import com.elemar.backendelemar.dto.UpdateRoleRequest;
import com.elemar.backendelemar.service.RoleAccessService;
import com.elemar.backendelemar.service.RoleCategorieAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
public class RoleAccessController {

    private final RoleAccessService roleAccessService;
    private final RoleCategorieAccessService roleCategorieAccessService;

    // =====================================================
    // RÔLES
    // =====================================================

    @GetMapping("/roles")
    public List<RoleResponse> getRoles() {
        return roleAccessService.getRoles();
    }

    @PostMapping("/roles")
    @ResponseStatus(HttpStatus.CREATED)
    public RoleResponse createRole(
            @RequestBody CreateRoleRequest request
    ) {
        return roleAccessService.createRole(request);
    }

    @PutMapping("/roles/{roleId}")
    public RoleResponse updateRole(
            @PathVariable Long roleId,
            @RequestBody UpdateRoleRequest request
    ) {
        return roleAccessService.updateRole(
                roleId,
                request
        );
    }

    @DeleteMapping("/roles/{roleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRole(
            @PathVariable Long roleId
    ) {
        roleCategorieAccessService.deleteAllForRole(roleId);
        roleAccessService.deleteRole(roleId);
    }

    // =====================================================
    // MODULES, PAGES, SECTIONS ET ACTIONS
    // =====================================================

    @GetMapping("/roles/{roleId}/modules")
    public List<ModuleGroupResponse> getModulesByRole(
            @PathVariable Long roleId
    ) {
        return roleAccessService.getModulesByRole(roleId);
    }

    @PutMapping("/roles/{roleId}/modules")
    public List<ModuleGroupResponse> updateRoleModules(
            @PathVariable Long roleId,
            @RequestBody UpdateModuleAccessRequest request
    ) {
        return roleAccessService.updateRoleModules(
                roleId,
                request
        );
    }

    @PatchMapping("/roles/{roleId}/allow-all")
    public List<ModuleGroupResponse> allowAllModules(
            @PathVariable Long roleId
    ) {
        return roleAccessService.allowAll(roleId);
    }

    @PatchMapping("/roles/{roleId}/block-all")
    public List<ModuleGroupResponse> blockAllModules(
            @PathVariable Long roleId
    ) {
        return roleAccessService.blockAll(roleId);
    }
}