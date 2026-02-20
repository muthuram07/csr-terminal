package com.denial.bot.config;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Filter to add security headers for Cross-Origin requests
 * Resolves COOP (Cross-Origin-Opener-Policy) warnings from Firebase auth popups
 */
@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        // CRITICAL: Allow pop-ups for Firebase authentication
        // Setting to "same-origin-allow-popups" allows authenticated popups while maintaining security
        response.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
        response.setHeader("Cross-Origin-Opener-Policy-Report-Only", "same-origin-allow-popups");
        
        // Allow cross-origin embedder policy for resources
        response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        response.setHeader("Cross-Origin-Embedder-Policy-Report-Only", "require-corp");
        
        // Additional security headers
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "SAMEORIGIN");
        response.setHeader("X-XSS-Protection", "1; mode=block");
        response.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
        
        filterChain.doFilter(request, response);
    }
}
