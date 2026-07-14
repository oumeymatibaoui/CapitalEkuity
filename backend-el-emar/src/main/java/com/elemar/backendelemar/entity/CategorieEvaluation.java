package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "categorie_evaluation")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategorieEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Type d’intervenant :
     * Bureau d’études / Entreprise travaux / Fournisseur
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "type_intervenant_id", nullable = false)
    private TypeIntervenant typeIntervenant;

    /**
     * Optionnel.
     * Si lot = null : catégorie générale pour tout le type.
     * Si lot != null : catégorie spécifique à un lot.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id")
    private Lot lot;

    @Column(name = "code", nullable = false, length = 80)
    private String code;

    @Column(name = "libelle", nullable = false, length = 180)
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