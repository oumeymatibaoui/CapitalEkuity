package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "critere_evaluation",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_critere_eval_grille_code",
                        columnNames = {"grille_evaluation_lot_id", "code_critere"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CritereEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grille_evaluation_lot_id", nullable = false)
    private GrilleEvaluationLot grilleEvaluationLot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id", nullable = false)
    private Lot lot;

    @Column(name = "code_critere", nullable = false, length = 80)
    private String codeCritere;

    @Column(name = "section", nullable = false)
    private String section;

    @Column(name = "libelle_critere", nullable = false, columnDefinition = "TEXT")
    private String libelleCritere;

    @Column(name = "label_candidat", nullable = false, columnDefinition = "TEXT")
    private String labelCandidat;

    @Column(name = "aide_candidat", columnDefinition = "TEXT")
    private String aideCandidat;

    @Column(name = "raison_donnee", columnDefinition = "TEXT")
    private String raisonDonnee;

    @Column(name = "note_candidat", columnDefinition = "TEXT")
    private String noteCandidat;

    @Column(name = "note_evaluateur", columnDefinition = "TEXT")
    private String noteEvaluateur;

    @Column(name = "points_max", precision = 6, scale = 2)
    private BigDecimal pointsMax;

    @Column(name = "bareme_notation", columnDefinition = "TEXT")
    private String baremeNotation;

    @Column(name = "type_notation", length = 50)
    private String typeNotation;

    @Column(name = "type_champ", length = 50)
    private String typeChamp;

    @Column(name = "options_champ", columnDefinition = "TEXT")
    private String optionsChamp;

    @Column(name = "obligatoire")
    private Boolean obligatoire;

    @Column(name = "ordre_affichage")
    private Integer ordreAffichage;

    @Column(name = "actif")
    private Boolean actif;

    @OneToMany(mappedBy = "critereEvaluation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CriterePiece> pieces = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (pointsMax == null) pointsMax = BigDecimal.ZERO;
        if (typeNotation == null || typeNotation.isBlank()) typeNotation = "MANUEL";
        if (typeChamp == null || typeChamp.isBlank()) typeChamp = "TEXT";
        if (obligatoire == null) obligatoire = false;
        if (ordreAffichage == null) ordreAffichage = 0;
        if (actif == null) actif = true;

        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categorie_evaluation_id")
    private CategorieEvaluation categorieEvaluation;
    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}