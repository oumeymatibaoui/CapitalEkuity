package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.Candidature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidatureRepository
        extends JpaRepository<Candidature, Long> {

    /**
     * Toutes les candidatures actives,
     * de la plus récente à la plus ancienne.
     */
    List<Candidature> findByActifTrueOrderByIdDesc();

    /**
     * Une candidature active par son identifiant.
     */
    Optional<Candidature> findByIdAndActifTrue(
            Long id
    );

    /**
     * Compatibilité avec l’ancien code.
     *
     * La relation n’est plus :
     * candidature.utilisateur_id
     *
     * La relation utilisée est maintenant :
     * utilisateur.candidature_id
     */
    @Query("""
        SELECT u.candidature
        FROM Utilisateur u
        WHERE u.id = :utilisateurId
          AND u.candidature IS NOT NULL
        """)
    Optional<Candidature>
    findFirstByUtilisateur_IdOrderByIdDesc(
            @Param("utilisateurId")
            Long utilisateurId
    );

    /**
     * Compatibilité avec les anciens services
     * qui attendent encore une liste.
     *
     * Un utilisateur appartient normalement
     * à une seule candidature.
     */
    @Query("""
        SELECT u.candidature
        FROM Utilisateur u
        WHERE u.id = :utilisateurId
          AND u.candidature IS NOT NULL
        """)
    List<Candidature>
    findByUtilisateur_IdOrderByIdDesc(
            @Param("utilisateurId")
            Long utilisateurId
    );
}