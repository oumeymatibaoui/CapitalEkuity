package com.elemar.backendelemar.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class PasswordGeneratorService {

    private static final String CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!";

    private final SecureRandom random = new SecureRandom();

    public String generateTemporaryPassword() {
        int length = 12;
        StringBuilder password = new StringBuilder();

        for (int i = 0; i < length; i++) {
            password.append(CHARS.charAt(random.nextInt(CHARS.length())));
        }

        return password.toString();
    }
}