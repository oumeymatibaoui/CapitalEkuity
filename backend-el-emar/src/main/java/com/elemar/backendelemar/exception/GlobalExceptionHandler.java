package com.elemar.backendelemar.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.hibernate.exception.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log =
            LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /*
     * Erreurs métier volontairement déclenchées dans les services.
     *
     * Exemples:
     * - utilisateur introuvable;
     * - accès interdit;
     * - donnée incorrecte;
     * - ressource inexistante.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(
            ResponseStatusException ex,
            HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());

        String message = ex.getReason();

        if (message == null || message.isBlank()) {
            message = status != null
                    ? status.getReasonPhrase()
                    : "La requête ne peut pas être traitée.";
        }

        Map<String, Object> body = createBaseResponse(
                ex.getStatusCode().value(),
                message,
                request
        );

        return ResponseEntity
                .status(ex.getStatusCode())
                .body(body);
    }

    /*
     * Erreurs produites par les annotations de validation:
     *
     * @NotBlank
     * @NotNull
     * @Email
     * @Size
     * etc.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        Map<String, String> errors = new LinkedHashMap<>();

        ex.getBindingResult()
                .getFieldErrors()
                .forEach(error -> errors.put(
                        error.getField(),
                        error.getDefaultMessage() != null
                                ? error.getDefaultMessage()
                                : "Valeur invalide"
                ));

        Map<String, Object> body = createBaseResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Erreur de saisie.",
                request
        );

        body.put("errors", errors);

        return ResponseEntity
                .badRequest()
                .body(body);
    }

    /*
     * Conflits avec les contraintes PostgreSQL:
     *
     * - clé unique;
     * - clé étrangère;
     * - valeur obligatoire;
     * - duplication.
     *
     * Les détails SQL sont écrits dans les logs du serveur,
     * mais ne sont jamais envoyés au navigateur.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(
            DataIntegrityViolationException ex,
            HttpServletRequest request
    ) {
        String errorId = generateErrorId();
        String constraintName = extractConstraintName(ex);
        String technicalDetail = extractTechnicalDetail(ex);

        log.error(
                "Erreur d'intégrité des données. errorId={}, méthode={}, uri={}, contrainte={}, détail={}",
                errorId,
                request.getMethod(),
                request.getRequestURI(),
                constraintName,
                technicalDetail,
                ex
        );

        String readableMessage =
                buildReadableConstraintMessage(constraintName, technicalDetail);

        Map<String, Object> body = createBaseResponse(
                HttpStatus.CONFLICT.value(),
                readableMessage,
                request
        );

        body.put("errorId", errorId);

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(body);
    }

    /*
     * Dernière protection pour les erreurs techniques non prévues.
     *
     * Important:
     * ex.getMessage() n'est jamais retourné au client.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpectedException(
            Exception ex,
            HttpServletRequest request
    ) {
        String errorId = generateErrorId();

        log.error(
                "Erreur interne non gérée. errorId={}, méthode={}, uri={}",
                errorId,
                request.getMethod(),
                request.getRequestURI(),
                ex
        );

        Map<String, Object> body = createBaseResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Une erreur interne est survenue. Réessayez ou contactez l’administrateur.",
                request
        );

        body.put("errorId", errorId);

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(body);
    }

    private Map<String, Object> createBaseResponse(
            int status,
            String message,
            HttpServletRequest request
    ) {
        Map<String, Object> body = new LinkedHashMap<>();

        body.put("timestamp", LocalDateTime.now());
        body.put("status", status);
        body.put("message", message);
        body.put("path", request.getRequestURI());

        return body;
    }

    private String generateErrorId() {
        return UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 12);
    }

    private String extractConstraintName(Throwable throwable) {
        Throwable current = throwable;

        while (current != null) {
            if (current instanceof ConstraintViolationException constraintException) {
                return constraintException.getConstraintName();
            }

            current = current.getCause();
        }

        return null;
    }

    private String extractTechnicalDetail(
            DataIntegrityViolationException exception
    ) {
        if (exception.getMostSpecificCause() != null) {
            return exception.getMostSpecificCause().getMessage();
        }

        return exception.getMessage();
    }

    private String buildReadableConstraintMessage(
            String constraintName,
            String technicalDetail
    ) {
        String normalizedText = (
                safeText(constraintName)
                        + " "
                        + safeText(technicalDetail)
        ).toLowerCase();

        /*
         * Utilisateur
         */
        if (normalizedText.contains("utilisateur")
                && normalizedText.contains("email")) {
            return "Cette adresse e-mail est déjà utilisée.";
        }

        if (normalizedText.contains("utilisateur_pkey")) {
            return "Impossible de créer l’utilisateur en raison d’un conflit d’identifiant.";
        }

        /*
         * Candidature
         */
        if (normalizedText.contains("uq_candidature_lot")
                || normalizedText.contains("candidature_lot")
                && normalizedText.contains("unique")) {
            return "Ce lot est déjà affecté à cette candidature.";
        }

        if (normalizedText.contains("candidature_pkey")) {
            return "Impossible de créer la candidature en raison d’un conflit d’identifiant.";
        }

        if (normalizedText.contains("candidature_lot_pkey")) {
            return "Impossible d’enregistrer le lot de candidature en raison d’un conflit d’identifiant.";
        }

        /*
         * Zone géographique
         */
        if (normalizedText.contains("uk_zone_location")
                || normalizedText.contains("latitude")
                && normalizedText.contains("longitude")) {
            return "Cette localisation existe déjà.";
        }

        /*
         * Lots
         */
        if (normalizedText.contains("uk_lot_code")
                || normalizedText.contains("code_lot")) {
            return "Ce code de lot existe déjà.";
        }

        if (normalizedText.contains("uk_lot_nom")
                || normalizedText.contains("nom_lot")) {
            return "Ce nom de lot existe déjà.";
        }

        /*
         * Appels
         */
        if (normalizedText.contains("uk_appel_titre")) {
            return "Ce titre d’appel existe déjà.";
        }

        /*
         * Champs et critères
         */
        if (normalizedText.contains("uk_champ_lot_code_pxx")
                || normalizedText.contains("code_pxx")) {
            return "Ce code Pxx existe déjà pour ce lot.";
        }

        if (normalizedText.contains("uk_champ_lot_nom_champ")
                || normalizedText.contains("nom_champ")) {
            return "Ce champ existe déjà pour ce lot.";
        }

        /*
         * Clé étrangère
         */
        if (normalizedText.contains("foreign key")
                || normalizedText.contains("violates foreign key constraint")) {
            return "Cette opération est impossible car la donnée est utilisée par un autre élément.";
        }

        /*
         * Valeur obligatoire
         */
        if (normalizedText.contains("not-null")
                || normalizedText.contains("null value")) {
            return "Une information obligatoire est manquante.";
        }

        return "Une donnée identique existe déjà ou une contrainte empêche cette opération.";
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }
}