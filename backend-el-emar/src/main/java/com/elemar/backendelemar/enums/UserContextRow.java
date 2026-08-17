package com.elemar.backendelemar.enums;

import com.elemar.backendelemar.dto.DashboardResponse;

 record UserContextRow(
        DashboardResponse.DashboardContextResponse context,
        boolean actif
) {
}