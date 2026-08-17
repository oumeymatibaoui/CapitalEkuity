package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.WorkflowModeleEtape;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface WorkflowModeleEtapeRepository
        extends JpaRepository<WorkflowModeleEtape, Long> {

    List<WorkflowModeleEtape> findAllByOrderByOrdreAsc();

    List<WorkflowModeleEtape> findByActifTrueOrderByOrdreAsc();

    Optional<WorkflowModeleEtape> findByCodeEtapeIgnoreCase(String codeEtape);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select w
            from WorkflowModeleEtape w
            order by w.ordre asc
            """)
    List<WorkflowModeleEtape> findAllForUpdate();
}
