package com.denial.bot.service;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.denial.bot.entity.User;
import com.denial.bot.repository.UserRepository;

@Service
public class FirebaseUserService {

    private final UserRepository userRepository;

    public FirebaseUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getOrCreateMappedUser(String firebaseUid, String email, String displayName) {
        Optional<User> existingByUid = userRepository.findByFirebaseUid(firebaseUid);
        if (existingByUid.isPresent()) {
            return existingByUid.get();
        }

        String normalizedEmail = email == null ? null : email.trim().toLowerCase(Locale.ROOT);

        if (normalizedEmail != null && !normalizedEmail.isBlank()) {
            Optional<User> existingByEmail = userRepository.findByEmail(normalizedEmail);
            if (existingByEmail.isPresent()) {
                User mapped = existingByEmail.get();
                mapped.setFirebaseUid(firebaseUid);
                mapped.setActive(true);
                return userRepository.save(mapped);
            }
        }

        String baseUsername = buildBaseUsername(displayName, normalizedEmail, firebaseUid);
        String username = ensureUniqueUsername(baseUsername);

        User created = new User();
        created.setUsername(username);
        created.setEmail(normalizedEmail != null && !normalizedEmail.isBlank() ? normalizedEmail : username + "@firebase.local");
        created.setPassword("FIREBASE_" + UUID.randomUUID());
        created.setRole("USER");
        created.setActive(true);
        created.setFirebaseUid(firebaseUid);
        return userRepository.save(created);
    }

    private String buildBaseUsername(String displayName, String email, String uid) {
        String candidate = null;
        if (displayName != null && !displayName.isBlank()) {
            candidate = displayName.trim().replaceAll("\\s+", "_").replaceAll("[^a-zA-Z0-9_]", "");
        }
        if ((candidate == null || candidate.isBlank()) && email != null && email.contains("@")) {
            candidate = email.substring(0, email.indexOf('@')).replaceAll("[^a-zA-Z0-9_]", "");
        }
        if (candidate == null || candidate.isBlank()) {
            candidate = "firebase_" + uid.substring(0, Math.min(8, uid.length()));
        }
        if (!Character.isLetter(candidate.charAt(0))) {
            candidate = "u_" + candidate;
        }
        if (candidate.length() > 50) {
            candidate = candidate.substring(0, 50);
        }
        return candidate;
    }

    private String ensureUniqueUsername(String baseUsername) {
        String candidate = baseUsername;
        int counter = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = baseUsername + "_" + counter++;
            if (candidate.length() > 100) {
                candidate = candidate.substring(0, 100);
            }
        }
        return candidate;
    }
}
