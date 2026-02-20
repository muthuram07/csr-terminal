package com.denial.bot.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final FirebaseAuthenticationFilter firebaseAuthenticationFilter;
    
    @Value("${app.disable-auth:false}")
    private boolean disableAuth;

    public SecurityConfig(FirebaseAuthenticationFilter firebaseAuthenticationFilter) {
        this.firebaseAuthenticationFilter = firebaseAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> {
                authz.requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers("/h2-console/**").permitAll();
                
                // DEV MODE: Allow unauthenticated access to /api/smart/** for testing
                if (disableAuth) {
                    authz.requestMatchers("/api/smart/**").permitAll();
                }
                
                authz.requestMatchers("/api/**").authenticated()
                    .anyRequest().permitAll();
            })
            .addFilterBefore(firebaseAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.sameOrigin()));

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Allow specific origins: Frontend (3000), AI Model API (5004), and Backend (8081)
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:3000",           // React Frontend
            "http://localhost:5004",           // AI Model API (Flask)
            "http://localhost:8081",           // Backend Self
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5004",
            "http://127.0.0.1:8081"
        ));
        
        // Allow all HTTP methods needed by the frontend and AI model
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"));
        
        // Allow essential headers including Authorization and CORS headers
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Credentials",
            "X-Requested-With",
            "Cache-Control"
        ));
        
        // Expose headers that the frontend/AI model might need to access
        configuration.setExposedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Access-Control-Allow-Credentials"
        ));
        
        // Enable credential support for authentication (JWT tokens)
        configuration.setAllowCredentials(true);
        
        // Cache CORS preflight requests for 1 hour (3600 seconds)
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public UserDetailsService userDetailsService() {
        // Empty user details service to prevent default user generation
        // We use JWT authentication in controllers, not Spring Security users
        return new InMemoryUserDetailsManager();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

} 