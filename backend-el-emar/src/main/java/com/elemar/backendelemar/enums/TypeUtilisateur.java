package com.elemar.backendelemar.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;
import java.util.Locale;

public enum TypeUtilisateur {

    IT("Informatique"),
    ACHAT("Achat"),
    COMITE("Comité"),
    TECHNIQUE("Technique"),

    /*
     * Intervenant externe.
     * Il ne doit pas être créé depuis la gestion
     * des utilisateurs internes.
     */
    CND("Intervenant");

    private final String libelle;

    TypeUtilisateur(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }

    public boolean isUtilisateurInterne() {
        return this != CND;
    }

    @JsonValue
    public String getCode() {
        return name();
    }

    @JsonCreator
    public static TypeUtilisateur fromValue(String value) {

        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                    "Le type utilisateur est obligatoire."
            );
        }

        String normalizedValue = value
                .trim()
                .toUpperCase(Locale.ROOT);

        return Arrays.stream(values())
                .filter(type -> type.name().equals(normalizedValue))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Type utilisateur invalide : "
                                + value
                                + ". Valeurs autorisées : "
                                + "IT, ACHAT, COMITE, TECHNIQUE, CND."
                ));
    }
}