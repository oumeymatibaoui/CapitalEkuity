package com.elemar.backendelemar.entity;

import com.elemar.backendelemar.enums.StatutDocument;
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
@Table(
        name = "document_depose",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_document_depose_version",
                        columnNames = {"application_candidature_id", "document_demande_id", "version"}
                )
        }
)
public class DocumentDepose {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Vraie mini-candidature
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_candidature_id", nullable = false)
    private ApplicationCandidature applicationCandidature;

    // Document demandé
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_demande_id", nullable = false)
    private DocumentDemande documentDemande;

    @Column(name = "nom_fichier")
    private String nomFichier;

    @Column(name = "url_fichier", columnDefinition = "text")
    private String urlFichier;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut_document", columnDefinition = "statut_document")
    private StatutDocument statutDocument;

    @Column(name = "commentaire_el_emar", columnDefinition = "text")
    private String commentaireElEmar;

    @Column(name = "date_upload")
    private LocalDateTime dateUpload;

    @Column(name = "date_verification")
    private LocalDateTime dateVerification;

    private Integer version;
}