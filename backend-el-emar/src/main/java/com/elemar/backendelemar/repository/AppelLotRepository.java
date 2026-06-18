package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.AppelLot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AppelLotRepository extends JpaRepository<AppelLot, Long> {

    List<AppelLot> findByAppel_Id(Long appelId);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM AppelLot al WHERE al.appel.id = :appelId")
    void deleteByAppelId(Long appelId);

    @Query("SELECT al FROM AppelLot al JOIN FETCH al.appel JOIN FETCH al.lot")
    List<AppelLot> findAllWithAppelAndLot();
}