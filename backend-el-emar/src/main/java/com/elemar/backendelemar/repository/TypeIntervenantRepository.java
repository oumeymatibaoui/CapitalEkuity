package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.TypeIntervenant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TypeIntervenantRepository extends JpaRepository<TypeIntervenant, Long> {

    Optional<TypeIntervenant> findByCodeIgnoreCase(String code);

    List<TypeIntervenant> findAllByOrderByOrdreAffichageAscLibelleAsc();

    List<TypeIntervenant> findByActifTrueOrderByOrdreAffichageAscLibelleAsc();
}