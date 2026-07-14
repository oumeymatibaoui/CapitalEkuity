package com.elemar.backendelemar.exception;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(
            ResponseStatusException ex
    ) {
        Map<String, Object> body = new HashMap<>();

        body.put("timestamp", LocalDateTime.now());
        body.put("status", ex.getStatusCode().value());
        body.put("message", ex.getReason());

        return ResponseEntity
                .status(ex.getStatusCode())
                .body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(
            DataIntegrityViolationException ex
    ) {
        String constraintName = extractConstraintName(ex);
        String detail = ex.getMostSpecificCause() != null
                ? ex.getMostSpecificCause().getMessage()
                : ex.getMessage();

        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", 409);
        body.put("constraint", constraintName);
        body.put("detail", detail);
        body.put("message", buildReadableMessage(constraintName, detail));

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleException(
            Exception ex
    ) {
        Map<String, Object> body = new HashMap<>();

        body.put("timestamp", LocalDateTime.now());
        body.put("status", 500);
        body.put("message", ex.getMessage());

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(body);
    }

    private String extractConstraintName(Throwable ex) {
        Throwable cause = ex;

        while (cause != null) {
            if (cause instanceof ConstraintViolationException constraintException) {
                return constraintException.getConstraintName();
            }

            cause = cause.getCause();
        }

        return null;
    }

    private String buildReadableMessage(String constraintName, String detail) {
        String text = ((constraintName == null ? "" : constraintName) + " " + (detail == null ? "" : detail))
                .toLowerCase();

        if (text.contains("utilisateur") && text.contains("email")) {
            return "Email utilisateur déjà utilisé.";
        }

        if (text.contains("candidature_lot") || text.contains("uq_candidature_lot")) {
            return "Ce lot est déjà affecté à cette candidature.";
        }

        if (text.contains("candidature_pkey")) {
            return "Problème de séquence ID sur la table candidature. Exécute le reset de séquence.";
        }

        if (text.contains("utilisateur_pkey")) {
            return "Problème de séquence ID sur la table utilisateur. Exécute le reset de séquence.";
        }

        if (text.contains("candidature_lot_pkey")) {
            return "Problème de séquence ID sur la table candidature_lot. Exécute le reset de séquence.";
        }

        return "Conflit base de données : une donnée existe déjà ou une contrainte bloque l’opération.";
    }
}