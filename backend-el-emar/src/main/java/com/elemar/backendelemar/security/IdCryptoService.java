package com.elemar.backendelemar.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

import java.security.GeneralSecurityException;
import java.security.SecureRandom;

import java.util.Base64;

@Service
public class IdCryptoService {

    private static final String VERSION = "v1";

    /*
     * AES-GCM recommande un IV de 12 octets.
     */
    private static final int IV_LENGTH = 12;

    /*
     * Tag d'authentification 128 bits.
     */
    private static final int TAG_LENGTH_BITS = 128;

    private final SecretKeySpec key;

    private final SecureRandom secureRandom =
            new SecureRandom();

    public IdCryptoService(
            @Value("${app.id-crypto.key}")
            String base64Key
    ) {

        if (
                base64Key == null
                        || base64Key.isBlank()
        ) {
            throw new IllegalStateException(
                    "app.id-crypto.key est obligatoire."
            );
        }

        final byte[] rawKey;

        try {

            rawKey =
                    Base64
                            .getDecoder()
                            .decode(
                                    base64Key.trim()
                            );

        } catch (
                IllegalArgumentException exception
        ) {

            throw new IllegalStateException(
                    "app.id-crypto.key doit être une clé Base64 valide.",
                    exception
            );
        }

        /*
         * 32 octets = AES-256.
         */
        if (rawKey.length != 32) {

            throw new IllegalStateException(
                    "app.id-crypto.key doit contenir exactement "
                            + "32 octets après décodage."
            );
        }

        this.key =
                new SecretKeySpec(
                        rawKey,
                        "AES"
                );
    }

    // =====================================================
    // CHIFFRER
    // =====================================================

    public String encryptId(
            Long id,
            IdResource resource
    ) {

        if (
                id == null
                        || id <= 0
        ) {
            throw new IllegalArgumentException(
                    "Identifiant interne invalide."
            );
        }

        if (resource == null) {

            throw new IllegalArgumentException(
                    "Type de ressource obligatoire."
            );
        }

        try {

            /*
             * Nouveau IV aléatoire à chaque chiffrement.
             */
            byte[] iv =
                    new byte[IV_LENGTH];

            secureRandom.nextBytes(iv);

            Cipher cipher =
                    Cipher.getInstance(
                            "AES/GCM/NoPadding"
                    );

            cipher.init(
                    Cipher.ENCRYPT_MODE,
                    key,
                    new GCMParameterSpec(
                            TAG_LENGTH_BITS,
                            iv
                    )
            );

            /*
             * Le type de ressource est authentifié
             * par AES-GCM.
             *
             * Ainsi un token CANDIDATURE ne peut pas
             * être utilisé comme WORKFLOW_ETAPE.
             */
            cipher.updateAAD(
                    buildAad(resource)
            );

            /*
             * On chiffre directement le Long
             * sous forme de 8 octets.
             */
            byte[] plainId =
                    ByteBuffer
                            .allocate(Long.BYTES)
                            .putLong(id)
                            .array();

            byte[] encrypted =
                    cipher.doFinal(
                            plainId
                    );

            /*
             * Token interne =
             *
             * IV
             * +
             * ciphertext
             * +
             * authentication tag
             */
            ByteBuffer tokenBuffer =
                    ByteBuffer.allocate(
                            iv.length
                                    + encrypted.length
                    );

            tokenBuffer.put(iv);
            tokenBuffer.put(encrypted);

            /*
             * Base64 URL SAFE :
             *
             * pas de /
             * pas de +
             * pas de =
             */
            String payload =
                    Base64
                            .getUrlEncoder()
                            .withoutPadding()
                            .encodeToString(
                                    tokenBuffer.array()
                            );

            return VERSION
                    + "."
                    + resource.name()
                    + "."
                    + payload;

        } catch (
                GeneralSecurityException exception
        ) {

            throw new IllegalStateException(
                    "Impossible de générer la référence sécurisée.",
                    exception
            );
        }
    }

    // =====================================================
    // DÉCHIFFRER
    // =====================================================

    public Long decryptId(
            String token,
            IdResource expectedResource
    ) {

        if (
                token == null
                        || token.isBlank()
                        || expectedResource == null
        ) {
            throw invalidReference();
        }

        /*
         * Format attendu :
         *
         * v1.CANDIDATURE.xxxxxx
         */
        String[] parts =
                token
                        .trim()
                        .split(
                                "\\.",
                                3
                        );

        if (
                parts.length != 3
                        || !VERSION.equals(
                        parts[0]
                )
                        || !expectedResource
                        .name()
                        .equals(
                                parts[1]
                        )
        ) {
            throw invalidReference();
        }

        try {

            byte[] combined =
                    Base64
                            .getUrlDecoder()
                            .decode(
                                    parts[2]
                            );

            /*
             * Il faut au minimum :
             *
             * 12 octets IV
             * +
             * données chiffrées
             */
            if (
                    combined.length
                            <= IV_LENGTH
            ) {
                throw invalidReference();
            }

            byte[] iv =
                    new byte[IV_LENGTH];

            byte[] encrypted =
                    new byte[
                            combined.length
                                    - IV_LENGTH
                            ];

            System.arraycopy(
                    combined,
                    0,
                    iv,
                    0,
                    IV_LENGTH
            );

            System.arraycopy(
                    combined,
                    IV_LENGTH,
                    encrypted,
                    0,
                    encrypted.length
            );

            Cipher cipher =
                    Cipher.getInstance(
                            "AES/GCM/NoPadding"
                    );

            cipher.init(
                    Cipher.DECRYPT_MODE,
                    key,
                    new GCMParameterSpec(
                            TAG_LENGTH_BITS,
                            iv
                    )
            );

            /*
             * Même AAD que lors du chiffrement.
             */
            cipher.updateAAD(
                    buildAad(
                            expectedResource
                    )
            );

            byte[] plain =
                    cipher.doFinal(
                            encrypted
                    );

            /*
             * Un Long = exactement 8 octets.
             */
            if (
                    plain.length
                            != Long.BYTES
            ) {
                throw invalidReference();
            }

            long id =
                    ByteBuffer
                            .wrap(plain)
                            .getLong();

            if (id <= 0) {
                throw invalidReference();
            }

            return id;

        } catch (
                ResponseStatusException exception
        ) {

            throw exception;

        } catch (
                Exception exception
        ) {

            /*
             * Token modifié,
             * mauvaise clé,
             * mauvais tag AES-GCM,
             * mauvais Base64,
             * etc.
             *
             * On ne révèle aucune information.
             */
            throw invalidReference();
        }
    }

    // =====================================================
    // HELPERS
    // =====================================================

    private byte[] buildAad(
            IdResource resource
    ) {

        String value =
                VERSION
                        + "|"
                        + resource.name();

        return value.getBytes(
                StandardCharsets.UTF_8
        );
    }

    private ResponseStatusException
    invalidReference() {

        /*
         * 404 plutôt que :
         *
         * "cet identifiant existe mais le token est mauvais".
         */
        return new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Ressource introuvable."
        );
    }
}