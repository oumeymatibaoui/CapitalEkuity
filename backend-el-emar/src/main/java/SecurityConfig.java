package com.elemar.backendelemar.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())

                // Désactiver login form Spring Security
                .formLogin(AbstractHttpConfigurer::disable)

                // Désactiver Basic Auth Spring Security
                .httpBasic(AbstractHttpConfigurer::disable)

                .authorizeHttpRequests(auth -> auth

                        // Important pour Angular CORS
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Login public
                        .requestMatchers("/api/auth/**").permitAll()

                        // Pour le moment, CRUD public pendant développement
                        .requestMatchers("/api/zones/**").permitAll()
                        .requestMatchers("/api/appels/**").permitAll()

                        // Pour le moment tout est ouvert
                        .anyRequest().permitAll()
                );

        return http.build();
    }
}