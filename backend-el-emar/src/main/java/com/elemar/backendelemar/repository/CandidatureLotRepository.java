package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.CandidatureLot;
import com.elemar.backendelemar.entity.Utilisateur;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CandidatureLotRepository extends JpaRepository<CandidatureLot, Long> {

    @EntityGraph(attributePaths = {"lot"})
    List<CandidatureLot> findByCandidature_IdAndActifTrue(Long candidatureId);

    @EntityGraph(attributePaths = {"lot"})
    List<CandidatureLot> findByCandidature_Id(
            Long candidatureId
    );

    Optional<CandidatureLot> findByCandidature_IdAndLot_Id(Long candidatureId, Long lotId);

    boolean existsByCandidature_IdAndLot_IdAndActifTrue(Long candidatureId, Long lotId);
}