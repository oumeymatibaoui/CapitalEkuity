package com.elemar.backendelemar.service;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Codes métier stables du workflow El Emar.
 *
 * IMPORTANT :
 * - l'ordre du workflow n'est plus codé en dur ici ;
 * - l'ADMIN peut réordonner les étapes dans workflow_modele_etape ;
 * - les 4 codes métier restent obligatoires car les services d'évaluation
 *   utilisent ces codes pour ouvrir la bonne section métier ;
 * - des étapes libres peuvent être ajoutées entre les étapes métier.
 */
public final class WorkflowStepCodes {

    public static final String RECEVABILITE_ADMINISTRATIVE =
            "RECEVABILITE_ADMINISTRATIVE";

    public static final String EVALUATION_TECHNIQUE =
            "EVALUATION_TECHNIQUE";

    public static final String DECISION_FINALE =
            "DECISION_FINALE";

    public static final String CLASSEMENT_ZONE =
            "CLASSEMENT_ZONE";

    /**
     * Conservé pour compatibilité avec du code existant.
     * NE PAS utiliser cette liste comme ordre réel du workflow.
     */
    public static final List<String> ORDRE_OFFICIEL = List.of(
            RECEVABILITE_ADMINISTRATIVE,
            EVALUATION_TECHNIQUE,
            DECISION_FINALE,
            CLASSEMENT_ZONE
    );

    public static final Set<String> ETAPES_METIER_OBLIGATOIRES = Set.of(
            RECEVABILITE_ADMINISTRATIVE,
            EVALUATION_TECHNIQUE,
            DECISION_FINALE,
            CLASSEMENT_ZONE
    );

    private static final Map<String, String> DEPARTEMENTS_METIER = Map.of(
            RECEVABILITE_ADMINISTRATIVE, "ACHAT",
            EVALUATION_TECHNIQUE, "TECHNIQUE",
            DECISION_FINALE, "COMITE",
            CLASSEMENT_ZONE, "ACHAT"
    );

    private static final Map<String, String> LIBELLES = Map.of(
            RECEVABILITE_ADMINISTRATIVE, "Recevabilité administrative",
            EVALUATION_TECHNIQUE, "Évaluation technique",
            DECISION_FINALE, "Décision finale",
            CLASSEMENT_ZONE, "Classement par zone"
    );

    private WorkflowStepCodes() {
    }

    public static String normalize(String value) {
        return value == null
                ? ""
                : value.trim().toUpperCase(Locale.ROOT);
    }

    public static boolean isOfficial(String code) {
        return ETAPES_METIER_OBLIGATOIRES.contains(normalize(code));
    }

    public static boolean isMetier(String code) {
        return isOfficial(code);
    }

    /**
     * Ordre historique uniquement pour compatibilité.
     * Le modèle dynamique utilise workflow_modele_etape.ordre.
     */
    public static int ordre(String code) {
        int index = ORDRE_OFFICIEL.indexOf(normalize(code));
        return index < 0 ? -1 : index + 1;
    }

    /**
     * Département métier attendu des 4 étapes métier.
     * Retourne null pour une étape libre.
     */
    public static String departement(String code) {
        return DEPARTEMENTS_METIER.get(normalize(code));
    }

    public static String libelleParDefaut(String code) {
        return LIBELLES.get(normalize(code));
    }
}
