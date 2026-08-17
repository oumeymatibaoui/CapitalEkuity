package com.elemar.backendelemar.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class AdminAchatReadOnlyWebConfig implements WebMvcConfigurer {

    private final AdminAchatReadOnlyInterceptor adminAchatReadOnlyInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(adminAchatReadOnlyInterceptor)
                .addPathPatterns("/api/**");
    }
}
