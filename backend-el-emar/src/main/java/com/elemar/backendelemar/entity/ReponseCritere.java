package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "reponse_critere",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_reponse_application_critere",
                        columnNames = {"application_candidature_id", "critere_evaluation_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReponseCritere {

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
    @JoinColumn(name = "critere_evaluation_id", nullable = false)
    private CritereEvaluation critereEvaluation;

    @Column(name = "valeur_text", columnDefinition = "TEXT")
    private String valeurText;

    @Column(name = "valeur_number", precision = 12, scale = 2)
    private BigDecimal valeurNumber;

    @Column(name = "valeur_boolean")
    private Boolean valeurBoolean;

    @Column(name = "valeur_date")
    private LocalDate valeurDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}