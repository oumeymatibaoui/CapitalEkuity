package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.RoleModuleAcces;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoleModuleAccesRepository
        extends JpaRepository<RoleModuleAcces, Long> {

    @Query("""
            SELECT rma
            FROM RoleModuleAcces rma
            JOIN FETCH rma.role r
            JOIN FETCH rma.module m
            WHERE r.id = :roleId
            ORDER BY
                COALESCE(m.ordreGroupe, 999),
                COALESCE(m.ordreModule, 999),
                m.id
            """)
    List<RoleModuleAcces> findByRoleId(
            @Param("roleId") Long roleId
    );

    @Query("""
            SELECT rma
            FROM RoleModuleAcces rma
            WHERE rma.role.id = :roleId
              AND rma.module.id = :moduleId
            """)
    Optional<RoleModuleAcces> findByRoleIdAndModuleId(
            @Param("roleId") Long roleId,
            @Param("moduleId") Long moduleId
    );

    @Query("""
            SELECT rma
            FROM RoleModuleAcces rma
            JOIN FETCH rma.role r
            JOIN FETCH rma.module m
            WHERE UPPER(r.codeRole) = UPPER(:roleCode)
              AND COALESCE(r.actif, true) = true
              AND COALESCE(rma.autorise, false) = true
              AND COALESCE(m.actif, true) = true
              AND m.routeFront IS NOT NULL
              AND TRIM(m.routeFront) <> ''
            ORDER BY
                COALESCE(m.ordreGroupe, 999),
                COALESCE(m.ordreModule, 999),
                m.id
            """)
    List<RoleModuleAcces> findAuthorizedModulesByRoleCode(
            @Param("roleCode") String roleCode
    );

    long countByRoleIdAndAutoriseTrue(
            Long roleId
    );

    @Modifying
    @Query("""
            DELETE FROM RoleModuleAcces rma
            WHERE rma.role.id = :roleId
            """)
    void deleteAllByRoleId(
            @Param("roleId") Long roleId
    );
}