package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.Candidature;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CandidatureRepository extends JpaRepository<Candidature, Long> {

    Optional<Candidature> findFirstByUtilisateur_IdOrderByIdDesc(Long utilisateurId);
    List<Candidature> findByActifTrueOrderByIdDesc();
    List<Candidature> findByUtilisateur_IdOrderByIdDesc(Long utilisateurId);
    Optional<Candidature> findByIdAndActifTrue(Long id);
}