package com.elemar.backendelemar.dto;

import java.util.List;

public record UpdateRoleCategoriesRequest(
        List<Long> categorieIds
) {
}