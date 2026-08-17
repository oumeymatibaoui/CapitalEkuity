package com.elemar.backendelemar.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowEtapeResponse {
    private Long id;
    private Long candidatureId;
    private String raisonSociale;
    private String codeEtape;
    private String libelleEtape;
    private Integer ordre;
    private String departementCode;
    private String statut;
    private Boolean active;
    private Boolean modifiable;
    private Boolean verrouillee;
    private Long utilisateurAffecteId;
    private String utilisateurAffecteNom;
    private String utilisateurAffecteEmail;
    private String commentaireTransmission;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private LocalDateTime dateReouverture;
    private String motifReouverture;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
