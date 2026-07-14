package com.elemar.backendelemar.dto;
public class SaveEvaluationRequest {

    private String statut;
    private String commentaireEvaluateur;
    private Long evaluateurId;

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public String getCommentaireEvaluateur() {
        return commentaireEvaluateur;
    }

    public void setCommentaireEvaluateur(String commentaireEvaluateur) {
        this.commentaireEvaluateur = commentaireEvaluateur;
    }

    public Long getEvaluateurId() {
        return evaluateurId;
    }

    public void setEvaluateurId(Long evaluateurId) {
        this.evaluateurId = evaluateurId;
    }
}