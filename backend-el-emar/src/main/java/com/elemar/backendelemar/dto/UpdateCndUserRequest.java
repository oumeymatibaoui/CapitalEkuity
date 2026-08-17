package com.elemar.backendelemar.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateCndUserRequest {

    private String nomComplet;
    private String email;
    private String telephone;
    private String fonction;
}