package com.elemar.backendelemar.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "appel_lot")
public class AppelLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appel_id", nullable = false)
    private AppelCandidature appel;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id", nullable = false)
    private Lot lot;

    @Column(name = "titre_lot")
    private String titreLot;

    @Column(name = "description_lot", columnDefinition = "text")
    private String descriptionLot;

    @Column(name = "actif")
    private Boolean actif;
}