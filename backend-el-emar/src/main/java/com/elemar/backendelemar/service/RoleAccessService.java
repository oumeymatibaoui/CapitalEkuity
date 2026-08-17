package com.elemar.backendelemar.service;

import com.elemar.backendelemar.dto.CreateRoleRequest;
import com.elemar.backendelemar.dto.ModuleAccessResponse;
import com.elemar.backendelemar.dto.ModuleGroupResponse;
import com.elemar.backendelemar.dto.RoleResponse;
import com.elemar.backendelemar.dto.UpdateModuleAccessRequest;
import com.elemar.backendelemar.dto.UpdateRoleRequest;
import com.elemar.backendelemar.entity.ModuleNavbar;
import com.elemar.backendelemar.entity.RoleAcces;
import com.elemar.backendelemar.entity.RoleModuleAcces;
import com.elemar.backendelemar.repository.ModuleNavbarRepository;
import com.elemar.backendelemar.repository.RoleAccesRepository;
import com.elemar.backendelemar.repository.RoleModuleAccesRepository;
import com.elemar.backendelemar.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RoleAccessService {

    private final UtilisateurRepository utilisateurRepository;
    private final RoleAccesRepository roleRepository;
    private final ModuleNavbarRepository moduleRepository;
    private final RoleModuleAccesRepository roleModuleRepository;

    // =====================================================
    // LISTE DES RÔLES
    // =====================================================

    @Transactional(readOnly = true)
    public List<RoleResponse> getRoles() {

        long totalModules = moduleRepository
                .findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc()
                .size();

        return roleRepository
                .findAllByOrderByIdAsc()
                .stream()
                .map(role -> toRoleResponse(role, totalModules))
                .toList();
    }

    // =====================================================
    // CRÉATION D’UN RÔLE
    // =====================================================

    public RoleResponse createRole(CreateRoleRequest request) {

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations du rôle sont obligatoires."
            );
        }

        String nomRole = normalizeRequiredText(
                request.getNomRole(),
                "Le nom du rôle est obligatoire."
        );

        String typeRole = normalizeRoleType(
                request.getTypeRole(),
                "INTERNE"
        );

        String codeRole = generateCodeRole(nomRole);

        if (roleRepository.existsByCodeRole(codeRole)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Un rôle avec ce nom existe déjà."
            );
        }

        RoleAcces role = new RoleAcces();

        role.setNomRole(nomRole);
        role.setCodeRole(codeRole);
        role.setDescription(normalizeOptionalText(request.getDescription()));
        role.setTypeRole(typeRole);
        role.setRoleSysteme(Boolean.TRUE.equals(request.getRoleSysteme()));
        role.setActif(true);

        RoleAcces savedRole = roleRepository.saveAndFlush(role);

        List<ModuleNavbar> modules = moduleRepository
                .findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc();

        for (ModuleNavbar module : modules) {

            RoleModuleAcces access = new RoleModuleAcces();

            access.setRole(savedRole);
            access.setModule(module);

            /*
             * Un nouveau rôle reçoit seulement le dashboard
             * par défaut. Les autres accès seront configurés
             * depuis la page des rôles.
             */
            access.setAutorise(
                    "DASHBOARD".equalsIgnoreCase(
                            module.getCodeModule()
                    )
            );

            roleModuleRepository.save(access);
        }

        return toRoleResponse(savedRole, modules.size());
    }

    // =====================================================
    // MODULES D’UN RÔLE
    // =====================================================

    @Transactional(readOnly = true)
    public List<ModuleGroupResponse> getModulesByRole(Long roleId) {

        RoleAcces role = requireRole(roleId);

        List<ModuleNavbar> modules = moduleRepository
                .findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc();

        List<RoleModuleAcces> existingAccess =
                roleModuleRepository.findByRoleId(role.getId());

        Map<Long, Boolean> accessMap = existingAccess
                .stream()
                .filter(access -> access.getModule() != null)
                .filter(access -> access.getModule().getId() != null)
                .collect(Collectors.toMap(
                        access -> access.getModule().getId(),
                        access -> Boolean.TRUE.equals(
                                access.getAutorise()
                        ),
                        /*
                         * Protection supplémentaire si deux lignes
                         * d'accès existent accidentellement.
                         */
                        (first, second) -> first || second
                ));

        List<ModuleAccessResponse> moduleResponses =
                new ArrayList<>();

        for (ModuleNavbar module : modules) {

            ModuleAccessResponse response =
                    toModuleAccessResponse(
                            module,
                            accessMap.getOrDefault(
                                    module.getId(),
                                    false
                            )
                    );

            moduleResponses.add(response);
        }

        return groupModules(moduleResponses);
    }

    // =====================================================
    // MISE À JOUR DES MODULES
    // =====================================================

    public List<ModuleGroupResponse> updateRoleModules(
            Long roleId,
            UpdateModuleAccessRequest request
    ) {
        RoleAcces role = requireRole(roleId);

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les autorisations à enregistrer sont obligatoires."
            );
        }

        /*
         * On conserve le comportement existant:
         * modules null signifie qu'aucune modification
         * n'est demandée.
         */
        if (request.getModules() == null) {
            return getModulesByRole(roleId);
        }

        for (
                UpdateModuleAccessRequest.ModuleAccessUpdate item
                : request.getModules()
        ) {
            if (item == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Une autorisation de module est invalide."
                );
            }

            ModuleNavbar module =
                    requireModule(item.getModuleId());

            RoleModuleAcces access = roleModuleRepository
                    .findByRoleIdAndModuleId(
                            role.getId(),
                            module.getId()
                    )
                    .orElseGet(() -> {
                        RoleModuleAcces newAccess =
                                new RoleModuleAcces();

                        newAccess.setRole(role);
                        newAccess.setModule(module);

                        return newAccess;
                    });

            access.setAutorise(
                    Boolean.TRUE.equals(item.getAutorise())
            );

            roleModuleRepository.save(access);
        }

        return getModulesByRole(roleId);
    }

    // =====================================================
    // AUTORISER TOUS LES MODULES
    // =====================================================

    public List<ModuleGroupResponse> allowAll(Long roleId) {

        RoleAcces role = requireRole(roleId);

        List<ModuleNavbar> modules = moduleRepository
                .findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc();

        for (ModuleNavbar module : modules) {

            RoleModuleAcces access = roleModuleRepository
                    .findByRoleIdAndModuleId(
                            role.getId(),
                            module.getId()
                    )
                    .orElseGet(() -> {
                        RoleModuleAcces newAccess =
                                new RoleModuleAcces();

                        newAccess.setRole(role);
                        newAccess.setModule(module);

                        return newAccess;
                    });

            access.setAutorise(true);

            roleModuleRepository.save(access);
        }

        return getModulesByRole(roleId);
    }

    // =====================================================
    // BLOQUER TOUS LES MODULES
    // =====================================================

    public List<ModuleGroupResponse> blockAll(Long roleId) {

        RoleAcces role = requireRole(roleId);

        /*
         * Conservation de ta règle actuelle:
         * le rôle système IT ne peut jamais perdre
         * tous ses accès.
         */
        if (
                Boolean.TRUE.equals(role.getRoleSysteme())
                        && "IT".equalsIgnoreCase(role.getCodeRole())
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Le rôle IT / Administrateur ne peut pas être totalement bloqué."
            );
        }

        List<ModuleNavbar> modules = moduleRepository
                .findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc();

        for (ModuleNavbar module : modules) {

            RoleModuleAcces access = roleModuleRepository
                    .findByRoleIdAndModuleId(
                            role.getId(),
                            module.getId()
                    )
                    .orElseGet(() -> {
                        RoleModuleAcces newAccess =
                                new RoleModuleAcces();

                        newAccess.setRole(role);
                        newAccess.setModule(module);

                        return newAccess;
                    });

            access.setAutorise(false);

            roleModuleRepository.save(access);
        }

        return getModulesByRole(roleId);
    }

    // =====================================================
    // NAVIGATION AUTORISÉE
    // =====================================================

    @Transactional(readOnly = true)
    public List<ModuleAccessResponse> getNavigationByRoleCode(
            String roleCode
    ) {
        String normalizedRoleCode = normalizeRequiredText(
                roleCode,
                "Le code du rôle est obligatoire."
        ).toUpperCase(Locale.ROOT);

        List<RoleModuleAcces> accessList =
                roleModuleRepository
                        .findAuthorizedModulesByRoleCode(
                                normalizedRoleCode
                        );

        return accessList
                .stream()
                .filter(access -> access.getModule() != null)
                .map(access ->
                        toModuleAccessResponse(
                                access.getModule(),
                                true
                        )
                )
                .toList();
    }

    // =====================================================
    // MODIFICATION DU RÔLE
    // =====================================================

    public RoleResponse updateRole(
            Long roleId,
            UpdateRoleRequest request
    ) {
        RoleAcces role = requireRole(roleId);

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations du rôle sont obligatoires."
            );
        }

        String nomRole = normalizeRequiredText(
                request.getNomRole(),
                "Le nom du rôle est obligatoire."
        );

        String currentTypeRole = role.getTypeRole() == null
                ? "INTERNE"
                : String.valueOf(role.getTypeRole());

        String typeRole = normalizeRoleType(
                request.getTypeRole(),
                currentTypeRole
        );

        boolean finalRoleSysteme =
                request.getRoleSysteme() != null
                        ? Boolean.TRUE.equals(
                        request.getRoleSysteme()
                )
                        : Boolean.TRUE.equals(
                        role.getRoleSysteme()
                );

        boolean finalActif =
                request.getActif() != null
                        ? Boolean.TRUE.equals(
                        request.getActif()
                )
                        : Boolean.TRUE.equals(
                        role.getActif()
                );

        if (finalRoleSysteme && !finalActif) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Un rôle système ne peut pas être désactivé."
            );
        }

        if (!finalActif) {

            long utilisateursAffectes =
                    utilisateurRepository.countByRoleId(roleId);

            if (utilisateursAffectes > 0) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ce rôle est affecté à "
                                + utilisateursAffectes
                                + " utilisateur(s)."
                );
            }
        }

        role.setNomRole(nomRole);
        role.setDescription(
                normalizeOptionalText(
                        request.getDescription()
                )
        );
        role.setTypeRole(typeRole);
        role.setRoleSysteme(finalRoleSysteme);
        role.setActif(finalActif);

        /*
         * Le codeRole reste volontairement inchangé
         * pour ne pas casser les règles et les permissions
         * qui utilisent ce code.
         */
        RoleAcces savedRole =
                roleRepository.saveAndFlush(role);

        long totalModules = moduleRepository
                .findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc()
                .size();

        return toRoleResponse(
                savedRole,
                totalModules
        );
    }

    // =====================================================
    // SUPPRESSION DU RÔLE
    // =====================================================

    public void deleteRole(Long roleId) {

        RoleAcces role = requireRole(roleId);

        if (Boolean.TRUE.equals(role.getRoleSysteme())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Un rôle système ne peut pas être supprimé."
            );
        }

        long utilisateursAffectes =
                utilisateurRepository.countByRoleId(roleId);

        if (utilisateursAffectes > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Impossible de supprimer ce rôle : "
                            + utilisateursAffectes
                            + " utilisateur(s) l'utilisent encore. "
                            + "Attribuez-leur d'abord un autre rôle."
            );
        }

        roleModuleRepository.deleteAllByRoleId(roleId);

        roleRepository.delete(role);
        roleRepository.flush();
    }

    // =====================================================
    // CONVERSION DES RÉPONSES
    // =====================================================

    private RoleResponse toRoleResponse(
            RoleAcces role,
            long totalModules
    ) {
        RoleResponse response = new RoleResponse();

        response.setId(role.getId());
        response.setCodeRole(role.getCodeRole());
        response.setNomRole(role.getNomRole());
        response.setDescription(role.getDescription());
        response.setTypeRole(role.getTypeRole());
        response.setRoleSysteme(role.getRoleSysteme());
        response.setActif(role.getActif());

        response.setModulesAutorises(
                roleModuleRepository
                        .countByRoleIdAndAutoriseTrue(
                                role.getId()
                        )
        );

        response.setTotalModules(totalModules);

        return response;
    }

    private ModuleAccessResponse toModuleAccessResponse(
            ModuleNavbar module,
            Boolean autorise
    ) {
        ModuleAccessResponse response =
                new ModuleAccessResponse();

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

    private List<ModuleGroupResponse> groupModules(
            List<ModuleAccessResponse> modules
    ) {
        Map<String, List<ModuleAccessResponse>> grouped =
                modules.stream()
                        .collect(Collectors.groupingBy(
                                module -> normalizeGroupName(
                                        module.getGroupe()
                                ),
                                LinkedHashMap::new,
                                Collectors.toList()
                        ));

        List<ModuleGroupResponse> result =
                new ArrayList<>();

        for (
                Map.Entry<String, List<ModuleAccessResponse>> entry
                : grouped.entrySet()
        ) {
            List<ModuleAccessResponse> groupModules =
                    entry.getValue();

            if (groupModules.isEmpty()) {
                continue;
            }

            ModuleGroupResponse group =
                    new ModuleGroupResponse();

            group.setGroupe(entry.getKey());

            group.setOrdreGroupe(
                    groupModules.get(0).getOrdreGroupe()
            );

            group.setTotalModules(
                    (long) groupModules.size()
            );

            group.setModulesAutorises(
                    groupModules.stream()
                            .filter(module ->
                                    Boolean.TRUE.equals(
                                            module.getAutorise()
                                    )
                            )
                            .count()
            );

            group.setModules(groupModules);

            result.add(group);
        }

        return result;
    }

    // =====================================================
    // MÉTHODES DE VALIDATION
    // =====================================================

    private RoleAcces requireRole(Long roleId) {

        validatePositiveId(
                roleId,
                "L'identifiant du rôle est obligatoire."
        );

        return roleRepository.findById(roleId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Rôle introuvable."
                        )
                );
    }

    private ModuleNavbar requireModule(Long moduleId) {

        validatePositiveId(
                moduleId,
                "L'identifiant du module est obligatoire."
        );

        return moduleRepository.findById(moduleId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Module introuvable."
                        )
                );
    }

    private void validatePositiveId(
            Long id,
            String message
    ) {
        if (id == null || id <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    message
            );
        }
    }

    private String normalizeRequiredText(
            String value,
            String message
    ) {
        if (value == null || value.trim().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    message
            );
        }

        return value.trim();
    }

    private String normalizeOptionalText(String value) {

        if (value == null) {
            return null;
        }

        String normalized = value.trim();

        return normalized.isEmpty()
                ? null
                : normalized;
    }

    private String normalizeRoleType(
            String requestedType,
            String defaultType
    ) {
        String source = requestedType == null
                || requestedType.trim().isEmpty()
                ? defaultType
                : requestedType;

        String normalized = source == null
                ? "INTERNE"
                : source.trim().toUpperCase(Locale.ROOT);

        if (
                !"INTERNE".equals(normalized)
                        && !"EXTERNE".equals(normalized)
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le type du rôle doit être INTERNE ou EXTERNE."
            );
        }

        return normalized;
    }

    private String generateCodeRole(String nomRole) {

        String normalizedName = normalizeRequiredText(
                nomRole,
                "Le nom du rôle est obligatoire."
        );

        String normalized = Normalizer
                .normalize(
                        normalizedName,
                        Normalizer.Form.NFD
                )
                .replaceAll("\\p{M}", "");

        String codeRole = normalized
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_+|_+$", "");

        if (codeRole.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nom du rôle doit contenir au moins une lettre ou un chiffre."
            );
        }

        return codeRole;
    }

    private String normalizeGroupName(String groupName) {

        if (groupName == null || groupName.isBlank()) {
            return "AUTRES";
        }

        return groupName.trim();
    }
}