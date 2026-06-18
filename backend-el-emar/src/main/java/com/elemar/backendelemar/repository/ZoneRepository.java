package com.elemar.backendelemar.repository;

import com.elemar.backendelemar.entity.Zone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ZoneRepository extends JpaRepository<Zone, Long> {

    List<Zone> findByNomZoneContainingIgnoreCase(String keyword);

    boolean existsByLatitudeAndLongitude(Double latitude, Double longitude);

    boolean existsByLatitudeAndLongitudeAndIdNot(Double latitude, Double longitude, Long id);
}