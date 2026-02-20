package com.denial.bot.config;

import java.io.IOException;
import java.util.Collections;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.denial.bot.entity.User;
import com.denial.bot.service.FirebaseUserService;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    private final FirebaseUserService firebaseUserService;
    private final com.denial.bot.repository.UserRepository userRepository;

    @Value("${app.disable-auth:false}")
    private boolean disableAuth;

    public FirebaseAuthenticationFilter(FirebaseUserService firebaseUserService,
            com.denial.bot.repository.UserRepository userRepository) {
        this.firebaseUserService = firebaseUserService;
        this.userRepository = userRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || path.startsWith("/api/auth/")
                || path.startsWith("/h2-console/")
                || !path.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        // DEV MODE: Skip Firebase token verification
        if (disableAuth) {
            // Look up or create a dev user and set it on the request
            User devUser = userRepository.findByUsername("dev-user")
                    .orElseGet(() -> {
                        User newUser = new User("dev-user", "dev@local", "pass", "ADMIN", true);
                        newUser.setFirebaseUid("dev-uid");
                        return userRepository.save(newUser);
                    });
            request.setAttribute("authenticatedUser", devUser);

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken("dev-user",
                    null, Collections.emptyList());
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
            return;
        }

        String authorization = request.getHeader("Authorization");

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            unauthorized(response, "Missing Bearer token");
            return;
        }

        String token = authorization.substring(7);
        try {
            FirebaseToken decoded = FirebaseAuth.getInstance().verifyIdToken(token);
            String uid = decoded.getUid();
            String email = decoded.getEmail();
            String name = decoded.getName();

            User mappedUser = firebaseUserService.getOrCreateMappedUser(uid, email, name);
            request.setAttribute("authenticatedUser", mappedUser);
            request.setAttribute("firebaseUid", uid);

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(uid, null,
                    Collections.emptyList());
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            unauthorized(response, "Invalid Firebase token");
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void unauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"success\":false,\"error\":\"" + message + "\"}");
    }
}
