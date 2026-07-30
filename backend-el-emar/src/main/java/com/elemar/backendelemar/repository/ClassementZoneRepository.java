package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.ClassementZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassementZoneRepository extends JpaRepository<ClassementZone, Long> {


    Optional<ClassementZone> findByApplicationCandidature_IdAndActifTrue(
            Long applicationCandidatureId
    );
    List<ClassementZone> findAllByApplicationCandidature_Id(Long applicationCandidatureId);
}