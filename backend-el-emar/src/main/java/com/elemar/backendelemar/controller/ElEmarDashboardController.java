package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.DashboardResponse;
import com.elemar.backendelemar.service.CurrentUserService;
import com.elemar.backendelemar.service.ElEmarDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/el-emar/dashboard")
@RequiredArgsConstructor
@CrossOrigin(
        origins = "http://localhost:4200",
        allowedHeaders = "*"
)
@PreAuthorize("isAuthenticated()")
public class ElEmarDashboardController {

    private final ElEmarDashboardService elEmarDashboardService;
    private final CurrentUserService currentUserService;

    @GetMapping(
            value = "/test",
            produces = MediaType.TEXT_PLAIN_VALUE
    )
    public String test() {
        return "ElEmarDashboardController OK";
    }

    @GetMapping(
            value = {"", "/"},
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public DashboardResponse getDashboard(
            @RequestParam(name = "typeIntervenantId", required = false)
            Long typeIntervenantId,

            @RequestParam(name = "lotId", required = false)
            Long lotId,

            @RequestParam(name = "decision", required = false)
            String decision,

            @RequestParam(name = "search", required = false)
            String search
    ) {
        Long authenticatedUserId = currentUserService.getCurrentUserId();

        return elEmarDashboardService.getDashboard(
                authenticatedUserId,
                positiveIdOrNull(typeIntervenantId),
                positiveIdOrNull(lotId),
                textOrNull(decision),
                textOrNull(search)
        );
    }

    private Long positiveIdOrNull(Long value) {
        return value != null && value > 0 ? value : null;
    }

    private String textOrNull(String value) {
        return value == null || value.isBlank()
                ? null
                : value.trim();
    }
}
