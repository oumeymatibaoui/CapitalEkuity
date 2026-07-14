package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "grille_evaluation_lot")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GrilleEvaluationLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id", nullable = false)
    private Lot lot;

    @Column(name = "code_grille", nullable = false, unique = true, length = 80)
    private String codeGrille;

    @Column(name = "nom_grille", nullable = false)
    private String nomGrille;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "total_points", precision = 6, scale = 2)
    private BigDecimal totalPoints;

    @Column(name = "seuil_admission", precision = 6, scale = 2)
    private BigDecimal seuilAdmission;

    @Column(name = "actif")
    private Boolean actif;

    @OneToMany(mappedBy = "grilleEvaluationLot", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CritereEvaluation> criteres = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (totalPoints == null) totalPoints = BigDecimal.valueOf(100);
        if (seuilAdmission == null) seuilAdmission = BigDecimal.valueOf(80);
        if (actif == null) actif = true;

        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}