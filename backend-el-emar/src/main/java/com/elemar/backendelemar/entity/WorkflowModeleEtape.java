package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "workflow_modele_etape",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_workflow_modele_code",
                        columnNames = "code_etape"
                ),
                @UniqueConstraint(
                        name = "uk_workflow_modele_ordre",
                        columnNames = "ordre"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowModeleEtape {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code_etape", nullable = false, length = 80)
    private String codeEtape;

    @Column(name = "libelle_etape", nullable = false, length = 160)
    private String libelleEtape;

    @Column(name = "ordre", nullable = false)
    private Integer ordre;

    @Column(name = "departement_code", nullable = false, length = 30)
    private String departementCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_defaut_id")
    private Utilisateur utilisateurDefaut;

    @Column(name = "actif", nullable = false)
    @Builder.Default
    private Boolean actif = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "modifie_par_id")
    private Utilisateur modifiePar;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}
