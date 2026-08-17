package com.elemar.backendelemar.enums;

public enum StatutWorkflowEtape {

    EN_ATTENTE,
    A_TRAITER,
    EN_COURS,
    TERMINEE,
    REOUVERTE,
    ANNULEE;

    public boolean estModifiable() {
        return this == A_TRAITER
                || this == EN_COURS
                || this == REOUVERTE;
    }

    public boolean estActive() {
        return this == A_TRAITER
                || this == EN_COURS
                || this == REOUVERTE;
    }

    public boolean estVerrouillee() {
        return !estModifiable();
    }

    public boolean estTerminee() {
        return this == TERMINEE;
    }
}