package com.elemar.backendelemar.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormulaireLotSaveRequest {
    private List<ReponseCritereSaveRequest> reponses;
}