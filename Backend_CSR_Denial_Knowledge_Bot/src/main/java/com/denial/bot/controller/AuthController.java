package com.denial.bot.controller;

import com.denial.bot.model.LoginRequest;
import com.denial.bot.model.LoginResponse;
import com.denial.bot.model.RegisterRequest;
import com.denial.bot.model.RegisterResponse;
import com.denial.bot.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller for handling authentication-related endpoints.
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;

    /**
     * Handles user registration.
     */
    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest registerRequest, BindingResult bindingResult) {
        logger.info("📝 Registration attempt for username: {}", registerRequest.getUsername());

        if (bindingResult.hasErrors()) {
            String errorMessage = bindingResult.getFieldErrors().stream()
                    .map(FieldError::getDefaultMessage)
                    .collect(Collectors.joining("; "));
            logger.warn("❌ Validation errors: {}", errorMessage);
            return ResponseEntity.badRequest().body(new RegisterResponse(false, errorMessage));
        }

        try {
            RegisterResponse response = authService.registerUser(registerRequest);
            if (response.isSuccess()) {
                logger.info("✅ Registration successful for: {}", registerRequest.getUsername());
                return ResponseEntity.ok(response);
            } else {
                logger.warn("❌ Registration failed: {}", response.getMessage());
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            logger.error("❌ Registration error", e);
            return ResponseEntity.internalServerError().body(new RegisterResponse(false, "Registration failed: " + e.getMessage()));
        }
    }

    /**
     * Handles user login.
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest, BindingResult bindingResult) {
        logger.info("🔐 Login attempt for username: {}", loginRequest.getUsername());

        if (bindingResult.hasErrors()) {
            String errorMessage = bindingResult.getFieldErrors().stream()
                    .map(FieldError::getDefaultMessage)
                    .collect(Collectors.joining("; "));
            logger.warn("❌ Login validation errors: {}", errorMessage);
            return ResponseEntity.badRequest().body(new LoginResponse(null, null, errorMessage, false));
        }

        try {
            boolean isValid = authService.validateCredentials(loginRequest.getUsername(), loginRequest.getPassword());
            if (isValid) {
                String token = authService.generateToken(loginRequest.getUsername());
                logger.info("✅ Login successful for: {}", loginRequest.getUsername());
                return ResponseEntity.ok(new LoginResponse(token, loginRequest.getUsername(), "Login successful", true));
            } else {
                String errorMessage = authService.getLoginErrorMessage(loginRequest.getUsername(), loginRequest.getPassword());
                logger.warn("❌ Login failed: {}", errorMessage);
                return ResponseEntity.status(401).body(new LoginResponse(null, null, errorMessage, false));
            }
        } catch (Exception e) {
            logger.error("❌ Login error", e);
            return ResponseEntity.internalServerError().body(new LoginResponse(null, null, "Login failed: " + e.getMessage(), false));
        }
    }

    /**
     * Validates a JWT token.
     */
    @PostMapping("/validate")
    public ResponseEntity<LoginResponse> validateToken(@RequestHeader("Authorization") String token) {
        try {
            token = token.replace("Bearer ", "");
            if (authService.validateToken(token)) {
                String username = authService.getUsernameFromToken(token);
                return ResponseEntity.ok(new LoginResponse(token, username, "Token is valid", true));
            } else {
                return ResponseEntity.status(401).body(new LoginResponse(null, null, "Invalid or expired token", false));
            }
        } catch (Exception e) {
            logger.error("❌ Token validation error", e);
            return ResponseEntity.internalServerError().body(new LoginResponse(null, null, "Token validation failed: " + e.getMessage(), false));
        }
    }

    /**
     * Retrieves the current user from a valid token.
     */
    @GetMapping("/user")
    public ResponseEntity<LoginResponse> getCurrentUser(@RequestHeader("Authorization") String token) {
        try {
            token = token.replace("Bearer ", "");
            String username = authService.getUsernameFromToken(token);
            if (username != null && authService.validateToken(token)) {
                return ResponseEntity.ok(new LoginResponse(token, username, "User retrieved successfully", true));
            } else {
                return ResponseEntity.status(401).body(new LoginResponse(null, null, "Invalid or expired token", false));
            }
        } catch (Exception e) {
            logger.error("❌ Failed to get user", e);
            return ResponseEntity.internalServerError().body(new LoginResponse(null, null, "Failed to get user: " + e.getMessage(), false));
        }
    }

    /**
     * Logs out the user (client-side token discard).
     */
    @PostMapping("/logout")
    public ResponseEntity<LoginResponse> logout(@RequestHeader("Authorization") String token) {
        try {
            String username = null;
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
                username = authService.getUsernameFromToken(token);
            }
            logger.info("🚪 Logout for user: {}", username != null ? username : "unknown");
            return ResponseEntity.ok(new LoginResponse(null, username, "Logout successful", true));
        } catch (Exception e) {
            logger.error("❌ Logout error", e);
            return ResponseEntity.internalServerError().body(new LoginResponse(null, null, "Logout failed: " + e.getMessage(), false));
        }
    }

    /**
     * Provides test instructions for validation.
     */
    @GetMapping("/test-validation")
    public ResponseEntity<String> testValidation() {
        return ResponseEntity.ok(
            "🧪 API Validation Testing Guide:\n" +
            "POST /api/auth/register - Test with invalid data:\n" +
            "  - Username: '12', '123456', '1user'\n" +
            "  - Email: 'invalid-email', 'test@'\n" +
            "  - Password: 'pass', 'password', 'Test 123!'\n\n" +
            "POST /api/auth/login - Test with invalid data:\n" +
            "  - Username: '', 'ab'\n" +
            "  - Password: '', 'pass'\n" +
            "  - Credentials: 'nonexistent user' / 'Test123!'\n\n" +
            "🎉 NEW: Username spaces are now allowed!"
        );
    }
}
