package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReponseCritereSavedResponse {

    private Long critereId;

    private String valeur;
}