package com.elemar.backendelemar.entity;

import com.elemar.backendelemar.enums.PhaseDocument;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "document_demande",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_document_demande",
                        columnNames = {"appel_lot_id", "code_document"}
                )
        }
)
public class DocumentDemande {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Document demandé pour un lot précis dans un appel
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appel_lot_id", nullable = false)
    private AppelLot appelLot;

    @Column(name = "code_document", length = 50)
    private String codeDocument;

    @Column(name = "nom_document", nullable = false)
    private String nomDocument;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "phase", nullable = false, columnDefinition = "phase_document")
    private PhaseDocument phase;

    @Column(name = "format_accepte")
    private String formatAccepte;

    private Boolean obligatoire;

    @Column(name = "applicable_a")
    private String applicableA;

    private Boolean actif;

    @Column(name = "ordre_affichage")
    private Integer ordreAffichage;
}