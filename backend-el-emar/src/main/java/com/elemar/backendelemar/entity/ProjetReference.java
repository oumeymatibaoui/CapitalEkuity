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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_candidature_id")
    private ApplicationCandidature applicationCandidature;

    @Column(name = "lot_concerne")
    private String lotConcerne;

    @Column(name = "nom_projet")
    private String nomProjet;

    @Column(name = "maitre_ouvrage")
    private String maitreOuvrage;

    @Column(name = "ville")
    private String ville;

    @Column(name = "zone")
    private String zone;

    /**
     * Zone validée par El Emar.
     */
    @Column(name = "zone_el_emar_id")
    private Long zoneElEmarId;

    @Column(name = "zone_el_emar_nom")
    private String zoneElEmarNom;

    @Column(name = "zone_validee")
    private Boolean zoneValidee = false;

    @Column(name = "adresse_projet")
    private String adresseProjet;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "type_projet")
    private String typeProjet;

    @Column(name = "surface_m2")
    private BigDecimal surfaceM2;

    @Column(name = "niveaux_r_plus")
    private Integer niveauxRPlus;

    @Column(name = "nombre_sous_sols")
    private Integer nombreSousSols;

    @Column(name = "annee_livraison")
    private Integer anneeLivraison;

    @Column(name = "bim_oui_non")
    private Boolean bimOuiNon;

    @Column(name = "seuil_ok")
    private Boolean seuilOk;

    @Column(name = "mission_realisee")
    private String missionRealisee;

    @Column(name = "montant")
    private BigDecimal montant;

    @Column(name = "fichier_p11")
    private String fichierP11;

    @Column(name = "fichier_p12")
    private String fichierP12;
}