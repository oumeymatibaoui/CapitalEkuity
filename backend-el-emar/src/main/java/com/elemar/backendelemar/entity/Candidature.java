package com.elemar.backendelemar.entity;

import com.elemar.backendelemar.enums.StatutCandidature;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "candidature",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_candidature_user_appel",
                        columnNames = {"utilisateur_id", "appel_candidature_id"}
                )
        }
)
public class Candidature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Le compte du bureau / candidat
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    // L'offre affectée à ce bureau
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appel_candidature_id", nullable = false)
    private AppelCandidature appelCandidature;

    // Responsable El Emar qui a créé la candidature
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
    private StatutCandidature statut;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}