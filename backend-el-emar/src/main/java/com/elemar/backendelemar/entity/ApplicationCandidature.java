package com.elemar.backendelemar.entity;

import com.elemar.backendelemar.enums.DecisionFinale;
import com.elemar.backendelemar.enums.StatutApplication;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "application_candidature",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_application_candidature_direct_lot",
                        columnNames = {"candidature_id", "lot_id"}
                )
        }
)
public class ApplicationCandidature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Candidature globale
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidature_id", nullable = false)
    private Candidature candidature;

    // Nouveau modèle : application directe par lot
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id", nullable = false)
    private Lot lot;

    // Ancien modèle conservé pour le futur module Appel/Campagne
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appel_lot_id")
    private AppelLot appelLot;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_application")
    private StatutApplication statut = StatutApplication.BROUILLON;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation;

    @Column(name = "date_soumission")
    private LocalDateTime dateSoumission;

    @Column(name = "taux_completion")
    private BigDecimal tauxCompletion = BigDecimal.ZERO;

    @Column(name = "phase1_validee")
    private Boolean phase1Validee = false;

    @Column(name = "note_finale")
    private BigDecimal noteFinale;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "decision_finale", columnDefinition = "decision_finale")
    private DecisionFinale decisionFinale;

    @Column(name = "observation_finale", columnDefinition = "text")
    private String observationFinale;

    @Column(name = "date_decision")
    private LocalDateTime dateDecision;






    @Column(name = "evaluateur_decision_id")
    private Long evaluateurDecisionId;
}