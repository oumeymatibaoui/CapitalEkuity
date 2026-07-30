package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.*;
import com.elemar.backendelemar.service.RoleAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/roles-acces")
@RequiredArgsConstructor
//@PreAuthorize("hasAuthority('EL_EMAR_ACCESS')") // protège TOUTE la classe
public class RoleAccessController {

    private final RoleAccessService roleAccessService;

    @GetMapping("/roles")
    public List<RoleResponse> getRoles() {
        return roleAccessService.getRoles();
    }

    @PostMapping("/roles")
    public RoleResponse createRole(@RequestBody CreateRoleRequest request) {
        return roleAccessService.createRole(request);
    }

    @GetMapping("/roles/{roleId}/modules")
    public List<ModuleGroupResponse> getModulesByRole(@PathVariable Long roleId) {
        return roleAccessService.getModulesByRole(roleId);
    }

    @PutMapping("/roles/{roleId}/modules")
    public List<ModuleGroupResponse> updateRoleModules(
            @PathVariable Long roleId,
            @RequestBody UpdateModuleAccessRequest request
    ) {
        return roleAccessService.updateRoleModules(roleId, request);
    }

    @PatchMapping("/roles/{roleId}/allow-all")
    public List<ModuleGroupResponse> allowAll(@PathVariable Long roleId) {
        return roleAccessService.allowAll(roleId);
    }

    @PatchMapping("/roles/{roleId}/block-all")
    public List<ModuleGroupResponse> blockAll(@PathVariable Long roleId) {
        return roleAccessService.blockAll(roleId);
    }

    @GetMapping("/navigation/{roleCode}")
    public List<ModuleAccessResponse> getNavigationByRoleCode(@PathVariable String roleCode) {
        return roleAccessService.getNavigationByRoleCode(roleCode);
    }

    @PutMapping("/roles/{roleId}")
    public RoleResponse updateRole(
            @PathVariable Long roleId,
            @RequestBody UpdateRoleRequest request
    ) {
        return roleAccessService.updateRole(roleId, request);
    }

    @DeleteMapping("/roles/{roleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRole(
            @PathVariable Long roleId
    ) {
        roleAccessService.deleteRole(roleId);
    }
}