package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "lot")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Exemple :
     * ETU-STRUCT
     * ETU-ELEC
     * TRV-CIVIL
     * FOUR-TECH
     */
    @Column(name = "code_lot", nullable = false, unique = true, length = 100)
    private String codeLot;

    /**
     * Exemple :
     * Étude structurelle
     * Réseaux électriques
     * Fournisseur technique
     */
    @Column(name = "nom_lot", nullable = false, length = 200)
    private String nomLot;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "actif")
    private Boolean actif;

    /**
     * Chaque domaine / lot appartient à un type d'intervenant :
     * Bureau d'études
     * Entreprise de travaux
     * Fournisseur
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "type_intervenant_id")
    private TypeIntervenant typeIntervenant;

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
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}