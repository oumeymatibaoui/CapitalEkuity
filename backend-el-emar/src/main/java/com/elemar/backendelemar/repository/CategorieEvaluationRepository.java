package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.CategorieEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CategorieEvaluationRepository extends JpaRepository<CategorieEvaluation, Long> {

    @Query("""
        SELECT c
        FROM CategorieEvaluation c
        LEFT JOIN FETCH c.typeIntervenant ti
        LEFT JOIN FETCH c.lot l
        WHERE ti.id = :typeIntervenantId
        AND (
            :lotId IS NULL
            OR c.lot IS NULL
            OR l.id = :lotId
        )
        AND (
            :activeOnly = false
            OR c.actif = true
        )
        ORDER BY
            CASE WHEN c.lot IS NULL THEN 0 ELSE 1 END,
            c.ordreAffichage ASC,
            c.libelle ASC
        """)
    List<CategorieEvaluation> findByScope(
            @Param("typeIntervenantId") Long typeIntervenantId,
            @Param("lotId") Long lotId,
            @Param("activeOnly") boolean activeOnly
    );

    @Query("""
        SELECT c
        FROM CategorieEvaluation c
        WHERE c.typeIntervenant.id = :typeIntervenantId
        AND LOWER(c.code) = LOWER(:code)
        AND (
            (:lotId IS NULL AND c.lot IS NULL)
            OR (:lotId IS NOT NULL AND c.lot.id = :lotId)
        )
        """)
    Optional<CategorieEvaluation> findDuplicateCode(
            @Param("typeIntervenantId") Long typeIntervenantId,
            @Param("lotId") Long lotId,
            @Param("code") String code
    );

    @Query("""
        SELECT c
        FROM CategorieEvaluation c
        WHERE c.typeIntervenant.id = :typeIntervenantId
        AND LOWER(c.libelle) = LOWER(:libelle)
        AND (
            (:lotId IS NULL AND c.lot IS NULL)
            OR (:lotId IS NOT NULL AND c.lot.id = :lotId)
        )
        """)
    Optional<CategorieEvaluation> findDuplicateLibelle(
            @Param("typeIntervenantId") Long typeIntervenantId,
            @Param("lotId") Long lotId,
            @Param("libelle") String libelle
    );
}