package com.denial.bot.service;

import com.denial.bot.entity.Conversation;
import com.denial.bot.entity.User;
import com.denial.bot.repository.ConversationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Service for handling smart query processing and ML API communication.
 */
@Service
public class SmartQueryService {

    private static final Logger logger = LoggerFactory.getLogger(SmartQueryService.class);

    private final RestTemplate restTemplate;
    private final String ML_API_BASE_URL = "http://localhost:5004";

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private ObjectMapper objectMapper;

    public SmartQueryService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Sends a query to the ML API and returns the response.
     *
     * @param query     The user query.
     * @param queryType Optional query type.
     * @return Response from the ML API.
     */
    public Map<String, Object> processQuery(String query, String queryType) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("query", query);
            if (queryType != null) {
                requestBody.put("type", queryType);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    ML_API_BASE_URL + "/query",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("✅ ML API responded successfully for query: {}", query);
                return response.getBody();
            } else {
                logger.warn("⚠️ ML API returned non-2xx status: {}", response.getStatusCode());
                return createErrorResponse("ML API returned error: " + response.getStatusCode());
            }

        } catch (Exception e) {
            logger.error("❌ Failed to connect to ML API", e);
            return createErrorResponse("Failed to connect to ML API: " + e.getMessage());
        }
    }

    /**
     * Saves a conversation to the database.
     *
     * @param token     JWT token of the user.
     * @param userInput The original user query.
     * @param response  The AI-generated response.
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
            } else {
                logger.warn("⚠️ User not found while saving conversation");
            }
        } catch (Exception e) {
            logger.error("❌ Failed to save conversation", e);
        }
    }

    /**
     * Checks if the ML API is healthy.
     *
     * @return true if healthy, false otherwise.
     */
    public boolean checkMLApiHealth() {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    ML_API_BASE_URL + "/health",
                    Map.class
            );
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            logger.error("❌ ML API health check failed", e);
            return false;
        }
    }

    /**
     * Retrieves the current training status from the ML API.
     */
    public Map<String, Object> getTrainStatus() {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    ML_API_BASE_URL + "/train-status",
                    Map.class
            );
            if (response.getStatusCode().is2xxSuccessful()) {
                return response.getBody();
            } else {
                logger.warn("⚠️ Failed to get training status: {}", response.getStatusCode());
                return createErrorResponse("Failed to get training status");
            }
        } catch (Exception e) {
            logger.error("❌ Error fetching training status", e);
            return createErrorResponse("Failed to connect to ML API: " + e.getMessage());
        }
    }

    /**
     * Retrieves available training data from the ML API.
     */
    public Map<String, Object> getAvailableData() {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    ML_API_BASE_URL + "/available-data",
                    Map.class
            );
            if (response.getStatusCode().is2xxSuccessful()) {
                return response.getBody();
            } else {
                logger.warn("⚠️ Failed to get available data: {}", response.getStatusCode());
                return createErrorResponse("Failed to get available data");
            }
        } catch (Exception e) {
            logger.error("❌ Error fetching available data", e);
            return createErrorResponse("Failed to connect to ML API: " + e.getMessage());
        }
    }

    /**
     * Utility method to create a standardized error response.
     */
    private Map<String, Object> createErrorResponse(String errorMessage) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("success", false);
        errorResponse.put("error", errorMessage);
        return errorResponse;
    }
}
