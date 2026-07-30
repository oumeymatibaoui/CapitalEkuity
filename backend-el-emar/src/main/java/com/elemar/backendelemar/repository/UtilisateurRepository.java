package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

    Optional<Utilisateur> findByEmail(String email);

    Optional<Utilisateur> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<Utilisateur> findByCandidature_Id(Long candidatureId);

    List<Utilisateur> findByCandidature_IdAndActifTrue(Long candidatureId);
    @Query("""
       SELECT COUNT(u)
       FROM Utilisateur u
       WHERE u.roleAcces.id = :roleId
       """)
    long countByRoleId(@Param("roleId") Long roleId);
}