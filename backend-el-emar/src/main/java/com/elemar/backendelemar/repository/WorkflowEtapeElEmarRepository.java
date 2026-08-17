package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.WorkflowEtapeElEmar;
import com.elemar.backendelemar.enums.StatutWorkflowEtape;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WorkflowEtapeElEmarRepository
        extends JpaRepository<WorkflowEtapeElEmar, Long> {

    boolean existsByCandidature_Id(Long candidatureId);

    List<WorkflowEtapeElEmar>
    findAllByCandidature_IdOrderByOrdreAsc(Long candidatureId);

    List<WorkflowEtapeElEmar>
    findAllByUtilisateurAffecte_IdAndStatutInOrderByUpdatedAtDesc(
            Long utilisateurId,
            List<StatutWorkflowEtape> statuts
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select w
            from WorkflowEtapeElEmar w
            where w.id = :id
            """)
    Optional<WorkflowEtapeElEmar> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select w
            from WorkflowEtapeElEmar w
            where w.candidature.id = :candidatureId
            order by w.ordre asc
            """)
    List<WorkflowEtapeElEmar> findAllForUpdate(
            @Param("candidatureId") Long candidatureId
    );

    @Query("""
            select w
            from WorkflowEtapeElEmar w
            where w.candidature.id = :candidatureId
              and w.statut in :statuts
            order by w.ordre asc
            """)
    List<WorkflowEtapeElEmar> findActiveByCandidature(
            @Param("candidatureId") Long candidatureId,
            @Param("statuts") List<StatutWorkflowEtape> statuts
    );

    @Modifying
    @Query("""
            delete from WorkflowEtapeElEmar w
            where w.candidature.id = :candidatureId
            """)
    int deleteAllByCandidatureId(
            @Param("candidatureId") Long candidatureId
    );
}
