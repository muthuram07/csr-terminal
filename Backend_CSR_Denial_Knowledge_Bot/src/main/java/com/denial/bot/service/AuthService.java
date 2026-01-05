package com.denial.bot.service;

import com.denial.bot.entity.User;
import com.denial.bot.model.RegisterRequest;
import com.denial.bot.model.RegisterResponse;
import com.denial.bot.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Authentication service: registration, credential validation, JWT generation and validation,
 * token revocation (in-memory blacklist).
 */
@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Value("${app.jwt.secret:default-secret-change-me}")
    private String jwtSecretRaw;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    private SecretKey jwtSecretKey;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserRepository userRepository;

    // In-memory blacklist; replace with Redis for production
    private final Map<String, Date> tokenBlacklist = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        try {
            byte[] keyBytes = jwtSecretRaw.getBytes(StandardCharsets.UTF_8);
            // Ensure minimum length for HMAC key (32 bytes)
            byte[] keyPadded = Arrays.copyOf(keyBytes, Math.max(32, keyBytes.length));
            jwtSecretKey = Keys.hmacShaKeyFor(keyPadded);
            logger.info("AuthService initialized, jwtExpirationMs={}", jwtExpirationMs);
        } catch (Exception ex) {
            logger.error("Failed to initialize JWT signing key", ex);
            throw new IllegalStateException("Failed to initialize JWT signing key", ex);
        }
    }

    public List<String> validateRegistrationRequest(RegisterRequest req) {
        List<String> errors = new ArrayList<>();
        if (req == null) {
            errors.add("Registration data is required");
            return errors;
        }

        String username = safeTrim(req.getUsername());
        String email = safeTrim(req.getEmail());
        String password = req.getPassword() == null ? null : req.getPassword().trim();

        if (username == null || username.isEmpty()) errors.add("Username is required");
        else {
            if (username.matches("^\\d+$")) errors.add("Username cannot be only numbers");
            if (!Character.isLetter(username.charAt(0))) errors.add("Username must start with a letter");
            if (username.length() < 3 || username.length() > 50) errors.add("Username length must be between 3 and 50");
        }

        if (email == null || email.isEmpty()) errors.add("Email is required");
        else {
            if (email.contains(" ")) errors.add("Email cannot contain spaces");
            if (!email.matches("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")) errors.add("Email format is invalid");
        }

        if (password == null || password.isEmpty()) errors.add("Password is required");
        else {
            if (password.length() < 6) errors.add("Password must be at least 6 characters");
            if (username != null && password.equalsIgnoreCase(username)) errors.add("Password cannot be the same as username");
            if (email != null) {
                String emailUser = email.contains("@") ? email.split("@")[0] : "";
                if (!emailUser.isEmpty() && password.equalsIgnoreCase(emailUser)) errors.add("Password cannot be the same as email username");
            }
        }

        if (username != null && userRepository.existsByUsername(username)) errors.add("Username already exists");
        if (email != null && userRepository.existsByEmail(email)) errors.add("Email already exists");
        return errors;
    }

    public RegisterResponse registerUser(RegisterRequest req) {
        try {
            List<String> validationErrors = validateRegistrationRequest(req);
            if (!validationErrors.isEmpty()) {
                String msg = String.join("; ", validationErrors);
                logger.warn("Registration validation failed: {}", msg);
                return new RegisterResponse(false, msg);
            }
            String username = safeTrim(req.getUsername());
            String email = safeTrim(req.getEmail()).toLowerCase(Locale.ROOT);
            String password = req.getPassword().trim();
            String encoded = passwordEncoder.encode(password);

            User u = new User(username, email, encoded, "USER", true);
            User saved = userRepository.save(u);
            logger.info("New user registered: {} ({})", saved.getUsername(), saved.getEmail());
            return new RegisterResponse(true, "Registration successful! You can now login.", saved.getUsername(), saved.getEmail());
        } catch (Exception ex) {
            logger.error("Registration error", ex);
            return new RegisterResponse(false, "Registration failed: " + ex.getMessage());
        }
    }

    public boolean validateCredentials(String username, String password) {
        try {
            if (username == null || username.trim().isEmpty()) {
                logger.warn("Empty username provided for validateCredentials");
                return false;
            }
            if (password == null || password.isEmpty()) {
                logger.warn("Empty password provided for user={}", username);
                return false;
            }
            Optional<User> userOpt = userRepository.findByUsernameAndActive(username.trim(), true);
            if (userOpt.isEmpty()) {
                logger.warn("User not found or inactive: {}", username);
                return false;
            }
            User user = userOpt.get();
            boolean matches = passwordEncoder.matches(password, user.getPassword());
            if (matches) logger.info("User authenticated: {}", username);
            else logger.warn("Authentication failed (bad password) for user={}", username);
            return matches;
        } catch (Exception ex) {
            logger.error("Error validating credentials for user={}", username, ex);
            return false;
        }
    }

    public String getLoginErrorMessage(String username, String password) {
        if (username == null || username.trim().isEmpty()) return "Username is required";
        if (password == null || password.isEmpty()) return "Password is required";
        Optional<User> userOpt = userRepository.findByUsername(username.trim());
        if (userOpt.isEmpty()) return "This username is not registered. Please sign up first.";
        User user = userOpt.get();
        if (!user.isActive()) return "This account is inactive. Please contact support.";
        return "Incorrect password. Please try again.";
    }

    public String generateToken(String username) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtExpirationMs);
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(jwtSecretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        try {
            if (token == null || token.isEmpty()) return null;
            Jws<Claims> j = Jwts.parserBuilder().setSigningKey(jwtSecretKey).build().parseClaimsJws(token);
            return j.getBody().getSubject();
        } catch (JwtException | IllegalArgumentException ex) {
            logger.warn("Invalid JWT token: {}", ex.getMessage());
            return null;
        } catch (Exception ex) {
            logger.error("Unexpected error parsing token", ex);
            return null;
        }
    }

    public boolean validateToken(String token) {
        try {
            if (token == null || token.isEmpty()) return false;
            if (isTokenBlacklisted(token)) {
                logger.warn("Token is blacklisted");
                return false;
            }
            String username = getUsernameFromToken(token);
            if (username == null) return false;
            return userRepository.findByUsernameAndActive(username, true).isPresent();
        } catch (Exception ex) {
            logger.error("Error validating token", ex);
            return false;
        }
    }

    public void revokeToken(String token) {
        try {
            if (token == null || token.isEmpty()) return;
            Date expiry = extractExpiration(token);
            if (expiry == null) expiry = new Date(System.currentTimeMillis() + 3600_000); // fallback 1h
            tokenBlacklist.put(token, expiry);
            logger.info("Token revoked until {}", expiry);
        } catch (Exception ex) {
            logger.error("Failed to revoke token", ex);
        }
    }

    private boolean isTokenBlacklisted(String token) {
        try {
            Date expiry = tokenBlacklist.get(token);
            if (expiry == null) return false;
            if (expiry.before(new Date())) {
                tokenBlacklist.remove(token);
                return false;
            }
            return true;
        } catch (Exception ex) {
            logger.error("Error checking blacklist", ex);
            return false;
        }
    }

    private Date extractExpiration(String token) {
        try {
            Jws<Claims> j = Jwts.parserBuilder().setSigningKey(jwtSecretKey).build().parseClaimsJws(token);
            return j.getBody().getExpiration();
        } catch (JwtException | IllegalArgumentException ex) {
            logger.warn("Unable to extract expiration: {}", ex.getMessage());
            return null;
        } catch (Exception ex) {
            logger.error("Unexpected error extracting expiration", ex);
            return null;
        }
    }

    public Optional<User> getUserByUsername(String username) {
        if (username == null) return Optional.empty();
        try {
            return userRepository.findByUsernameAndActive(username, true);
        } catch (Exception ex) {
            logger.error("Error fetching user {}", username, ex);
            return Optional.empty();
        }
    }

    public long getTotalUsers() {
        try {
            return userRepository.count();
        } catch (Exception ex) {
            logger.error("Error counting users", ex);
            return 0;
        }
    }

    private String safeTrim(String s) {
        return s == null ? null : s.trim();
    }
}
