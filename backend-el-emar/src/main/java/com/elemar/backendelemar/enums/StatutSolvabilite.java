package com.elemar.backendelemar.enums;

public enum StatutSolvabilite {

    /**
     * El Emar n’a pas encore effectué
     * le contrôle financier.
     */
    A_VERIFIER,

    /**
     * La situation financière est acceptable.
     */
    SOLVABLE,

    /**
     * La situation financière n’est pas acceptable.
     */
    NON_SOLVABLE
}