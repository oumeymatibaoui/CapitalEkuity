package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.ClassementZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassementZoneRepository extends JpaRepository<ClassementZone, Long> {

    List<ClassementZone> findAllByApplicationCandidature_Id(Long applicationCandidatureId);
}