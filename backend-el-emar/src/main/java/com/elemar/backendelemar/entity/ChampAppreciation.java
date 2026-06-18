package com.elemar.backendelemar.entity;

import com.elemar.backendelemar.enums.ModeleReponse;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "champ_appreciation")
public class ChampAppreciation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id", nullable = false)
    private Lot lot;

    @Column(name = "section", nullable = false, length = 150)
    private String section;

    @Column(name = "nom_champ", nullable = false, length = 150)
    private String nomChamp;

    @Column(name = "label_champ", nullable = false, length = 255)
    private String labelChamp;

    @Column(name = "description_champ", nullable = false, columnDefinition = "TEXT")
    private String descriptionChamp;

    @Enumerated(EnumType.STRING)
    @Column(name = "modele_reponse", nullable = false, length = 50)
    private ModeleReponse modeleReponse;

    @Column(name = "type_champ", nullable = false, length = 50)
    private String typeChamp;

    @Column(name = "condition_procedure", nullable = false, columnDefinition = "TEXT")
    private String conditionProcedure;

    @Column(name = "code_pxx", nullable = false, length = 50)
    private String codePxx;

    @Column(name = "options", columnDefinition = "TEXT")
    private String options;

    @Column(name = "obligatoire", nullable = false)
    private Boolean obligatoire;

    @Column(name = "ordre_affichage", nullable = false)
    private Integer ordreAffichage;

    @Column(name = "actif", nullable = false)
    private Boolean actif;
}