package com.elemar.backendelemar.entity;

import com.elemar.backendelemar.enums.StatutCandidature;
import com.elemar.backendelemar.enums.StatutSolvabilite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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

    // =====================================================
    // IDENTIFIANT
    // =====================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    // =====================================================
    // RELATIONS
    // =====================================================

    /**
     * Compte utilisateur principal lié à la candidature.
     */
//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "utilisateur_id")
//    private Utilisateur utilisateur;


    /**
     * Appel à candidature associé.
     */
//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "appel_candidature_id")
//    private AppelCandidature appelCandidature;


    /**
     * Utilisateur El Emar ayant créé l’accès.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cree_par_utilisateur_id")
    private Utilisateur creeParUtilisateur;


    /**
     * Type d’intervenant de la société.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "type_intervenant_id")
    private TypeIntervenant typeIntervenant;


    // =====================================================
    // INFORMATIONS DE LA SOCIÉTÉ
    // =====================================================

    @Column(name = "nom_entreprise", length = 200)
    private String nomEntreprise;

    @Column(name = "raison_sociale")
    private String raisonSociale;

    @Column(name = "forme_juridique")
    private String formeJuridique;

    @Column(name = "rne_matricule_fiscal")
    private String rneMatriculeFiscal;

    @Column(name = "date_creation_bureau")
    private LocalDate dateCreationBureau;

    @Column(
            name = "adresse_siege",
            columnDefinition = "TEXT"
    )
    private String adresseSiege;

    @Column(name = "adresse", columnDefinition = "TEXT")
    private String adresse;

    @Column(name = "telephone")
    private String telephone;

    @Column(name = "email_principal")
    private String emailPrincipal;

    @Column(name = "site_internet")
    private String siteInternet;

    @Column(name = "ville")
    private String ville;

    @Column(name = "representant_legal")
    private String representantLegal;

    @Column(name = "fonction_representant")
    private String fonctionRepresentant;

    @Column(columnDefinition = "TEXT")
    private String specialites;

    @Column(
            name = "agrements_certifications",
            columnDefinition = "TEXT"
    )
    private String agrementsCertifications;

    @Column(name = "banque_principale")
    private String banquePrincipale;

    @Column(name = "localisation")
    private String localisation;


    // =====================================================
    // ACCÈS À LA PLATEFORME
    // =====================================================

    @Column(name = "lien_acces", columnDefinition = "TEXT")
    private String lienAcces;

    @Column(name = "token_acces")
    private String tokenAcces;

    @Column(name = "date_expiration_acces")
    private LocalDateTime dateExpirationAcces;

    /**
     * Permet à El Emar de bloquer ou d’autoriser
     * la connexion de l’intervenant.
     */
    @Builder.Default
    @Column(name = "acces_bloque", nullable = false)
    private Boolean accesBloque = false;

    @Builder.Default
    @Column(name = "profil_complete", nullable = false)
    private Boolean profilComplete = false;

    /**
     * Actif = la candidature existe toujours dans le système.
     *
     * Ce champ est différent de accesBloque :
     * - actif = false : candidature supprimée logiquement ;
     * - accesBloque = true : candidature visible mais accès bloqué.
     */
    @Builder.Default
    @Column(name = "actif", nullable = false)
    private Boolean actif = true;


    // =====================================================
    // STATUT DE LA CANDIDATURE
    // =====================================================

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(
            name = "statut",
            nullable = false,
            columnDefinition = "statut_candidature"
    )
    private StatutCandidature statut =
            StatutCandidature.BROUILLON;

    @Column(name = "date_soumission")
    private LocalDateTime dateSoumission;


    // =====================================================
    // DOCUMENT RNE
    // =====================================================

    @Column(name = "rne_nom_fichier")
    private String rneNomFichier;

    @Column(
            name = "rne_chemin_fichier",
            columnDefinition = "TEXT"
    )
    private String rneCheminFichier;

    @Column(name = "rne_type_contenu")
    private String rneTypeContenu;

    @Column(name = "rne_taille_fichier")
    private Long rneTailleFichier;

    @Column(name = "rne_statut")
    private String rneStatut;


    // =====================================================
    // DOCUMENT CNSS
    // =====================================================

    @Column(name = "cnss_nom_fichier")
    private String cnssNomFichier;

    @Column(
            name = "cnss_chemin_fichier",
            columnDefinition = "TEXT"
    )
    private String cnssCheminFichier;

    @Column(name = "cnss_type_contenu")
    private String cnssTypeContenu;

    @Column(name = "cnss_taille_fichier")
    private Long cnssTailleFichier;

    @Column(name = "cnss_statut")
    private String cnssStatut;


    // =====================================================
    // CONTRÔLE PRIVÉ DE SOLVABILITÉ EL EMAR
    // =====================================================

    /**
     * Statut du contrôle financier privé effectué par El Emar.
     *
     * Valeurs possibles :
     * - A_VERIFIER
     * - SOLVABLE
     * - NON_SOLVABLE
     */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(
            name = "solvabilite_statut",
            nullable = false,
            length = 20
    )
    private StatutSolvabilite solvabiliteStatut =
            StatutSolvabilite.A_VERIFIER;


    /**
     * Commentaire confidentiel ajouté par El Emar.
     *
     * Ce champ ne doit pas être envoyé dans les DTO
     * utilisés par l’espace intervenant.
     */
    @Column(
            name = "solvabilite_commentaire",
            columnDefinition = "TEXT"
    )
    private String solvabiliteCommentaire;


    /**
     * Identifiant de l’utilisateur El Emar ayant effectué
     * le dernier contrôle de solvabilité.
     */
    @Column(name = "solvabilite_evaluateur_id")
    private Long solvabiliteEvaluateurId;


    /**
     * Date du dernier enregistrement du contrôle
     * de solvabilité.
     */
    @Column(name = "solvabilite_date_validation")
    private LocalDateTime solvabiliteDateValidation;


    // =====================================================
    // DATES TECHNIQUES
    // =====================================================

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;


    // =====================================================
    // LISTES ASSOCIÉES
    // =====================================================

    @Builder.Default
    @OneToMany(mappedBy = "candidature")
    private List<Utilisateur> utilisateurs =
            new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "candidature")
    private List<CandidatureLot> candidatureLots =
            new ArrayList<>();
}