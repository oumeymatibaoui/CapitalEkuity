package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.ProjetReference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjetReferenceRepository extends JpaRepository<ProjetReference, Long> {

    List<ProjetReference> findByApplicationCandidature_Id(Long applicationCandidatureId);
    List<ProjetReference> findByApplicationCandidature_IdAndZoneValideeTrue(
            Long applicationCandidatureId
    );
}