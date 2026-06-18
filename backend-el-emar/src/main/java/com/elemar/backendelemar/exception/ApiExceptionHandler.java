package com.elemar.backendelemar.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();

        ex.getBindingResult().getFieldErrors().forEach(error -> {
            errors.put(error.getField(), error.getDefaultMessage());
        });

        Map<String, Object> response = new HashMap<>();
        response.put("status", 400);
        response.put("message", "Erreur de saisie");
        response.put("errors", errors);

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", ex.getStatusCode().value());
        response.put("message", ex.getReason());

        return ResponseEntity.status(ex.getStatusCode()).body(response);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String rawMessage = ex.getMostSpecificCause() != null
                ? ex.getMostSpecificCause().getMessage()
                : ex.getMessage();

        String message = "Cette donnée existe déjà";

        if (rawMessage != null) {
            String lower = rawMessage.toLowerCase();

            if (lower.contains("uk_zone_location") || lower.contains("latitude") || lower.contains("longitude")) {
                message = "Cette localisation existe déjà";

            } else if (lower.contains("uk_lot_code") || lower.contains("code_lot")) {
                message = "Ce code de lot existe déjà";

            } else if (lower.contains("uk_lot_nom") || lower.contains("nom_lot")) {
                message = "Ce nom de lot existe déjà";

            } else if (lower.contains("uk_appel_titre") || lower.contains("titre")) {
                message = "Ce titre d'appel existe déjà";
            }
          else if (lower.contains("uk_champ_lot_code_pxx") || lower.contains("code_pxx")) {
                    message = "Ce code Pxx existe déjà pour ce lot";

                } else if (lower.contains("uk_champ_lot_nom_champ") || lower.contains("nom_champ")) {
                    message = "Ce champ existe déjà pour ce lot";
                }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", 409);
        response.put("message", message);

        return ResponseEntity.status(409).body(response);
    }
}