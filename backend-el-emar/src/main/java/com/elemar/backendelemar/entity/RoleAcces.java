package com.elemar.backendelemar.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "role_acces")
@Getter
@Setter
public class RoleAcces {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code_role", nullable = false, unique = true)
    private String codeRole;

    @Column(name = "nom_role", nullable = false)
    private String nomRole;

    @Column(name = "description")
    private String description;

    @Column(name = "type_role")
    private String typeRole;

    @Column(name = "role_systeme")
    private Boolean roleSysteme = false;

    @Column(name = "actif")
    private Boolean actif = true;
}