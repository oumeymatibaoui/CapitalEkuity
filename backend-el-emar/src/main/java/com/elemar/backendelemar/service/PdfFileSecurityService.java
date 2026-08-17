package com.elemar.backendelemar.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.UUID;

@Service
public class PdfFileSecurityService {

    private static final Logger log =
            LoggerFactory.getLogger(PdfFileSecurityService.class);

    public static final String PDF_CONTENT_TYPE = "application/pdf";
    public static final long MAX_PDF_SIZE_BYTES = 10L * 1024L * 1024L;

    private static final byte[] PDF_HEADER =
            "%PDF-".getBytes(StandardCharsets.US_ASCII);

    private static final byte[] PDF_EOF =
            "%%EOF".getBytes(StandardCharsets.US_ASCII);

    private static final int EOF_SEARCH_SIZE = 4096;

    private final Path uploadRoot;

    public PdfFileSecurityService(
            @Value("${app.uploads.dir:uploads}")
            String uploadDirectory
    ) {
        try {
            this.uploadRoot = Path.of(uploadDirectory)
                    .toAbsolutePath()
                    .normalize();

            Files.createDirectories(this.uploadRoot);

        } catch (IOException | InvalidPathException ex) {
            throw new IllegalStateException(
                    "Le dossier d'upload est invalide : " + uploadDirectory,
                    ex
            );
        }
    }

    public StoredPdf validateAndStoreCandidaturePdf(
            Long candidatureId,
            String documentType,
            MultipartFile file
    ) {
        validatePositiveId(
                candidatureId,
                "L'identifiant de la candidature est obligatoire."
        );

        String normalizedType = normalizeDocumentType(documentType);
        ValidatedPdf validatedPdf = validateUpload(file);

        Path targetDirectory = uploadRoot
                .resolve("candidatures")
                .resolve(String.valueOf(candidatureId))
                .resolve("phase1")
                .normalize();

        requireInsideUploadRoot(targetDirectory);

        try {
            Files.createDirectories(targetDirectory);

            String storedFileName =
                    normalizedType + "_" + UUID.randomUUID() + ".pdf";

            Path targetFile = targetDirectory
                    .resolve(storedFileName)
                    .normalize();

            requireInsideUploadRoot(targetFile);

            Files.write(
                    targetFile,
                    validatedPdf.content(),
                    StandardOpenOption.CREATE_NEW,
                    StandardOpenOption.WRITE
            );

            String relativePath = uploadRoot
                    .relativize(targetFile)
                    .toString();

            return new StoredPdf(
                    validatedPdf.originalFileName(),
                    relativePath,
                    validatedPdf.size(),
                    PDF_CONTENT_TYPE
            );

        } catch (IOException ex) {
            log.error(
                    "Erreur d'enregistrement PDF. candidatureId={}, type={}",
                    candidatureId,
                    normalizedType,
                    ex
            );

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Impossible d'enregistrer le fichier PDF."
            );
        }
    }

    public Path resolveAndValidateStoredPdf(String storedPath) {
        Path path = resolveStoredPath(storedPath, true);
        validateStoredPdf(path);
        return path;
    }

    public void deleteStoredFileQuietly(String storedPath) {
        if (storedPath == null || storedPath.isBlank()) {
            return;
        }

        try {
            Path path = resolveStoredPath(storedPath, false);

            if (path != null) {
                Files.deleteIfExists(path);
            }

        } catch (Exception ex) {
            log.warn(
                    "Impossible de supprimer l'ancien fichier PDF. path={}",
                    storedPath,
                    ex
            );
        }
    }

    public String sanitizeResponseFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "document.pdf";
        }

        String sanitized = extractBaseName(fileName)
                .replaceAll("[\\r\\n\"]", "_")
                .replaceAll("[^a-zA-Z0-9À-ÿ._() -]", "_")
                .trim();

        if (sanitized.isBlank()) {
            sanitized = "document.pdf";
        }

        if (!sanitized.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            sanitized += ".pdf";
        }

        return sanitized;
    }

    private ValidatedPdf validateUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le fichier PDF est obligatoire."
            );
        }

        if (file.getSize() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le fichier PDF est vide."
            );
        }

        if (file.getSize() > MAX_PDF_SIZE_BYTES) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Le fichier PDF ne doit pas dépasser 10 Mo."
            );
        }

        String originalName =
                sanitizeUploadedFileName(file.getOriginalFilename());

        if (!originalName.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Seuls les fichiers PDF sont acceptés."
            );
        }

        try {
            byte[] content = file.getBytes();
            validatePdfContent(content);

            return new ValidatedPdf(
                    content,
                    originalName,
                    content.length
            );

        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Impossible de lire le fichier envoyé."
            );
        }
    }

    private void validateStoredPdf(Path path) {
        if (path == null
                || !Files.exists(path)
                || !Files.isRegularFile(path)
                || !Files.isReadable(path)) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Fichier PDF introuvable sur le serveur."
            );
        }

        try {
            long size = Files.size(path);

            if (size <= 0) {
                throw new ResponseStatusException(
                        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "Le document enregistré est vide."
                );
            }

            if (size > MAX_PDF_SIZE_BYTES) {
                throw new ResponseStatusException(
                        HttpStatus.PAYLOAD_TOO_LARGE,
                        "Le document enregistré dépasse 10 Mo."
                );
            }

            validatePdfContent(Files.readAllBytes(path));

        } catch (ResponseStatusException ex) {
            throw ex;

        } catch (IOException ex) {
            log.error("Erreur de lecture PDF. path={}", path, ex);

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Impossible de lire le fichier PDF."
            );
        }
    }

    private void validatePdfContent(byte[] content) {
        if (content == null || content.length == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le fichier PDF est vide."
            );
        }

        if (content.length > MAX_PDF_SIZE_BYTES) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Le fichier PDF ne doit pas dépasser 10 Mo."
            );
        }

        if (!startsWith(content, PDF_HEADER)) {
            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Le fichier envoyé n'est pas un véritable document PDF."
            );
        }

        if (!containsAtEnd(content, PDF_EOF, EOF_SEARCH_SIZE)) {
            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Le fichier PDF est incomplet ou endommagé."
            );
        }
    }

    private Path resolveStoredPath(
            String storedPath,
            boolean required
    ) {
        if (storedPath == null || storedPath.isBlank()) {
            if (required) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Fichier PDF introuvable."
                );
            }

            return null;
        }

        final Path rawPath;

        try {
            rawPath = Path.of(storedPath.trim());

        } catch (InvalidPathException ex) {
            if (required) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Chemin du fichier PDF invalide."
                );
            }

            return null;
        }

        Path resolved = null;

        if (rawPath.isAbsolute()) {
            Path absoluteCandidate =
                    rawPath.toAbsolutePath().normalize();

            if (absoluteCandidate.startsWith(uploadRoot)
                    && Files.exists(absoluteCandidate)) {
                resolved = absoluteCandidate;
            }

        } else {
            Path directCandidate =
                    uploadRoot.resolve(rawPath).normalize();

            if (directCandidate.startsWith(uploadRoot)
                    && Files.exists(directCandidate)) {
                resolved = directCandidate;
            }

            if (resolved == null
                    && rawPath.getNameCount() > 1
                    && "uploads".equalsIgnoreCase(
                    rawPath.getName(0).toString()
            )) {
                Path withoutUploads =
                        rawPath.subpath(1, rawPath.getNameCount());

                Path oldCandidate =
                        uploadRoot.resolve(withoutUploads).normalize();

                if (oldCandidate.startsWith(uploadRoot)
                        && Files.exists(oldCandidate)) {
                    resolved = oldCandidate;
                }
            }

            if (resolved == null) {
                Path legacyCandidate = Path.of(
                                System.getProperty("user.dir")
                        )
                        .toAbsolutePath()
                        .normalize()
                        .resolve(rawPath)
                        .normalize();

                if (legacyCandidate.startsWith(uploadRoot)
                        && Files.exists(legacyCandidate)) {
                    resolved = legacyCandidate;
                }
            }
        }

        if (resolved == null
                || required && !Files.isRegularFile(resolved)) {
            if (required) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Fichier PDF introuvable sur le serveur."
                );
            }

            return null;
        }

        requireInsideUploadRoot(resolved);
        return resolved;
    }

    private String normalizeDocumentType(String documentType) {
        String value = documentType == null
                ? ""
                : documentType.trim().toUpperCase(Locale.ROOT);

        if (!"RNE".equals(value) && !"CNSS".equals(value)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Type de document PDF invalide."
            );
        }

        return value;
    }

    private String sanitizeUploadedFileName(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nom du fichier PDF est obligatoire."
            );
        }

        String sanitized = extractBaseName(originalName)
                .replaceAll("[\\r\\n\"]", "_")
                .replaceAll("[^a-zA-Z0-9À-ÿ._() -]", "_")
                .trim();

        if (sanitized.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nom du fichier PDF est invalide."
            );
        }

        return sanitized;
    }

    private String extractBaseName(String fileName) {
        String normalized = fileName.replace('\\', '/');
        int separator = normalized.lastIndexOf('/');

        if (separator >= 0 && separator < normalized.length() - 1) {
            return normalized.substring(separator + 1);
        }

        return normalized;
    }

    private boolean startsWith(
            byte[] content,
            byte[] expected
    ) {
        if (content.length < expected.length) {
            return false;
        }

        for (int index = 0; index < expected.length; index++) {
            if (content[index] != expected[index]) {
                return false;
            }
        }

        return true;
    }

    private boolean containsAtEnd(
            byte[] content,
            byte[] expected,
            int searchSize
    ) {
        int start = Math.max(0, content.length - searchSize);

        for (
                int index = content.length - expected.length;
                index >= start;
                index--
        ) {
            boolean match = true;

            for (
                    int expectedIndex = 0;
                    expectedIndex < expected.length;
                    expectedIndex++
            ) {
                if (content[index + expectedIndex]
                        != expected[expectedIndex]) {
                    match = false;
                    break;
                }
            }

            if (match) {
                return true;
            }
        }

        return false;
    }

    private void requireInsideUploadRoot(Path path) {
        if (path == null
                || !path.toAbsolutePath()
                .normalize()
                .startsWith(uploadRoot)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chemin de fichier non autorisé."
            );
        }
    }

    private void validatePositiveId(
            Long id,
            String message
    ) {
        if (id == null || id <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    message
            );
        }
    }

    private record ValidatedPdf(
            byte[] content,
            String originalFileName,
            long size
    ) {
    }

    public record StoredPdf(
            String originalFileName,
            String storedPath,
            long size,
            String contentType
    ) {
    }
}
