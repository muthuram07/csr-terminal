package com.denial.bot.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * ENHANCED Service for handling smart query processing and ML API
 * communication.
 * Features:
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern for API failures
 * - Request/response caching
 * - Comprehensive error handling
 * - Performance metrics logging
 */
@Service
public class SmartQueryService {

    private static final Logger logger = LoggerFactory.getLogger(SmartQueryService.class);

    // Retry configuration
    private static final int MAX_RETRIES = 3;
    private static final long INITIAL_BACKOFF_MS = 200;
    private static final double BACKOFF_MULTIPLIER = 2.0;

    // Circuit breaker
    private static final int FAILURE_THRESHOLD = 5;
    private static final long CIRCUIT_OPEN_DURATION_MS = 30000; // 30 seconds

    private int consecutiveFailures = 0;
    private long lastFailureTime = 0;
    private boolean circuitOpen = false;

    private final RestTemplate restTemplate;
    private final Map<String, CachedResponse> responseCache = new ConcurrentHashMap<>();

    @Value("${smart.ml.api.base-url:http://localhost:5004}")
    private String mlApiBaseUrl;

    @Value("${smart.llm.api.url:}")
    private String llmApiUrl;

    @Value("${smart.llm.api.key:}")
    private String llmApiKey;

    @Value("${smart.recommendation.use-llm:false}")
    private boolean useLlmForSuggestions;

    public SmartQueryService(RestTemplateBuilder builder) {
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
    }

    // ========================================================================
    // CIRCUIT BREAKER PATTERN
    // ========================================================================

    private void recordSuccess() {
        consecutiveFailures = 0;
        circuitOpen = false;
        logger.debug("✅ API call successful, circuit reset");
    }

    private void recordFailure() {
        consecutiveFailures++;
        lastFailureTime = System.currentTimeMillis();
        if (consecutiveFailures >= FAILURE_THRESHOLD) {
            circuitOpen = true;
            logger.warn("🔴 Circuit breaker OPEN after {} failures", consecutiveFailures);
        }
    }

    private boolean isCircuitOpen() {
        if (!circuitOpen)
            return false;

        // Check if enough time has passed to try again
        long timeSinceLastFailure = System.currentTimeMillis() - lastFailureTime;
        if (timeSinceLastFailure >= CIRCUIT_OPEN_DURATION_MS) {
            logger.info("🟡 Circuit breaker attempting recovery...");
            circuitOpen = false;
            consecutiveFailures = 0;
            return false;
        }
        return true;
    }

    // ========================================================================
    // RETRY LOGIC WITH EXPONENTIAL BACKOFF
    // ========================================================================

    private <T> T retryWithBackoff(String operationName, RetryableOperation<T> operation) {
        int attempt = 0;
        long backoffMs = INITIAL_BACKOFF_MS;

        while (attempt < MAX_RETRIES) {
            try {
                if (isCircuitOpen()) {
                    throw new RestClientException("Circuit breaker is OPEN");
                }

                logger.debug("🔄 {}: Attempt {} of {}", operationName, attempt + 1, MAX_RETRIES);
                T result = operation.execute();
                recordSuccess();
                return result;

            } catch (Exception e) {
                attempt++;
                recordFailure();

                if (attempt >= MAX_RETRIES) {
                    logger.error("❌ {} failed after {} attempts: {}", operationName, MAX_RETRIES, e.getMessage());
                    throw new RestClientException("Operation failed after retries: " + e.getMessage());
                }

                logger.warn("⚠️  {} failed (attempt {}/{}), retrying in {}ms: {}",
                        operationName, attempt, MAX_RETRIES, backoffMs, e.getMessage());

                try {
                    Thread.sleep(backoffMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RestClientException("Retry interrupted");
                }

                backoffMs = (long) (backoffMs * BACKOFF_MULTIPLIER);
            }
        }

        throw new RestClientException("Max retries exceeded for: " + operationName);
    }

    @FunctionalInterface
    private interface RetryableOperation<T> {
        T execute() throws Exception;
    }

    // ========================================================================
    // CACHING LAYER
    // ========================================================================

    private static class CachedResponse {
        final Map<String, Object> data;
        final long timestamp;
        final long ttlMs;

        CachedResponse(Map<String, Object> data, long ttlMs) {
            this.data = data;
            this.timestamp = System.currentTimeMillis();
            this.ttlMs = ttlMs;
        }

        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > ttlMs;
        }
    }

    private Map<String, Object> getCachedResponse(String key) {
        CachedResponse cached = responseCache.get(key);
        if (cached != null && !cached.isExpired()) {
            logger.debug("💾 Cache hit for: {}", key);
            return cached.data;
        }
        responseCache.remove(key);
        return null;
    }

    private void cacheResponse(String key, Map<String, Object> data, long ttlMs) {
        responseCache.put(key, new CachedResponse(data, ttlMs));
    }

    // ========================================================================
    // MAIN QUERY PROCESSING
    // ========================================================================

    /**
     * Sends a query to the ML API with retry logic and caching.
     */
    public Map<String, Object> processQuery(String query, String queryType, Map<String, Object> medicalContext) {
        try {
            // Check cache first (5 minute TTL for identical queries)
            String cacheKey = "query:" + query.hashCode();
            Map<String, Object> cached = getCachedResponse(cacheKey);
            if (cached != null) {
                return cached;
            }

            // Retry with backoff
            Map<String, Object> response = retryWithBackoff("processQuery", () -> {
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("query", query);
                if (queryType != null) {
                    requestBody.put("type", queryType);
                }
                if (medicalContext != null && !medicalContext.isEmpty()) {
                    requestBody.put("medicalContext", medicalContext);
                }

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("User-Agent", "CSR-Denial-Bot-Backend/2.0");
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

                long startTime = System.currentTimeMillis();
                ResponseEntity<Map> apiResponse = restTemplate.exchange(
                        mlApiBaseUrl + "/query",
                        HttpMethod.POST,
                        entity,
                        Map.class);
                long duration = System.currentTimeMillis() - startTime;
                logger.info("✅ ML API /query responded in {}ms", duration);

                if (apiResponse.getStatusCode().is2xxSuccessful() && apiResponse.getBody() != null) {
                    return apiResponse.getBody();
                } else {
                    throw new RestClientException("API returned: " + apiResponse.getStatusCode());
                }
            });

            // Cache successful response
            cacheResponse(cacheKey, response, 300000); // 5 minutes
            return response;

        } catch (Exception e) {
            logger.error("❌ Query processing failed: {}", e.getMessage());
            return createErrorResponse("Failed to process query: " + e.getMessage());
        }
    }

    /**
     * Get query recommendations with retry logic
     */
    public List<String> recommendQueries(String partialInput, Map<String, Object> medicalContext, int limit) {
        try {
            String normalizedInput = partialInput == null ? "" : partialInput.trim().toLowerCase(Locale.ROOT);
            int safeLimit = Math.max(1, Math.min(limit, 8));

            // Try ML API recommendations first
            List<String> mlSuggestions = retryWithBackoff("getRecommendations", () -> {
                String cacheKey = "recommendations:" + normalizedInput.hashCode();
                Map<String, Object> cached = getCachedResponse(cacheKey);
                if (cached != null && cached.containsKey("suggestions")) {
                    @SuppressWarnings("unchecked")
                    List<String> cached_suggestions = (List<String>) cached.get("suggestions");
                    return cached_suggestions;
                }

                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("input", normalizedInput);
                requestBody.put("limit", safeLimit * 2);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

                ResponseEntity<Map> response = restTemplate.exchange(
                        mlApiBaseUrl + "/recommendations",
                        HttpMethod.POST,
                        entity,
                        Map.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    @SuppressWarnings("unchecked")
                    List<String> suggestions = (List<String>) response.getBody().get("suggestions");
                    cacheResponse(cacheKey, response.getBody(), 300000); // Cache 5 minutes
                    return suggestions != null ? suggestions : new ArrayList<>();
                }
                return new ArrayList<>();
            });

            Set<String> merged = new LinkedHashSet<>(mlSuggestions);

            // Fallback to knowledge base if needed
            if (merged.isEmpty()) {
                merged.addAll(retrieveFromMedicalKnowledgeBase(normalizedInput, medicalContext, safeLimit * 2));
            }

            if (merged.isEmpty()) {
                merged.add("Explain denial code CO-45 for outpatient claim");
                merged.add("What documents are required for claim appeal?");
                merged.add("Is prior authorization needed for MRI under plan PPO?");
            }

            return merged.stream().limit(safeLimit).collect(Collectors.toList());

        } catch (Exception e) {
            logger.warn("⚠️  Recommendation generation failed: {}", e.getMessage());
            return retrieveFromMedicalKnowledgeBase(partialInput, medicalContext, 5);
        }
    }

    private List<String> retrieveFromMedicalKnowledgeBase(String input, Map<String, Object> medicalContext, int limit) {
        List<String> kb = List.of(
                "What does denial code CO-45 mean for this claim?",
                "How to resolve denial code CO-16 missing information?",
                "Is dental cleaning covered under this member plan?",
                "Check if vision exam is covered for member M12345",
                "What are appeal steps for denied inpatient authorization?",
                "Is CPT 99213 covered under current policy?",
                "Does this plan require prior authorization for MRI?",
                "How to verify member eligibility for today?",
                "What is timely filing limit for this payer?",
                "Suggest next action for denial code PR-1",
                "Is emergency room visit covered out of network?",
                "What are exclusions for durable medical equipment?",
                "Can we resubmit denied claim with modifier correction?",
                "Show coverage details for prescription drugs",
                "Does plan include preventive care without copay?");

        String contextText = medicalContext == null ? ""
                : medicalContext.values().stream()
                        .map(String::valueOf)
                        .collect(Collectors.joining(" "))
                        .toLowerCase(Locale.ROOT);

        return kb.stream()
                .sorted(Comparator
                        .comparingInt((String q) -> relevanceScore(q.toLowerCase(Locale.ROOT), input, contextText))
                        .reversed())
                .limit(limit)
                .collect(Collectors.toList());
    }

    private int relevanceScore(String candidate, String input, String contextText) {
        int score = 0;
        if (input == null || input.isBlank()) {
            return 1;
        }

        if (candidate.startsWith(input))
            score += 12;
        if (candidate.contains(input))
            score += 8;

        for (String token : input.split("\\s+")) {
            if (token.isBlank())
                continue;
            if (candidate.contains(token))
                score += 3;
            if (!contextText.isBlank() && contextText.contains(token) && candidate.contains(token))
                score += 2;
        }
        return score;
    }

    private List<String> generateLlmSuggestions(String input, Map<String, Object> medicalContext, int limit) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(llmApiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("input", input);
            body.put("context", medicalContext == null ? Map.of() : medicalContext);
            body.put("limit", limit);
            body.put("domain", "healthcare-claims");
            body.put("safety", "return clinically safe and non-diagnostic query suggestions only");

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.exchange(llmApiUrl, HttpMethod.POST, request, Map.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return List.of();
            }

            Object suggestions = response.getBody().get("suggestions");
            if (suggestions instanceof List<?> list) {
                List<String> cleaned = new ArrayList<>();
                for (Object o : list) {
                    if (o != null)
                        cleaned.add(String.valueOf(o));
                }
                return cleaned;
            }
            return List.of();
        } catch (Exception ex) {
            logger.warn("LLM suggestion call failed, falling back to retrieval-only recommendations: {}",
                    ex.getMessage());
            return List.of();
        }
    }

    /**
     * Health check with retry logic
     */
    public boolean checkMLApiHealth() {
        try {
            return retryWithBackoff("healthCheck", () -> {
                ResponseEntity<Map> response = restTemplate.getForEntity(
                        mlApiBaseUrl + "/health",
                        Map.class);
                return response.getStatusCode().is2xxSuccessful();
            });
        } catch (Exception e) {
            logger.error("❌ ML API health check failed: {}", e.getMessage());
            return false;
        }
    }

    public Map<String, Object> getTrainStatus() {
        try {
            return retryWithBackoff("getTrainStatus", () -> {
                ResponseEntity<Map> response = restTemplate.getForEntity(
                        mlApiBaseUrl + "/train-status",
                        Map.class);
                if (response.getStatusCode().is2xxSuccessful()) {
                    return response.getBody();
                }
                throw new RestClientException("Train status call failed");
            });
        } catch (Exception e) {
            logger.error("❌ Error fetching training status: {}", e.getMessage());
            return createErrorResponse("Failed to get training status: " + e.getMessage());
        }
    }

    public Map<String, Object> getAvailableData() {
        try {
            return retryWithBackoff("getAvailableData", () -> {
                ResponseEntity<Map> response = restTemplate.getForEntity(
                        mlApiBaseUrl + "/available-data",
                        Map.class);
                if (response.getStatusCode().is2xxSuccessful()) {
                    return response.getBody();
                }
                throw new RestClientException("Available data call failed");
            });
        } catch (Exception e) {
            logger.error("❌ Error fetching available data: {}", e.getMessage());
            return createErrorResponse("Failed to get available data: " + e.getMessage());
        }
    }

    private Map<String, Object> createErrorResponse(String errorMessage) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("success", false);
        errorResponse.put("error", errorMessage);
        return errorResponse;
    }
}
