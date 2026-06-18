package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "critere_evaluation")
public class CritereEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Critère lié à un lot précis dans un appel
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appel_lot_id", nullable = false)
    private AppelLot appelLot;

    @Column(name = "categorie_evaluation")
    private String categorieEvaluation;

    @Column(name = "nom_critere", nullable = false)
    private String nomCritere;

    @Column(name = "description_critere", columnDefinition = "text")
    private String descriptionCritere;

    @Column(name = "points_max", nullable = false)
    private BigDecimal pointsMax;

    @Column(name = "condition_bareme", columnDefinition = "text")
    private String conditionBareme;

    @Column(name = "documents_requis", columnDefinition = "text")
    private String documentsRequis;

    @Column(name = "ordre_affichage")
    private Integer ordreAffichage;

    private Boolean actif;
}