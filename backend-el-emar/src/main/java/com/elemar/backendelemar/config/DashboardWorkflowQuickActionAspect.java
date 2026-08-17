package com.elemar.backendelemar.config;

import com.elemar.backendelemar.dto.DashboardResponse;
import com.elemar.backendelemar.dto.DashboardResponse.DashboardQuickActionResponse;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Aspect
@Component
public class DashboardWorkflowQuickActionAspect {

    private static final String MODULE_CODE =
            "WORKFLOW_CONFIGURATION";

    /**
     * Ajoute l'accès Workflow au dashboard administrateur sans remplacer
     * le gros ElEmarDashboardService. Cela reste compatible avec le système
     * existant de quickActions affiché par tableau-de-bord.html.
     */
    @Around(
            "execution(* com.elemar.backendelemar.service.ElEmarDashboardService.getDashboard(..))"
    )
    public Object ajouterConfigurationWorkflow(
            ProceedingJoinPoint joinPoint
    ) throws Throwable {
        Object rawResponse = joinPoint.proceed();

        if (!(rawResponse instanceof DashboardResponse response)) {
            return rawResponse;
        }

        if (
                response.getContext() == null
                        || !response.getContext().isAdmin()
        ) {
            return response;
        }

        List<DashboardQuickActionResponse> actions =
                response.getQuickActions() == null
                        ? new ArrayList<>()
                        : new ArrayList<>(response.getQuickActions());

        boolean alreadyPresent = actions.stream()
                .anyMatch(action ->
                        action != null
                                && MODULE_CODE.equalsIgnoreCase(
                                String.valueOf(action.getCode())
                        )
                );

        if (!alreadyPresent) {
            actions.add(
                    DashboardQuickActionResponse.builder()
                            .code(MODULE_CODE)
                            .label("Configuration du workflow")
                            .description(
                                    "Définir l’ordre des étapes et les utilisateurs responsables."
                            )
                            .icon("ti ti-route")
                            .route(
                                    "/el-emar/workflow-configuration"
                            )
                            .moduleCode(MODULE_CODE)
                            .build()
            );
        }

        response.setQuickActions(actions);
        return response;
    }
}
