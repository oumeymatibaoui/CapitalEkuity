package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.RoleModuleAcces;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoleModuleAccesRepository
        extends JpaRepository<RoleModuleAcces, Long> {

    // =====================================================
    // ACCÈS D’UN RÔLE
    // Utilisé dans getModulesByRole()
    // =====================================================

    List<RoleModuleAcces> findByRoleId(
            Long roleId
    );

    // =====================================================
    // ACCÈS D’UN RÔLE À UN MODULE
    // Utilisé dans updateRoleModules(),
    // allowAll() et blockAll()
    // =====================================================

    Optional<RoleModuleAcces>
    findByRoleIdAndModuleId(
            Long roleId,
            Long moduleId
    );

    // =====================================================
    // NAVIGATION AUTORISÉE PAR CODE RÔLE
    // Utilisé dans getNavigationByRoleCode()
    // =====================================================

    @Query("""
        SELECT rma
        FROM RoleModuleAcces rma
        JOIN FETCH rma.module module
        JOIN rma.role role
        WHERE UPPER(role.codeRole)
                = UPPER(:roleCode)
          AND rma.autorise = true
          AND role.actif = true
          AND module.actif = true
        ORDER BY module.ordreGroupe ASC,
                 module.ordreModule ASC
    """)
    List<RoleModuleAcces>
    findAuthorizedModulesByRoleCode(
            @Param("roleCode")
            String roleCode
    );

    // =====================================================
    // NOMBRE DE MODULES AUTORISÉS POUR UN RÔLE
    // Utilisé dans toRoleResponse()
    // =====================================================

    long countByRoleIdAndAutoriseTrue(
            Long roleId
    );

    // =====================================================
    // SUPPRIMER TOUS LES ACCÈS D’UN RÔLE
    // Utilisé avant de supprimer le rôle
    // =====================================================

    void deleteAllByRoleId(
            Long roleId
    );

    // =====================================================
    // VÉRIFIER SI UN RÔLE POSSÈDE UN MODULE
    // Utilisé pour la configuration du dashboard
    // =====================================================

    boolean existsByRoleIdAndModuleIdAndAutoriseTrue(
            Long roleId,
            Long moduleId
    );

    // =====================================================
    // SÉCURITÉ BACKEND :
    // VÉRIFIER SI UN UTILISATEUR POSSÈDE UN MODULE
    // =====================================================

    @Query("""
        SELECT CASE
            WHEN COUNT(rma) > 0
            THEN true
            ELSE false
        END
        FROM Utilisateur utilisateur
        JOIN utilisateur.roleAcces role
        JOIN RoleModuleAcces rma
            ON rma.role.id = role.id
        JOIN rma.module module
        WHERE utilisateur.id = :userId
          AND utilisateur.actif = true
          AND role.actif = true
          AND module.actif = true
          AND rma.autorise = true
          AND UPPER(module.codeModule)
                = UPPER(:moduleCode)
    """)
    boolean userHasModule(
            @Param("userId")
            Long userId,

            @Param("moduleCode")
            String moduleCode
    );

    // =====================================================
    // MODULES AUTORISÉS DE L’UTILISATEUR CONNECTÉ
    // Utilisé par GET /api/me/modules
    // =====================================================

    @Query("""
        SELECT module.codeModule
        FROM Utilisateur utilisateur
        JOIN utilisateur.roleAcces role
        JOIN RoleModuleAcces rma
            ON rma.role.id = role.id
        JOIN rma.module module
        WHERE utilisateur.id = :userId
          AND utilisateur.actif = true
          AND role.actif = true
          AND module.actif = true
          AND rma.autorise = true
        ORDER BY module.ordreGroupe ASC,
                 module.ordreModule ASC
    """)
    List<String> findAuthorizedModuleCodes(
            @Param("userId")
            Long userId
    );
}