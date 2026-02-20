package com.denial.bot.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web Configuration for CORS support
 * This configuration works alongside SecurityConfig to ensure comprehensive
 * CORS support
 * for both the React frontend and AI model API interactions
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(
                        "http://localhost:3000",
                        "http://127.0.0.1:3000",
                        "http://localhost:5004",
                        "http://127.0.0.1:5004",
                        "http://localhost:8081",
                        "http://127.0.0.1:8081")
                // HTTP Methods
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD")
                // Headers
                .allowedHeaders(
                        "Authorization",
                        "Content-Type",
                        "Accept",
                        "Origin",
                        "X-Requested-With",
                        "Cache-Control")
                // Exposed headers for frontend access
                .exposedHeaders(
                        "Authorization",
                        "Content-Type")
                // Allow credentials (JWT tokens)
                .allowCredentials(true)
                // Cache preflight requests
                .maxAge(3600);
    }
}
