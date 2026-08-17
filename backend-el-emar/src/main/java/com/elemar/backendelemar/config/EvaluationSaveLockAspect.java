package com.elemar.backendelemar.config;

import com.elemar.backendelemar.service.EvaluationElementLockService;
import com.elemar.backendelemar.service.EvaluationElementLockService.LockContext;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Aspect
@Component
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
public class EvaluationSaveLockAspect {

    private final EvaluationElementLockService lockService;
    private final PlatformTransactionManager transactionManager;

    @Around(
            value = "execution(* com.elemar.backendelemar.service.ElEmarEvaluationService.saveDocumentsStatut(..)) && args(candidatureId, request)",
            argNames = "joinPoint,candidatureId,request"
    )
    public Object protegerDocuments(
            ProceedingJoinPoint joinPoint,
            Long candidatureId,
            Object request
    ) throws Throwable {
        return executerDansTransaction(() -> {
            LockContext context = lockService.preparerDocuments(candidatureId);
            Object response = joinPoint.proceed();
            lockService.verrouiller(context);
            return response;
        });
    }

    @Around(
            value = "execution(* com.elemar.backendelemar.service.ElEmarEvaluationService.saveSolvabilite(..)) && args(candidatureId, request)",
            argNames = "joinPoint,candidatureId,request"
    )
    public Object protegerSolvabilite(
            ProceedingJoinPoint joinPoint,
            Long candidatureId,
            Object request
    ) throws Throwable {
        return executerDansTransaction(() -> {
            LockContext context = lockService.preparerSolvabilite(candidatureId);
            Object response = joinPoint.proceed();
            lockService.verrouiller(context);
            return response;
        });
    }

    @Around(
            value = "execution(* com.elemar.backendelemar.service.ElEmarEvaluationService.saveCritereEvaluation(..)) && args(applicationCandidatureId, reponseCritereId, request)",
            argNames = "joinPoint,applicationCandidatureId,reponseCritereId,request"
    )
    public Object protegerCritere(
            ProceedingJoinPoint joinPoint,
            Long applicationCandidatureId,
            Long reponseCritereId,
            Object request
    ) throws Throwable {
        return executerDansTransaction(() -> {
            LockContext context = lockService.preparerCritere(
                    applicationCandidatureId,
                    reponseCritereId
            );

            Object response = joinPoint.proceed();
            lockService.verrouiller(context);
            return response;
        });
    }

    @Around(
            value = "execution(* com.elemar.backendelemar.service.ElEmarEvaluationService.saveDecisionFinaleParLot(..)) && args(applicationCandidatureId, request)",
            argNames = "joinPoint,applicationCandidatureId,request"
    )
    public Object protegerDecision(
            ProceedingJoinPoint joinPoint,
            Long applicationCandidatureId,
            Object request
    ) throws Throwable {
        return executerDansTransaction(() -> {
            LockContext context = lockService.preparerDecision(
                    applicationCandidatureId
            );

            Object response = joinPoint.proceed();
            lockService.verrouiller(context);
            return response;
        });
    }

    /**
     * Le contrôle, la sauvegarde métier et la création du verrou doivent
     * appartenir à la même transaction. TransactionTemplate garantit ce
     * comportement même si les méthodes interceptées possèdent déjà
     * @Transactional : elles rejoignent cette transaction existante.
     */
    private Object executerDansTransaction(
            ThrowingOperation operation
    ) throws Throwable {
        TransactionTemplate template =
                new TransactionTemplate(transactionManager);

        try {
            return template.execute(status -> {
                try {
                    return operation.execute();
                } catch (Throwable throwable) {
                    status.setRollbackOnly();
                    throw new WrappedThrowableException(throwable);
                }
            });
        } catch (WrappedThrowableException exception) {
            throw exception.getOriginal();
        }
    }

    @FunctionalInterface
    private interface ThrowingOperation {
        Object execute() throws Throwable;
    }

    private static final class WrappedThrowableException
            extends RuntimeException {

        private final Throwable original;

        private WrappedThrowableException(Throwable original) {
            super(original);
            this.original = original;
        }

        private Throwable getOriginal() {
            return original;
        }
    }
}
