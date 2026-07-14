package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.PieceCritereDeposee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PieceCritereDeposeeRepository extends JpaRepository<PieceCritereDeposee, Long> {

    Optional<PieceCritereDeposee> findByApplicationCandidature_IdAndCriterePiece_Id(
            Long applicationCandidatureId,
            Long criterePieceId
    );

    List<PieceCritereDeposee> findByApplicationCandidature_Id(
            Long applicationCandidatureId
    );
}