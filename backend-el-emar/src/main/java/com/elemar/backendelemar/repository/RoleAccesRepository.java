package com.elemar.backendelemar.repository;


import com.elemar.backendelemar.entity.RoleAcces;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoleAccesRepository extends JpaRepository<RoleAcces, Long> {

    List<RoleAcces> findAllByOrderByIdAsc();

    Optional<RoleAcces> findByCodeRole(String codeRole);

    boolean existsByCodeRole(String codeRole);
}