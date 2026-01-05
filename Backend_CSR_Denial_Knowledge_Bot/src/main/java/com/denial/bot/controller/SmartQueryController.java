package com.denial.bot.controller;

import java.sql.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.denial.bot.entity.Conversation;
import com.denial.bot.entity.User;
import com.denial.bot.repository.ConversationRepository;
import com.denial.bot.service.AuthService;
import com.denial.bot.service.SmartQueryService;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Controller for handling smart query processing and conversation history.
 */
@RestController
@RequestMapping("/api/smart")
@CrossOrigin(origins = "*")
public class SmartQueryController {

    private static final Logger logger = LoggerFactory.getLogger(SmartQueryController.class);

    @Autowired
    private SmartQueryService smartQueryService;

    @Autowired
    private AuthService authService;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Saves a conversation to the database.
     */
    public void saveConversation(String token, String userInput, Map<String, Object> response) {
        try {
            String username = authService.getUsernameFromToken(token);
            Optional<User> userOpt = authService.getUserByUsername(username);

            if (userOpt.isPresent()) {
                Map<String, Object> innerResponse = (Map<String, Object>) response.get("response");
                String outputType = innerResponse.get("type").toString();
                String aiOutput = objectMapper.writeValueAsString(response);

                Conversation convo = new Conversation();
                convo.setUser(userOpt.get());
                convo.setUserInput(userInput);
                convo.setAiOutput(aiOutput);
                convo.setOutputType(outputType);

                conversationRepository.save(convo);
                logger.info("💾 Conversation saved for user: {}", username);
            }
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
            @RequestHeader("Authorization") String token) {

        try {
            token = token.replace("Bearer ", "");

            if (!authService.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized access"));
            }

            String query = (String) request.get("query");
            String queryType = (String) request.get("type");

            if (query == null || query.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Query is required"));
            }

            Map<String, Object> response = smartQueryService.processQuery(query, queryType);

            if ((Boolean) response.getOrDefault("success", false)) {
                saveConversation(token, query, response);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("❌ Failed to process smart query", e);
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", "Failed to process query: " + e.getMessage()));
        }
    }

    /**
     * Retrieves full conversation history for the authenticated user.
     */
    @GetMapping("/history")
    public ResponseEntity<?> getConversationHistory(@RequestHeader("Authorization") String token) {
        try {
            token = token.replace("Bearer ", "");

            if (!authService.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized access"));
            }

            String username = authService.getUsernameFromToken(token);
            Optional<User> userOpt = authService.getUserByUsername(username);

            if (userOpt.isPresent()) {
                List<Conversation> history = conversationRepository.findByUser(userOpt.get());
                return ResponseEntity.ok(Map.of("success", true, "count", history.size(), "data", history));
            } else {
                return ResponseEntity.status(404).body(Map.of("success", false, "error", "User not found"));
            }

        } catch (Exception e) {
            logger.error("❌ Failed to fetch conversation history", e);
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", "Failed to fetch history: " + e.getMessage()));
        }
    }

    /**
     * Retrieves conversation history filtered by output type.
     */
    @GetMapping("/history/type/{outputType}")
    public ResponseEntity<?> getConversationByType(
            @PathVariable String outputType,
            @RequestHeader("Authorization") String token) {

        try {
            token = token.replace("Bearer ", "");

            if (!authService.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized access"));
            }

            String username = authService.getUsernameFromToken(token);
            Optional<User> userOpt = authService.getUserByUsername(username);

            if (userOpt.isPresent()) {
                List<Conversation> filtered = conversationRepository.findByUserAndOutputType(userOpt.get(), outputType);
                return ResponseEntity.ok(Map.of("success", true, "count", filtered.size(), "data", filtered));
            } else {
                return ResponseEntity.status(404).body(Map.of("success", false, "error", "User not found"));
            }

        } catch (Exception e) {
            logger.error("❌ Failed to fetch filtered conversation history", e);
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", "Failed to fetch filtered history: " + e.getMessage()));
        }
    }

    /**
     * Retrieves conversation history within a specified date range.
     */
    @GetMapping("/history/date-range")
    public ResponseEntity<?> getConversationByDateRange(
            @RequestHeader("Authorization") String token,
            @RequestParam("start") String startDateStr,
            @RequestParam("end") String endDateStr) {

        try {
            token = token.replace("Bearer ", "");

            if (!authService.validateToken(token)) {
                return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized access"));
            }

            String username = authService.getUsernameFromToken(token);
            Optional<User> userOpt = authService.getUserByUsername(username);

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("success", false, "error", "User not found"));
            }

            Date startDate = Date.valueOf(startDateStr);
            Date endDate = Date.valueOf(endDateStr);

            List<Conversation> filtered = conversationRepository.findByUserAndDateRange(userOpt.get(), startDate, endDate);

            return ResponseEntity.ok(Map.of("success", true, "count", filtered.size(), "data", filtered));

        } catch (Exception e) {
            logger.error("❌ Failed to fetch date-filtered conversation history", e);
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", "Failed to fetch date-filtered history: " + e.getMessage()));
        }
    }
}
