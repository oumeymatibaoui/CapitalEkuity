package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByDestinataire_IdOrderByDateCreationDesc(Long destinataireId);

    List<Notification> findAllByApplicationCandidature_IdOrderByDateCreationAsc(
            Long applicationCandidatureId
    );

    List<Notification> findAllByApplicationCandidature_IdAndReponseCritereIdOrderByDateCreationAsc(
            Long applicationCandidatureId,
            Long reponseCritereId
    );
}