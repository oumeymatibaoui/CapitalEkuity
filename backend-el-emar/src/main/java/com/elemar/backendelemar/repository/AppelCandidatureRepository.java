package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.AppelCandidature;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppelCandidatureRepository extends JpaRepository<AppelCandidature, Long> {

    boolean existsByTitreIgnoreCase(String titre);

    boolean existsByTitreIgnoreCaseAndIdNot(String titre, Long id);
}