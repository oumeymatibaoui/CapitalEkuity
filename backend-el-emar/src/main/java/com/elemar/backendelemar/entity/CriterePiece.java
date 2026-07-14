package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "critere_piece",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_critere_piece_code",
                        columnNames = {"critere_evaluation_id", "code_piece"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CriterePiece {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "critere_evaluation_id", nullable = false)
    private CritereEvaluation critereEvaluation;

    @Column(name = "code_piece", nullable = false, length = 80)
    private String codePiece;

    @Column(name = "nom_piece", nullable = false, columnDefinition = "TEXT")
    private String nomPiece;

    @Column(name = "raison_piece", columnDefinition = "TEXT")
    private String raisonPiece;

    @Column(name = "note_candidat", columnDefinition = "TEXT")
    private String noteCandidat;

    @Column(name = "note_evaluateur", columnDefinition = "TEXT")
    private String noteEvaluateur;

    @Column(name = "format_accepte")
    private String formatAccepte;

    @Column(name = "obligatoire")
    private Boolean obligatoire;

    @Column(name = "condition_reponse")
    private String conditionReponse;

    @Column(name = "ordre_affichage")
    private Integer ordreAffichage;

    @Column(name = "actif")
    private Boolean actif;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (formatAccepte == null || formatAccepte.isBlank()) formatAccepte = "PDF";
        if (obligatoire == null) obligatoire = true;
        if (ordreAffichage == null) ordreAffichage = 0;
        if (actif == null) actif = true;

        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}