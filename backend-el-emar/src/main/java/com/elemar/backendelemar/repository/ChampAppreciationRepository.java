package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.ChampAppreciation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChampAppreciationRepository extends JpaRepository<ChampAppreciation, Long> {

    List<ChampAppreciation> findByLot_IdOrderByOrdreAffichageAsc(Long lotId);

    boolean existsByLot_IdAndNomChampIgnoreCase(Long lotId, String nomChamp);

    boolean existsByLot_IdAndNomChampIgnoreCaseAndIdNot(
            Long lotId,
            String nomChamp,
            Long id
    );

    boolean existsByLot_IdAndCodePxxIgnoreCase(Long lotId, String codePxx);

    boolean existsByLot_IdAndCodePxxIgnoreCaseAndIdNot(
            Long lotId,
            String codePxx,
            Long id
    );
}