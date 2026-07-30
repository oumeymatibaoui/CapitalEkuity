package com.elemar.backendelemar.entity;

import com.elemar.backendelemar.enums.StatutCompte;
import com.elemar.backendelemar.enums.TypeUtilisateur;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "utilisateur")
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nom;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "mot_de_passe", nullable = false)
    private String motDePasse;

    /*
     * Champ historique conservé pendant la migration.
     * Il ne doit pas encore être supprimé.
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(
            name = "type_utilisateur",
            nullable = false,
            columnDefinition = "type_utilisateur"
    )
    private TypeUtilisateur typeUtilisateur;

    /*
     * Nouveau rôle dynamique.
     * Nullable pendant la période de migration.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "role_id",
            foreignKey = @ForeignKey(name = "fk_utilisateur_role_acces")
    )
    private RoleAcces roleAcces;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(
            name = "statut_compte",
            nullable = false,
            columnDefinition = "statut_compte"
    )
    @Builder.Default
    private StatutCompte statutCompte = StatutCompte.ACTIF;

    @Column(name = "premiere_connexion")
    private Boolean premiereConnexion;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidature_id")
    private Candidature candidature;

    @Column(name = "fonction", length = 120)
    private String fonction;

    @Column(name = "telephone", length = 50)
    private String telephone;

    @Column(name = "must_change_password")
    private Boolean mustChangePassword;

    @Column(name = "actif")
    private Boolean actif;
}