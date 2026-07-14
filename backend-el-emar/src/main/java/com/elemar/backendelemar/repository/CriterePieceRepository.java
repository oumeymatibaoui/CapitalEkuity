package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.CriterePiece;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CriterePieceRepository extends JpaRepository<CriterePiece, Long> {

    List<CriterePiece> findByCritereEvaluation_IdOrderByOrdreAffichageAsc(Long critereEvaluationId);

    List<CriterePiece> findByCritereEvaluation_IdAndActifTrueOrderByOrdreAffichageAsc(Long critereEvaluationId);

    @Query("""
        SELECT DISTINCT p.nomPiece
        FROM CriterePiece p
        WHERE p.nomPiece IS NOT NULL
        AND p.nomPiece <> ''
        ORDER BY p.nomPiece
    """)
    List<String> findDistinctNomPieces();
}
