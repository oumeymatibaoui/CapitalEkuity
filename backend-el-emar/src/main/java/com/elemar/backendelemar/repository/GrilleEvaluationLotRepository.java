package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.GrilleEvaluationLot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GrilleEvaluationLotRepository extends JpaRepository<GrilleEvaluationLot, Long> {

    Optional<GrilleEvaluationLot> findFirstByLot_IdAndActifTrue(Long lotId);

    Optional<GrilleEvaluationLot> findByCodeGrille(String codeGrille);
}