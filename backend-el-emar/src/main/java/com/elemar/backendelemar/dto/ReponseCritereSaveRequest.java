package com.elemar.backendelemar.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReponseCritereSaveRequest {
    private Long critereId;
    private String valeur;
}