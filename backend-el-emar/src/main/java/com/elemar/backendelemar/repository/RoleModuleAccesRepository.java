package com.elemar.backendelemar.repository;



import com.elemar.backendelemar.entity.RoleModuleAcces;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoleModuleAccesRepository extends JpaRepository<RoleModuleAcces, Long> {

    List<RoleModuleAcces> findByRoleId(Long roleId);

    Optional<RoleModuleAcces> findByRoleIdAndModuleId(Long roleId, Long moduleId);

    long countByRoleIdAndAutoriseTrue(Long roleId);

    @Query("""
        SELECT rma
        FROM RoleModuleAcces rma
        JOIN FETCH rma.module m
        JOIN FETCH rma.role r
        WHERE r.codeRole = :codeRole
          AND r.actif = true
          AND rma.autorise = true
          AND m.actif = true
        ORDER BY m.ordreGroupe ASC, m.ordreModule ASC
    """)
    List<RoleModuleAcces> findAuthorizedModulesByRoleCode(@Param("codeRole") String codeRole);
}