package com.elemar.backendelemar.controller;

import com.elemar.backendelemar.dto.CurrentRoleAccessResponse;
import com.elemar.backendelemar.service.CurrentRoleAccessService;
import com.elemar.backendelemar.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/el-emar/access")
@RequiredArgsConstructor
@CrossOrigin(
        origins = "http://localhost:4200",
        allowedHeaders = "*"
)
@PreAuthorize("isAuthenticated()")
public class CurrentRoleAccessController {

    private final CurrentRoleAccessService currentRoleAccessService;
    private final CurrentUserService currentUserService;

    @GetMapping("/me")
    public CurrentRoleAccessResponse getMyAccess() {
        return currentRoleAccessService.getCurrentAccess(
                currentUserService.getCurrentUserId()
        );
    }
}
