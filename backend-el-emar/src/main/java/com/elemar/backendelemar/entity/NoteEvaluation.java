package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "note_evaluation",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_note_evaluation",
                        columnNames = {"application_candidature_id", "critere_evaluation_id"}
                )
        }
)
public class NoteEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mini-candidature évaluée
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_candidature_id", nullable = false)
    private ApplicationCandidature applicationCandidature;

    // Critère de la grille
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "critere_evaluation_id", nullable = false)
    private CritereEvaluation critereEvaluation;

    @Column(name = "note_obtenue")
    private BigDecimal noteObtenue;

    @Column(name = "commentaire_el_emar", columnDefinition = "text")
    private String commentaireElEmar;

    @Column(name = "date_notation")
    private LocalDateTime dateNotation;
}