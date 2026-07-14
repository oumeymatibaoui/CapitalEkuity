package com.elemar.backendelemar.dto;


import java.math.BigDecimal;

public class SaveEvaluationResponse {

    private Long reponseCritereId;
    private Long applicationCandidatureId;
    private String statutEvaluation;
    private Boolean conforme;
    private BigDecimal noteObtenue;
    private BigDecimal noteLot;
    private BigDecimal noteGlobale;
    private String commentaireEvaluateur;

    public Long getReponseCritereId() {
        return reponseCritereId;
    }

    public void setReponseCritereId(Long reponseCritereId) {
        this.reponseCritereId = reponseCritereId;
    }

    public Long getApplicationCandidatureId() {
        return applicationCandidatureId;
    }

    public void setApplicationCandidatureId(Long applicationCandidatureId) {
        this.applicationCandidatureId = applicationCandidatureId;
    }

    public String getStatutEvaluation() {
        return statutEvaluation;
    }

    public void setStatutEvaluation(String statutEvaluation) {
        this.statutEvaluation = statutEvaluation;
    }

    public Boolean getConforme() {
        return conforme;
    }

    public void setConforme(Boolean conforme) {
        this.conforme = conforme;
    }

    public BigDecimal getNoteObtenue() {
        return noteObtenue;
    }

    public void setNoteObtenue(BigDecimal noteObtenue) {
        this.noteObtenue = noteObtenue;
    }

    public BigDecimal getNoteLot() {
        return noteLot;
    }

    public void setNoteLot(BigDecimal noteLot) {
        this.noteLot = noteLot;
    }

    public BigDecimal getNoteGlobale() {
        return noteGlobale;
    }

    public void setNoteGlobale(BigDecimal noteGlobale) {
        this.noteGlobale = noteGlobale;
    }

    public String getCommentaireEvaluateur() {
        return commentaireEvaluateur;
    }

    public void setCommentaireEvaluateur(String commentaireEvaluateur) {
        this.commentaireEvaluateur = commentaireEvaluateur;
    }
}