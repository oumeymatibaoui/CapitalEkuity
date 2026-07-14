package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.ApplicationCandidature;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApplicationCandidatureRepository extends JpaRepository<ApplicationCandidature, Long> {

    Optional<ApplicationCandidature> findByCandidature_IdAndLot_Id(
            Long candidatureId,
            Long lotId
    );

    List<ApplicationCandidature> findByCandidature_Id(Long candidatureId);
}