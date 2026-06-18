package com.elemar.backendelemar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "lot")
public class Lot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code_lot", nullable = false, unique = true, length = 50)
    private String codeLot;

    @Column(name = "nom_lot", nullable = false, length = 150)
    private String nomLot;

    @Column(columnDefinition = "text")
    private String description;

    private Boolean actif;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}