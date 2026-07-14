package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "type_intervenant")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TypeIntervenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Exemples :
     * BUREAU_ETUDES
     * ENTREPRISE_TRAVAUX
     * FOURNISSEUR
     */
    @Column(name = "code", nullable = false, unique = true, length = 80)
    private String code;

    /**
     * Exemples :
     * Bureau d'études
     * Entreprise de travaux
     * Fournisseur
     */
    @Column(name = "libelle", nullable = false, length = 150)
    private String libelle;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "actif")
    private Boolean actif;

    @Column(name = "ordre_affichage")
    private Integer ordreAffichage;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();

        this.createdAt = now;
        this.updatedAt = now;

        if (this.actif == null) {
            this.actif = true;
        }

        if (this.ordreAffichage == null) {
            this.ordreAffichage = 0;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}