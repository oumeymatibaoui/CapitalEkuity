package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "classement_zone")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassementZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * C’est la candidature par lot.
     * Dans ton front, tu utilises déjà selectedLot.applicationCandidatureId.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_candidature_id", nullable = false)
    private ApplicationCandidature applicationCandidature;

    /*
     * Zone El Emar : Z1, Z2, Z3...
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    private Zone zone;

    /*
     * Catégorie calculée :
     * A = référence validée en zone forte
     * B = référence validée en zone moyenne
     * C = référence validée en zone simple
     * NON_QUALIFIE = note < 80
     */
    @Column(name = "categorie", length = 30, nullable = false)
    private String categorie;

    @Column(name = "commentaire", columnDefinition = "TEXT")
    private String commentaire;

    @Builder.Default
    @Column(name = "actif", nullable = false)
    private Boolean actif = true;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (actif == null) {
            actif = true;
        }

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}