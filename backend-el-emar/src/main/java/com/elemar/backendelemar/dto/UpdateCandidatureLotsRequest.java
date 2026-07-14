package com.elemar.backendelemar.dto;


import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class UpdateCandidatureLotsRequest {

    private List<Long> lotIds = new ArrayList<>();
}