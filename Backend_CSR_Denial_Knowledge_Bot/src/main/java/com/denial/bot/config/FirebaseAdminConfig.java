package com.denial.bot.config;

import java.io.FileInputStream;
import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

import jakarta.annotation.PostConstruct;

@Configuration
public class FirebaseAdminConfig {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseAdminConfig.class);

    @Value("${firebase.service-account.path:}")
    private String serviceAccountPath;

    @PostConstruct
    public void initFirebase() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }

        try {
            FirebaseOptions options;

            if (serviceAccountPath != null && !serviceAccountPath.isBlank()) {
                try (FileInputStream serviceAccount = new FileInputStream(serviceAccountPath)) {
                    options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .build();
                }
                FirebaseApp.initializeApp(options);
                logger.info("Firebase Admin initialized using service account file");
            } else {
                try {
                    options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.getApplicationDefault())
                            .build();
                    logger.info("Firebase Admin initialized using application default credentials");
                    FirebaseApp.initializeApp(options);
                } catch (IOException | IllegalStateException ex) {
                    logger.warn(
                            "Firebase Application Default Credentials not available. Firebase features will be disabled.");
                    logger.warn(
                            "To enable Firebase: Set GOOGLE_APPLICATION_CREDENTIALS environment variable or provide firebase.service-account.path in application.properties");
                    return;
                }
            }
        } catch (IOException ex) {
            logger.error("Failed to initialize Firebase Admin SDK", ex);
            throw new IllegalStateException("Firebase initialization failed", ex);
        }
    }
}
