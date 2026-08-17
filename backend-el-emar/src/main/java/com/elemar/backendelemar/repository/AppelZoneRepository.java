package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.AppelZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AppelZoneRepository{
//        extends JpaRepository<AppelZone, Long> {
//
//    List<AppelZone> findByAppel_Id(Long appelId);
//
//    @Modifying(flushAutomatically = true, clearAutomatically = true)
//    @Query("DELETE FROM AppelZone az WHERE az.appel.id = :appelId")
//    void deleteByAppelId(@Param("appelId") Long appelId);
}