package com.denial.bot.config;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * DEV-ONLY: Allows testing without requiring valid Firebase tokens.
 * 
 * When DISABLE_AUTH=true (set in application.properties or env var),
 * this filter injects a mock Authorization header to simulate authentication.
 * 
 * FOR PRODUCTION: Remove this class and enable proper Firebase token verification.
 */
@Component
public class DevAuthFilter extends OncePerRequestFilter {

    @Value("${app.disable-auth:false}")
    private boolean disableAuth;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        if (disableAuth) {
            // ⚠️ DEV-ONLY: Inject a mock Bearer token for testing
            // This allows requests without valid Firebase tokens
            String authHeader = request.getHeader("Authorization");
            
            if (authHeader == null || authHeader.isEmpty()) {
                // Create a wrapper with a mock token
                HttpServletRequest wrappedRequest = new AuthorizationHeaderWrapper(
                    request,
                    "Bearer dev-test-token-" + System.currentTimeMillis()
                );
                filterChain.doFilter(wrappedRequest, response);
            } else {
                // Token already present, pass through
                filterChain.doFilter(request, response);
            }
        } else {
            // Production mode: require real tokens (handled by SecurityConfig)
            filterChain.doFilter(request, response);
        }
    }

    /**
     * Wrapper to inject Authorization header
     */
    private static class AuthorizationHeaderWrapper extends org.springframework.web.util.ContentCachingRequestWrapper {
        private final String authToken;

        public AuthorizationHeaderWrapper(HttpServletRequest request, String authToken) {
            super(request);
            this.authToken = authToken;
        }

        @Override
        public String getHeader(String name) {
            if ("Authorization".equalsIgnoreCase(name)) {
                return authToken;
            }
            return super.getHeader(name);
        }
    }
}
