package com.elemar.backendelemar.dto;

import lombok.Data;

@Data
public class CandidatLoginRequest {

    private String email;

    private String motDePasse;
}