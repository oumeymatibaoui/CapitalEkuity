package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expediteur_id")
    private Utilisateur expediteur;
    @Column(name = "traitee")
    private Boolean traitee = false;

    @Column(name = "date_traitement")
    private LocalDateTime dateTraitement;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destinataire_id")
    private Utilisateur destinataire;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidature_id")
    private Candidature candidature;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_candidature_id")
    private ApplicationCandidature applicationCandidature;

    @Column(name = "reponse_critere_id")
    private Long reponseCritereId;

    @Column(name = "critere_evaluation_id")
    private Long critereEvaluationId;

    @Column(name = "code_critere")
    private String codeCritere;

    @Column(name = "libelle_critere")
    private String libelleCritere;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "type_notification", length = 50, nullable = false)
    private String typeNotification;

    @Builder.Default
    @Column(name = "lu", nullable = false)
    private Boolean lu = false;

    @Builder.Default
    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (lu == null) {
            lu = false;
        }

        if (dateCreation == null) {
            dateCreation = LocalDateTime.now();
        }
    }
}