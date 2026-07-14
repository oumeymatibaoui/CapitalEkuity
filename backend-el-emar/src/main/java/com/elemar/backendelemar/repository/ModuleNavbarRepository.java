package com.elemar.backendelemar.repository;



import com.elemar.backendelemar.entity.ModuleNavbar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModuleNavbarRepository extends JpaRepository<ModuleNavbar, Long> {

    List<ModuleNavbar> findByActifTrueOrderByOrdreGroupeAscOrdreModuleAsc();

    List<ModuleNavbar> findAllByOrderByOrdreGroupeAscOrdreModuleAsc();
}