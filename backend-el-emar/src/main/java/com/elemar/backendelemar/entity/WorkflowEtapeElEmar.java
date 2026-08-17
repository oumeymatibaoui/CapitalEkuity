package com.elemar.backendelemar.entity;

import com.elemar.backendelemar.enums.StatutWorkflowEtape;
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
        name = "workflow_etape_el_emar",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_workflow_candidature_ordre",
                        columnNames = {
                                "candidature_id",
                                "ordre"
                        }
                ),
                @UniqueConstraint(
                        name = "uq_workflow_candidature_code",
                        columnNames = {
                                "candidature_id",
                                "code_etape"
                        }
                )
        }
)
public class WorkflowEtapeElEmar {

    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    private Long id;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "candidature_id",
            nullable = false
    )
    private Candidature candidature;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "utilisateur_affecte_id",
            nullable = false
    )
    private Utilisateur utilisateurAffecte;

    @Column(
            name = "code_etape",
            nullable = false,
            length = 80
    )
    private String codeEtape;

    @Column(
            name = "libelle_etape",
            nullable = false,
            length = 160
    )
    private String libelleEtape;

    @Column(
            name = "ordre",
            nullable = false
    )
    private Integer ordre;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(
            name = "statut",
            nullable = false,
            length = 20
    )
    private StatutWorkflowEtape statut =
            StatutWorkflowEtape.EN_ATTENTE;

    @Column(
            name = "commentaire_transmission",
            columnDefinition = "TEXT"
    )
    private String commentaireTransmission;

    @Column(name = "date_debut")
    private LocalDateTime dateDebut;

    @Column(name = "date_fin")
    private LocalDateTime dateFin;

    @Column(name = "date_reouverture")
    private LocalDateTime dateReouverture;

    @Column(
            name = "motif_reouverture",
            columnDefinition = "TEXT"
    )
    private String motifReouverture;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cree_par_id")
    private Utilisateur creePar;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "modifie_par_id")
    private Utilisateur modifiePar;

    @Builder.Default
    @Column(
            name = "created_at",
            nullable = false
    )
    private LocalDateTime createdAt =
            LocalDateTime.now();

    @Builder.Default
    @Column(
            name = "updated_at",
            nullable = false
    )
    private LocalDateTime updatedAt =
            LocalDateTime.now();

    @Version
    @Column(
            name = "version",
            nullable = false
    )
    private Long version;

    @PrePersist
    void beforeInsert() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        updatedAt = now;

        normalize();
    }

    @PreUpdate
    void beforeUpdate() {
        updatedAt = LocalDateTime.now();
        normalize();
    }

    private void normalize() {
        if (statut == null) {
            statut =
                    StatutWorkflowEtape.EN_ATTENTE;
        }

        if (codeEtape != null) {
            codeEtape = codeEtape
                    .trim()
                    .toUpperCase();
        }

        if (libelleEtape != null) {
            libelleEtape =
                    libelleEtape.trim();
        }
    }

    @Transient
    public boolean isModifiable() {
        return statut != null
                && statut.estModifiable();
    }

    @Transient
    public boolean isVerrouillee() {
        return statut == null
                || statut.estVerrouillee();
    }
}