package com.elemar.backendelemar.entity;

import com.elemar.backendelemar.enums.StatutCandidature;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "candidature")
public class Candidature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Compte CND connecté
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    // Future logique appel/campagne - optionnel maintenant
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appel_candidature_id")
    private AppelCandidature appelCandidature;

    // Responsable El Emar - optionnel maintenant
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cree_par_utilisateur_id")
    private Utilisateur creeParUtilisateur;

    @Column(name = "raison_sociale")
    private String raisonSociale;

    @Column(name = "forme_juridique")
    private String formeJuridique;

    @Column(name = "rne_matricule_fiscal")
    private String rneMatriculeFiscal;

    @Column(name = "date_creation_bureau")
    private LocalDate dateCreationBureau;

    @Column(name = "adresse_siege", columnDefinition = "text")
    private String adresseSiege;

    private String telephone;

    @Column(name = "email_principal")
    private String emailPrincipal;

    @Column(name = "site_internet")
    private String siteInternet;

    private String ville;

    @Column(name = "representant_legal")
    private String representantLegal;

    @Column(name = "fonction_representant")
    private String fonctionRepresentant;

    @Column(columnDefinition = "text")
    private String specialites;

    @Column(name = "agrements_certifications", columnDefinition = "text")
    private String agrementsCertifications;

    @Column(name = "banque_principale")
    private String banquePrincipale;

    private String localisation;

    @Column(name = "lien_acces", columnDefinition = "text")
    private String lienAcces;

    @Column(name = "token_acces")
    private String tokenAcces;

    @Column(name = "date_expiration_acces")
    private LocalDateTime dateExpirationAcces;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_candidature")
    private StatutCandidature statut = StatutCandidature.BROUILLON;

    @Column(name = "acces_bloque")
    private Boolean accesBloque = false;

    @Column(name = "date_soumission")
    private LocalDateTime dateSoumission;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @Column(name = "rne_nom_fichier")
    private String rneNomFichier;

    @Column(name = "rne_chemin_fichier", columnDefinition = "TEXT")
    private String rneCheminFichier;

    @Column(name = "rne_type_contenu")
    private String rneTypeContenu;

    @Column(name = "rne_taille_fichier")
    private Long rneTailleFichier;

    @Column(name = "rne_statut")
    private String rneStatut;

    @Column(name = "cnss_nom_fichier")
    private String cnssNomFichier;

    @Column(name = "cnss_chemin_fichier", columnDefinition = "TEXT")
    private String cnssCheminFichier;

    @Column(name = "cnss_type_contenu")
    private String cnssTypeContenu;

    @Column(name = "cnss_taille_fichier")
    private Long cnssTailleFichier;

    @Column(name = "cnss_statut")
    private String cnssStatut;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "type_intervenant_id")
    private TypeIntervenant typeIntervenant;


    @Column(name = "nom_entreprise", length = 200)
    private String nomEntreprise;




    @Column(name = "adresse", columnDefinition = "TEXT")
    private String adresse;



    @Column(name = "profil_complete")
    private Boolean profilComplete;

    @Column(name = "actif")
    private Boolean actif;

    @OneToMany(mappedBy = "candidature")
    private List<Utilisateur> utilisateurs = new ArrayList<>();

    @OneToMany(mappedBy = "candidature")
    private List<CandidatureLot> candidatureLots = new ArrayList<>();
}