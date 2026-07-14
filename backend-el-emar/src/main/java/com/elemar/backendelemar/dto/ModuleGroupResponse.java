package com.elemar.backendelemar.dto;



import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ModuleGroupResponse {

    private String groupe;

    private Integer ordreGroupe;

    private Long totalModules;

    private Long modulesAutorises;

    private List<ModuleAccessResponse> modules;
}