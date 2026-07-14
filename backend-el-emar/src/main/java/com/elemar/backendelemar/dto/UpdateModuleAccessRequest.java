package com.elemar.backendelemar.dto;



import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class UpdateModuleAccessRequest {

    private List<ModuleAccessUpdate> modules;

    @Getter
    @Setter
    public static class ModuleAccessUpdate {
        private Long moduleId;
        private Boolean autorise;
    }
}