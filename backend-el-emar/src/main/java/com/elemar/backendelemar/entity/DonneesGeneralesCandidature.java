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
@Table(name = "old_donnees_generales_candidature")
public class DonneesGeneralesCandidature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_candidature_id", nullable = false, unique = true)
    private ApplicationCandidature applicationCandidature;

    @Column(name = "effectif_total")
    private Integer effectifTotal;

    @Column(name = "nb_ingenieurs_architectes")
    private Integer nbIngenieursArchitectes;

    @Column(name = "experience_responsable")
    private Integer experienceResponsable;

    @Column(name = "bureau_multidisciplinaire")
    private Boolean bureauMultidisciplinaire;

    @Column(name = "disciplines_complementaires", columnDefinition = "text")
    private String disciplinesComplementaires;

    @Column(name = "nb_projets_en_cours")
    private Integer nbProjetsEnCours;

    @Column(name = "chiffre_affaires_moyen_3ans")
    private BigDecimal chiffreAffairesMoyen3ans;
}