package com.elemar.backendelemar.entity;



import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "module_navbar")
@Getter
@Setter
public class ModuleNavbar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code_module", nullable = false, unique = true)
    private String codeModule;

    @Column(name = "groupe", nullable = false)
    private String groupe;

    @Column(name = "libelle", nullable = false)
    private String libelle;

    @Column(name = "description")
    private String description;

    @Column(name = "route_front")
    private String routeFront;

    @Column(name = "icone")
    private String icone;

    @Column(name = "ordre_groupe")
    private Integer ordreGroupe;

    @Column(name = "ordre_module")
    private Integer ordreModule;

    @Column(name = "actif")
    private Boolean actif = true;

}