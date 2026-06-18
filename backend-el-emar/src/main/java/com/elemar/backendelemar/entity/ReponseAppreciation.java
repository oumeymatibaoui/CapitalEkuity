package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "reponse_appreciation",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_reponse_appreciation",
                        columnNames = {"application_candidature_id", "champ_appreciation_id"}
                )
        }
)
public class ReponseAppreciation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Réponse pour une mini-candidature
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_candidature_id", nullable = false)
    private ApplicationCandidature applicationCandidature;

    // Champ demandé
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "champ_appreciation_id", nullable = false)
    private ChampAppreciation champAppreciation;

    @Column(name = "valeur_reponse", columnDefinition = "text")
    private String valeurReponse;

    @Column(name = "piece_jointe_oui_non")
    private Boolean pieceJointeOuiNon;

    @Column(name = "commentaire_bureau", columnDefinition = "text")
    private String commentaireBureau;

    @Column(name = "date_reponse")
    private LocalDateTime dateReponse;
}