package com.elemar.backendelemar.config;

import com.elemar.backendelemar.service.CurrentUserService;
import com.elemar.backendelemar.service.WorkflowGovernanceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class AdminAchatReadOnlyInterceptor implements HandlerInterceptor {

    private final CurrentUserService currentUserService;
    private final WorkflowGovernanceService governanceService;

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler
    ) {
        String method = request.getMethod();

        // Consultation toujours autorisée.
        if (HttpMethod.GET.matches(method)
                || HttpMethod.HEAD.matches(method)
                || HttpMethod.OPTIONS.matches(method)) {
            return true;
        }

        Long utilisateurId;

        try {
            utilisateurId = currentUserService.getCurrentUserId();
        } catch (Exception exception) {
            // L'authentification / SecurityConfig gère les routes sans utilisateur connecté.
            return true;
        }

        if (!governanceService.estAdminAchatLectureSeule(utilisateurId)) {
            return true;
        }

        String uri = request.getRequestURI();

        // UNIQUE exception d'écriture pour ADMIN + ACHAT :
        // changer le responsable d'une étape d'un dossier.
        if (HttpMethod.PATCH.matches(method)
                && uri.matches(".*/api/el-emar/workflow/etapes/\\d+/reaffecter/?$")) {
            return true;
        }

        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Administrateur Achat : profil en consultation uniquement. "
                        + "Seule la réaffectation d'un responsable dans le workflow est autorisée."
        );
    }
}
