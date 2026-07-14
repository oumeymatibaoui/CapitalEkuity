package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "piece_critere_deposee",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_piece_application_critere_piece",
                        columnNames = {"application_candidature_id", "critere_piece_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PieceCritereDeposee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidature_id", nullable = false)
    private Candidature candidature;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_candidature_id", nullable = false)
    private ApplicationCandidature applicationCandidature;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "critere_piece_id", nullable = false)
    private CriterePiece criterePiece;

    @Column(name = "nom_fichier")
    private String nomFichier;

    @Column(name = "chemin_fichier", columnDefinition = "TEXT")
    private String cheminFichier;

    @Column(name = "type_contenu")
    private String typeContenu;

    @Column(name = "taille_fichier")
    private Long tailleFichier;

    @Column(name = "statut")
    private String statut;

    @Column(name = "commentaire", columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (statut == null || statut.isBlank()) statut = "DEPOSE";

        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}