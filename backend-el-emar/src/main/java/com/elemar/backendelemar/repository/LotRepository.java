package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.Lot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LotRepository extends JpaRepository<Lot, Long> {

    Optional<Lot> findByCodeLotIgnoreCase(String codeLot);

    List<Lot> findAllByOrderByNomLotAsc();

    List<Lot> findByTypeIntervenantIdOrderByNomLotAsc(Long typeIntervenantId);

    long countByTypeIntervenantId(Long typeIntervenantId);
}