package com.elemar.backendelemar.service;


import com.elemar.backendelemar.dto.*;
import com.elemar.backendelemar.entity.ModuleNavbar;
import com.elemar.backendelemar.entity.RoleAcces;
import com.elemar.backendelemar.entity.RoleModuleAcces;
import com.elemar.backendelemar.repository.ModuleNavbarRepository;
import com.elemar.backendelemar.repository.RoleAccesRepository;
import com.elemar.backendelemar.repository.RoleModuleAccesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RoleAccessService {

    private final RoleAccesRepository roleRepository;
    private final ModuleNavbarRepository moduleRepository;
    private final RoleModuleAccesRepository roleModuleRepository;

    @Transactional(readOnly = true)
    public List<RoleResponse> getRoles() {
        long totalModules = moduleRepository.findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc().size();

        return roleRepository.findAllByOrderByIdAsc()
                .stream()
                .map(role -> toRoleResponse(role, totalModules))
                .toList();
    }

    public RoleResponse createRole(CreateRoleRequest request) {

        String codeRole = generateCodeRole(request.getNomRole());

        if (roleRepository.existsByCodeRole(codeRole)) {
            throw new RuntimeException("Un rôle avec ce nom existe déjà");
        }

        RoleAcces role = new RoleAcces();
        role.setNomRole(request.getNomRole());
        role.setCodeRole(codeRole);
        role.setDescription(request.getDescription());
        role.setTypeRole(request.getTypeRole() == null ? "INTERNE" : request.getTypeRole());
        role.setRoleSysteme(false);
        role.setActif(true);

        RoleAcces savedRole = roleRepository.save(role);

        List<ModuleNavbar> modules = moduleRepository.findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc();

        for (ModuleNavbar module : modules) {
            RoleModuleAcces access = new RoleModuleAcces();
            access.setRole(savedRole);
            access.setModule(module);
            access.setAutorise(false);
            roleModuleRepository.save(access);
        }

        return toRoleResponse(savedRole, modules.size());
    }

    @Transactional(readOnly = true)
    public List<ModuleGroupResponse> getModulesByRole(Long roleId) {

        RoleAcces role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Rôle introuvable"));

        List<ModuleNavbar> modules = moduleRepository.findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc();

        List<RoleModuleAcces> existingAccess = roleModuleRepository.findByRoleId(role.getId());

        Map<Long, Boolean> accessMap = existingAccess.stream()
                .collect(Collectors.toMap(
                        access -> access.getModule().getId(),
                        access -> Boolean.TRUE.equals(access.getAutorise())
                ));

        List<ModuleAccessResponse> moduleResponses = new ArrayList<>();

        for (ModuleNavbar module : modules) {
            ModuleAccessResponse response = toModuleAccessResponse(
                    module,
                    accessMap.getOrDefault(module.getId(), false)
            );

            moduleResponses.add(response);
        }

        return groupModules(moduleResponses);
    }

    public List<ModuleGroupResponse> updateRoleModules(
            Long roleId,
            UpdateModuleAccessRequest request
    ) {

        RoleAcces role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Rôle introuvable"));

        if (request.getModules() == null) {
            return getModulesByRole(roleId);
        }

        for (UpdateModuleAccessRequest.ModuleAccessUpdate item : request.getModules()) {

            ModuleNavbar module = moduleRepository.findById(item.getModuleId())
                    .orElseThrow(() -> new RuntimeException("Module introuvable"));

            RoleModuleAcces access = roleModuleRepository
                    .findByRoleIdAndModuleId(role.getId(), module.getId())
                    .orElseGet(() -> {
                        RoleModuleAcces newAccess = new RoleModuleAcces();
                        newAccess.setRole(role);
                        newAccess.setModule(module);
                        return newAccess;
                    });

            access.setAutorise(Boolean.TRUE.equals(item.getAutorise()));

            roleModuleRepository.save(access);
        }

        return getModulesByRole(roleId);
    }

    public List<ModuleGroupResponse> allowAll(Long roleId) {
        RoleAcces role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Rôle introuvable"));

        List<ModuleNavbar> modules = moduleRepository.findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc();

        for (ModuleNavbar module : modules) {
            RoleModuleAcces access = roleModuleRepository
                    .findByRoleIdAndModuleId(role.getId(), module.getId())
                    .orElseGet(() -> {
                        RoleModuleAcces newAccess = new RoleModuleAcces();
                        newAccess.setRole(role);
                        newAccess.setModule(module);
                        return newAccess;
                    });

            access.setAutorise(true);
            roleModuleRepository.save(access);
        }

        return getModulesByRole(roleId);
    }

    public List<ModuleGroupResponse> blockAll(Long roleId) {
        RoleAcces role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Rôle introuvable"));

        if (Boolean.TRUE.equals(role.getRoleSysteme()) && "IT".equals(role.getCodeRole())) {
            throw new RuntimeException("Le rôle IT / Administrateur ne peut pas être totalement bloqué");
        }

        List<ModuleNavbar> modules = moduleRepository.findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc();

        for (ModuleNavbar module : modules) {
            RoleModuleAcces access = roleModuleRepository
                    .findByRoleIdAndModuleId(role.getId(), module.getId())
                    .orElseGet(() -> {
                        RoleModuleAcces newAccess = new RoleModuleAcces();
                        newAccess.setRole(role);
                        newAccess.setModule(module);
                        return newAccess;
                    });

            access.setAutorise(false);
            roleModuleRepository.save(access);
        }

        return getModulesByRole(roleId);
    }

    @Transactional(readOnly = true)
    public List<ModuleAccessResponse> getNavigationByRoleCode(String roleCode) {

        List<RoleModuleAcces> accessList =
                roleModuleRepository.findAuthorizedModulesByRoleCode(roleCode);

        return accessList.stream()
                .map(access -> toModuleAccessResponse(access.getModule(), true))
                .toList();
    }

    private RoleResponse toRoleResponse(RoleAcces role, long totalModules) {

        RoleResponse response = new RoleResponse();

        response.setId(role.getId());
        response.setCodeRole(role.getCodeRole());
        response.setNomRole(role.getNomRole());
        response.setDescription(role.getDescription());
        response.setTypeRole(role.getTypeRole());
        response.setRoleSysteme(role.getRoleSysteme());
        response.setActif(role.getActif());
        response.setModulesAutorises(roleModuleRepository.countByRoleIdAndAutoriseTrue(role.getId()));
        response.setTotalModules(totalModules);

        return response;
    }

    private ModuleAccessResponse toModuleAccessResponse(ModuleNavbar module, Boolean autorise) {

        ModuleAccessResponse response = new ModuleAccessResponse();

        response.setModuleId(module.getId());
        response.setCodeModule(module.getCodeModule());
        response.setGroupe(module.getGroupe());
        response.setLibelle(module.getLibelle());
        response.setDescription(module.getDescription());
        response.setRouteFront(module.getRouteFront());
        response.setIcone(module.getIcone());
        response.setOrdreGroupe(module.getOrdreGroupe());
        response.setOrdreModule(module.getOrdreModule());
        response.setAutorise(Boolean.TRUE.equals(autorise));

        return response;
    }

    private List<ModuleGroupResponse> groupModules(List<ModuleAccessResponse> modules) {

        Map<String, List<ModuleAccessResponse>> grouped = modules.stream()
                .collect(Collectors.groupingBy(
                        ModuleAccessResponse::getGroupe,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<ModuleGroupResponse> result = new ArrayList<>();

        for (Map.Entry<String, List<ModuleAccessResponse>> entry : grouped.entrySet()) {

            List<ModuleAccessResponse> groupModules = entry.getValue();

            ModuleGroupResponse group = new ModuleGroupResponse();

            group.setGroupe(entry.getKey());
            group.setOrdreGroupe(groupModules.get(0).getOrdreGroupe());
            group.setTotalModules((long) groupModules.size());
            group.setModulesAutorises(
                    groupModules.stream()
                            .filter(ModuleAccessResponse::getAutorise)
                            .count()
            );
            group.setModules(groupModules);

            result.add(group);
        }

        return result;
    }

    private String generateCodeRole(String nomRole) {

        if (nomRole == null || nomRole.isBlank()) {
            throw new RuntimeException("Le nom du rôle est obligatoire");
        }

        String normalized = Normalizer.normalize(nomRole, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        return normalized
                .toUpperCase()
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_|_$", "");
    }
    public RoleResponse updateRole(Long roleId, UpdateRoleRequest request) {

        RoleAcces role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Rôle introuvable"));

        if (Boolean.TRUE.equals(role.getRoleSysteme()) && "IT".equals(role.getCodeRole())) {
            if (request.getActif() != null && !request.getActif()) {
                throw new RuntimeException("Le rôle IT / Administrateur ne peut pas être désactivé");
            }
        }

        role.setNomRole(request.getNomRole());
        role.setDescription(request.getDescription());
        role.setTypeRole(request.getTypeRole());

        if (request.getActif() != null) {
            role.setActif(request.getActif());
        }

        RoleAcces saved = roleRepository.save(role);

        long totalModules = moduleRepository.findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc().size();

        return toRoleResponse(saved, totalModules);
    }

    public void deleteRole(Long roleId) {

        RoleAcces role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Rôle introuvable"));

        if (Boolean.TRUE.equals(role.getRoleSysteme())) {
            throw new RuntimeException("Un rôle système ne peut pas être supprimé");
        }

        // Soft delete : on désactive seulement
        role.setActif(false);

        roleRepository.save(role);
    }
}