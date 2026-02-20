package com.denial.bot.controller;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;

import com.denial.bot.entity.Conversation;
import com.denial.bot.entity.User;
import com.denial.bot.repository.ConversationRepository;
import com.denial.bot.repository.UserRepository;
import com.denial.bot.service.SmartQueryService;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;

/**
 * Controller for handling smart query processing and conversation history.
 */
@RestController
@RequestMapping("/api/smart")
public class SmartQueryController {

    private static final Logger logger = LoggerFactory.getLogger(SmartQueryController.class);

    @Value("${app.disable-auth:false}")
    private boolean disableAuth;

    @Autowired
    private SmartQueryService smartQueryService;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Saves a conversation to the database.
     */
    public void saveConversation(User user, String userInput, Map<String, Object> response, int timezoneOffsetMinutes) {
        try {
            Map<String, Object> innerResponse = (Map<String, Object>) response.getOrDefault("response", Map.of());
            String outputType = String.valueOf(innerResponse.getOrDefault("type", "general"));
            String aiOutput = objectMapper.writeValueAsString(response);

            Conversation convo = new Conversation();
            convo.setUser(user);
            convo.setUserInput(userInput);
            convo.setAiOutput(aiOutput);
            convo.setOutputType(outputType);
            convo.setTimezoneOffsetMinutes(timezoneOffsetMinutes);

            LocalDate localDate = Instant.now()
                    .atOffset(ZoneOffset.ofTotalSeconds(timezoneOffsetMinutes * 60))
                    .toLocalDate();
            convo.setBucketDateId(localDate.toString());

            conversationRepository.save(convo);
            logger.info("💾 Conversation saved for user: {} in bucket {}", user.getUsername(), convo.getBucketDateId());
        } catch (Exception e) {
            logger.error("❌ Failed to save conversation", e);
        }
    }

    /**
     * Processes a smart query and returns AI-generated response.
     */

    @PostMapping("/query")
    public ResponseEntity<?> processSmartQuery(
            @RequestBody Map<String, Object> request,
            HttpServletRequest httpServletRequest) {

        try {
            User user = (User) httpServletRequest.getAttribute("authenticatedUser");

            // Check for auth bypass (Dev Mode)
            if (disableAuth && user == null) {
                logger.warn("DEV MODE: Bypass auth for /query. Using dummy user.");
                user = userRepository.findByUsername("dev-user")
                        .orElseGet(() -> {
                            User newUser = new User("dev-user", "dev@local", "pass", "ADMIN", true);
                            newUser.setFirebaseUid("dev-uid");
                            return userRepository.save(newUser);
                        });
            }

            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized access"));
            }

            String query = (String) request.get("query");
            String queryType = (String) request.get("type");
            Map<String, Object> medicalContext = (Map<String, Object>) request.get("medicalContext");
            int timezoneOffsetMinutes = ((Number) request.getOrDefault("timezoneOffsetMinutes", 0)).intValue();

            if (query == null || query.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Query is required"));
            }

            Map<String, Object> response = smartQueryService.processQuery(query, queryType, medicalContext);

            if ((Boolean) response.getOrDefault("success", false)) {
                saveConversation(user, query, response, timezoneOffsetMinutes);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("❌ Failed to process smart query", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", "Failed to process query: " + e.getMessage()));
        }
    }

    /**
     * Retrieves full conversation history for the authenticated user.
     */
    @GetMapping("/history")
    public ResponseEntity<?> getConversationHistory(HttpServletRequest request) {
        try {
            User authenticatedUser = (User) request.getAttribute("authenticatedUser");
            if (authenticatedUser == null) {
                return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized access"));
            }

            List<Conversation> history = conversationRepository.findByUserOrderByCreatedAtDesc(authenticatedUser);
            return ResponseEntity.ok(Map.of("success", true, "count", history.size(), "data", history));

        } catch (Exception e) {
            logger.error("❌ Failed to fetch conversation history", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", "Failed to fetch history: " + e.getMessage()));
        }
    }

    /**
     * Retrieves conversation history filtered by output type.
     */
    @GetMapping("/history/type/{outputType}")
    public ResponseEntity<?> getConversationByType(
            @PathVariable String outputType,
            HttpServletRequest request) {

        try {
            User authenticatedUser = (User) request.getAttribute("authenticatedUser");
            if (authenticatedUser == null) {
                return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized access"));
            }

            List<Conversation> filtered = conversationRepository
                    .findByUserAndOutputTypeOrderByCreatedAtDesc(authenticatedUser, outputType);
            return ResponseEntity.ok(Map.of("success", true, "count", filtered.size(), "data", filtered));

        } catch (Exception e) {
            logger.error("❌ Failed to fetch filtered conversation history", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", "Failed to fetch filtered history: " + e.getMessage()));
        }
    }

    /**
     * Retrieves conversation history within a specified date range.
     */
    @GetMapping("/history/date-range")
    public ResponseEntity<?> getConversationByDateRange(
            HttpServletRequest request,
            @RequestParam("start") String startDateStr,
            @RequestParam("end") String endDateStr,
            @RequestParam(value = "timezoneOffsetMinutes", defaultValue = "0") int timezoneOffsetMinutes) {

        try {
            User authenticatedUser = (User) request.getAttribute("authenticatedUser");
            if (authenticatedUser == null) {
                return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized access"));
            }

            LocalDate startLocal = LocalDate.parse(startDateStr);
            LocalDate endLocal = LocalDate.parse(endDateStr);

            List<Conversation> filtered = conversationRepository.findByUserAndBucketRange(
                    authenticatedUser,
                    startLocal.toString(),
                    endLocal.toString());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "count", filtered.size(),
                    "startBucket", startLocal.toString(),
                    "endBucket", endLocal.toString(),
                    "timezoneOffsetMinutes", timezoneOffsetMinutes,
                    "data", filtered));

        } catch (Exception e) {
            logger.error("❌ Failed to fetch date-filtered conversation history", e);
            return ResponseEntity.internalServerError().body(
                    Map.of("success", false, "error", "Failed to fetch date-filtered history: " + e.getMessage()));
        }
    }

    @GetMapping("/history/today")
    public ResponseEntity<?> getConversationToday(
            HttpServletRequest request,
            @RequestParam(value = "timezoneOffsetMinutes", defaultValue = "0") int timezoneOffsetMinutes) {
        try {
            User authenticatedUser = (User) request.getAttribute("authenticatedUser");
            if (authenticatedUser == null) {
                return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized access"));
            }

            LocalDate today = Instant.now()
                    .atOffset(ZoneOffset.ofTotalSeconds(timezoneOffsetMinutes * 60))
                    .toLocalDate();

            List<Conversation> filtered = conversationRepository.findByUserAndBucketRange(
                    authenticatedUser,
                    today.toString(),
                    today.toString());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "bucket", today.toString(),
                    "count", filtered.size(),
                    "data", filtered));
        } catch (Exception e) {
            logger.error("❌ Failed to fetch today's history", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", "Failed to fetch today's history: " + e.getMessage()));
        }
    }

    @PostMapping("/recommendations")
    public ResponseEntity<?> getRecommendations(@RequestBody Map<String, Object> request) {
        try {
            String input = String.valueOf(request.getOrDefault("input", ""));
            Map<String, Object> medicalContext = (Map<String, Object>) request.get("medicalContext");
            int limit = ((Number) request.getOrDefault("limit", 5)).intValue();

            List<String> suggestions = smartQueryService.recommendQueries(input, medicalContext, limit);
            return ResponseEntity.ok(Map.of("success", true, "suggestions", suggestions));
        } catch (Exception e) {
            logger.error("❌ Failed to generate recommendations", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", "Failed to generate recommendations"));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        boolean healthy = smartQueryService.checkMLApiHealth();
        return ResponseEntity.ok(Map.of("success", healthy));
    }

    @GetMapping("/train-status")
    public ResponseEntity<?> trainStatus() {
        return ResponseEntity.ok(smartQueryService.getTrainStatus());
    }

    @GetMapping("/available-data")
    public ResponseEntity<?> availableData() {
        return ResponseEntity.ok(smartQueryService.getAvailableData());
    }
}
