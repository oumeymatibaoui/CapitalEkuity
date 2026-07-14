package com.elemar.backendelemar.controller;


import com.elemar.backendelemar.dto.DashboardResponse;
import com.elemar.backendelemar.service.ElEmarDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/el-emar/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ElEmarDashboardController {

    private final ElEmarDashboardService elEmarDashboardService;

    @GetMapping("/test")
    public String test() {
        return "ElEmarDashboardController OK";
    }

    @GetMapping
    public DashboardResponse getDashboard(
            @RequestParam(required = false) Long typeIntervenantId,
            @RequestParam(required = false) Long lotId,
            @RequestParam(required = false) String decision,
            @RequestParam(required = false) String search
    ) {
        return elEmarDashboardService.getDashboard(
                typeIntervenantId,
                lotId,
                decision,
                search
        );
    }
}