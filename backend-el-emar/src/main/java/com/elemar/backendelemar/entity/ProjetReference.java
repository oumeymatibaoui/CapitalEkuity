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
@Table(name = "projet_reference")
public class ProjetReference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Projet de référence lié à une mini-candidature
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_candidature_id", nullable = false)
    private ApplicationCandidature applicationCandidature;

    @Column(name = "nom_projet")
    private String nomProjet;

    @Column(name = "lot_concerne")
    private String lotConcerne;

    @Column(name = "maitre_ouvrage")
    private String maitreOuvrage;

    private String ville;

    private String zone;

    @Column(name = "type_projet")
    private String typeProjet;

    @Column(name = "surface_m2")
    private BigDecimal surfaceM2;

    @Column(name = "niveaux_r_plus")
    private String niveauxRPlus;

    @Column(name = "nombre_sous_sols")
    private Integer nombreSousSols;

    @Column(name = "annee_livraison")
    private Integer anneeLivraison;

    @Column(name = "bim_oui_non")
    private Boolean bimOuiNon;

    @Column(name = "seuil_ok")
    private Boolean seuilOk;

    @Column(name = "fichier_p11", columnDefinition = "text")
    private String fichierP11;

    @Column(name = "fichier_p12", columnDefinition = "text")
    private String fichierP12;
}