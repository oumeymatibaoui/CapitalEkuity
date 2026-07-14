package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.ReponseCritere;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReponseCritereRepository extends JpaRepository<ReponseCritere, Long> {

    Optional<ReponseCritere> findByApplicationCandidature_IdAndCritereEvaluation_Id(
            Long applicationCandidatureId,
            Long critereEvaluationId
    );

    List<ReponseCritere> findByApplicationCandidature_Id(Long applicationCandidatureId);
}