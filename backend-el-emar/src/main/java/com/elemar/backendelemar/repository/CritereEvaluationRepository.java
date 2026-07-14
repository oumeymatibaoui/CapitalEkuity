package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.CritereEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CritereEvaluationRepository extends JpaRepository<CritereEvaluation, Long> {

    List<CritereEvaluation> findByLot_IdOrderByOrdreAffichageAsc(Long lotId);

    List<CritereEvaluation> findByLot_IdAndActifTrueOrderByOrdreAffichageAsc(Long lotId);

    List<CritereEvaluation> findByGrilleEvaluationLot_IdAndActifTrueOrderByOrdreAffichageAsc(Long grilleId);
    long countByCategorieEvaluation_Id(Long categorieEvaluationId);
}