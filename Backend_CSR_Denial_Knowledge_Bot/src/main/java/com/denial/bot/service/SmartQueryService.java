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
    private final RestTemplate nvidiaRestTemplate;
    private final Map<String, CachedResponse> responseCache = new ConcurrentHashMap<>();

    @Value("${smart.ml.api.base-url:http://localhost:5004}")
    private String mlApiBaseUrl;

    @Value("${smart.llm.api.url:}")
    private String llmApiUrl;

    @Value("${smart.llm.api.key:}")
    private String llmApiKey;

    @Value("${smart.llm.model:meta/llama-3.1-8b-instruct}")
    private String llmModel;

    @Value("${smart.llm.temperature:0.2}")
    private double llmTemperature;

    @Value("${smart.llm.top-p:0.95}")
    private double llmTopP;

    @Value("${smart.llm.max-tokens:250}")
    private int llmMaxTokens;

    @Value("${smart.llm.reasoning-budget:0}")
    private int llmReasoningBudget;

    @Value("${smart.llm.enable-thinking:false}")
    private boolean llmEnableThinking;

    @Value("${smart.recommendation.use-llm:false}")
    private boolean useLlmForSuggestions;

    public SmartQueryService(RestTemplateBuilder builder) {
        // Local ML API: short timeouts (fast local service)
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
        // NVIDIA cloud API: longer timeouts (reasoning models can take 30-60s+)
        this.nvidiaRestTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(15))
                .setReadTimeout(Duration.ofSeconds(120))
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
     * Sends a query to the ML API or NVIDIA LLM with retry logic.
     */
    public Map<String, Object> processQuery(String query, String queryType, Map<String, Object> medicalContext, String model) {
        try {
            // 1. Fetch result and classification from the local trained model first
            Map<String, Object> trainedResult = processQueryWithTrainedModel(query, queryType, medicalContext);
            if (trainedResult == null || !Boolean.TRUE.equals(trainedResult.get("success"))) {
                return trainedResult;
            }

            Object innerResponse = trainedResult.get("response");
            Map<?, ?> localResp = null;
            String detectedType = "general";
            if (innerResponse instanceof Map) {
                localResp = (Map<?, ?>) innerResponse;
                detectedType = String.valueOf(localResp.get("query_type"));
            }

            // 2. Routing logic:
            // - If the user selected the trained model, OR if the query is denial-oriented: use the trained model result directly!
            boolean useTrainedModel = !"nvidia".equalsIgnoreCase(model) || "denial_lookup".equalsIgnoreCase(detectedType);

            if (useTrainedModel) {
                trainedResult.put("model_used", "trained");
                return trainedResult;
            }

            // - Otherwise (general queries, member_lookup, plan_lookup), use NVIDIA!
            if (llmApiKey == null || llmApiKey.isBlank()) {
                logger.warn("⚠️ NVIDIA API Key is not set. Falling back to Trained Model.");
                if (innerResponse instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> innerMap = (Map<String, Object>) innerResponse;
                    innerMap.put("warning", "NVIDIA API Key is not configured. Automatically fell back to the local trained model.");
                }
                trainedResult.put("model_used", "trained");
                return trainedResult;
            }

            try {
                return processQueryWithNvidia(query, detectedType, localResp, medicalContext);
            } catch (Exception ex) {
                logger.error("❌ NVIDIA LLM call failed, falling back to trained model: {}", ex.getMessage());
                if (innerResponse instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> innerMap = (Map<String, Object>) innerResponse;
                    innerMap.put("warning", "NVIDIA LLM query failed. Automatically fell back to the local trained model. Error: " + ex.getMessage());
                }
                trainedResult.put("model_used", "trained");
                return trainedResult;
            }
        } catch (Exception e) {
            logger.error("❌ Query processing failed: {}", e.getMessage());
            return createErrorResponse("Failed to process query: " + e.getMessage());
        }
    }

    private Map<String, Object> processQueryWithTrainedModel(String query, String queryType, Map<String, Object> medicalContext) {
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
    }

    private Map<String, Object> processQueryWithNvidia(String query, String queryType, Map<?, ?> localResp, Map<String, Object> medicalContext) {
        // 1. Fetch context from local response (only for structured plan/member lookups)
        String contextText = "";
        if (localResp != null) {
            if ("member_lookup".equals(queryType) || "plan_lookup".equals(queryType)) {
                contextText = formatTrainedResponseAsContext(localResp);
            }
        }

        // 2. Call NVIDIA NIM chat completion
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(llmApiKey);

        String systemPrompt = "You are a helpful and intelligent Customer Service Representative (CSR) denial knowledge assistant.\n";
        if ("member_lookup".equals(queryType) || "plan_lookup".equals(queryType)) {
            systemPrompt += "Your job is to assist with healthcare claims, denial codes, and plan coverage queries.\n"
                    + "Answer the user query accurately and concisely based on the local database context provided below.\n"
                    + "If the local database context contains denial codes or member details, use them as your primary source of truth.\n"
                    + "Format your response clearly. Keep responses professional, structured, and easy to read.";
        } else {
            systemPrompt += "You can answer general questions, greetings, definitions (like copay, deductible, premium), and help the user navigate healthcare queries.\n"
                    + "Keep your response friendly, clear, and professional.";
        }

        String userContent = "";
        if (!contextText.isEmpty()) {
            userContent += "[Local Database Context]\n" + contextText + "\n\n";
        }
        userContent += "[User Query]\n" + query;

        Map<String, Object> body = new HashMap<>();
        body.put("model", llmModel);
        body.put("temperature", llmTemperature);
        body.put("top_p", llmTopP);
        body.put("max_tokens", llmMaxTokens);
        body.put("stream", false);
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userContent)
        ));

        if (llmEnableThinking || llmReasoningBudget > 0) {
            Map<String, Object> chatTemplateKwargs = new HashMap<>();
            chatTemplateKwargs.put("enable_thinking", llmEnableThinking);
            body.put("chat_template_kwargs", chatTemplateKwargs);
            if (llmReasoningBudget > 0) {
                body.put("reasoning_budget", llmReasoningBudget);
            }
        }

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        long startTime = System.currentTimeMillis();
        ResponseEntity<Map> apiResponse = nvidiaRestTemplate.exchange(llmApiUrl, HttpMethod.POST, request, Map.class);
        long duration = System.currentTimeMillis() - startTime;
        logger.info("✅ NVIDIA API responded in {}ms", duration);

        if (apiResponse.getStatusCode().is2xxSuccessful() && apiResponse.getBody() != null) {
            Map<?, ?> responseBody = apiResponse.getBody();
            Object choices = responseBody.get("choices");
            if (choices instanceof List<?> choiceList && !choiceList.isEmpty()
                    && choiceList.get(0) instanceof Map<?, ?> firstChoice) {
                Object message = firstChoice.get("message");
                if (message instanceof Map<?, ?> messageMap) {
                    String content = String.valueOf(messageMap.get("content"));

                    // Strip <think>...</think> reasoning tags from response content
                    content = stripThinkingTags(content);

                    Map<String, Object> finalResponse = new HashMap<>();
                    finalResponse.put("success", true);

                    Map<String, Object> enrichedPayload = new HashMap<>();
                    if (localResp != null) {
                        for (Map.Entry<?, ?> entry : localResp.entrySet()) {
                            if (entry.getKey() instanceof String) {
                                enrichedPayload.put((String) entry.getKey(), entry.getValue());
                            }
                        }

                        String type = String.valueOf(localResp.get("type"));
                        if ("denial_explanation".equals(type)) {
                            Object matchesObj = localResp.get("matches");
                            if (matchesObj instanceof List && !((List<?>) matchesObj).isEmpty()) {
                                List<?> matches = (List<?>) matchesObj;
                                List<Map<String, Object>> newMatches = new ArrayList<>();
                                for (int i = 0; i < matches.size(); i++) {
                                    Object matchObj = matches.get(i);
                                    if (matchObj instanceof Map) {
                                        Map<String, Object> newMatch = new HashMap<>();
                                        for (Map.Entry<?, ?> entry : ((Map<?, ?>) matchObj).entrySet()) {
                                            if (entry.getKey() instanceof String) {
                                                newMatch.put((String) entry.getKey(), entry.getValue());
                                            }
                                        }
                                        if (i == 0) {
                                            newMatch.put("description", content);
                                        }
                                        newMatches.add(newMatch);
                                    }
                                }
                                enrichedPayload.put("matches", newMatches);
                            } else {
                                Map<String, Object> newMatch = new HashMap<>();
                                newMatch.put("code", extractDenialCode(query));
                                newMatch.put("description", content);
                                newMatch.put("action", "Please check claim details and policy guidelines.");
                                enrichedPayload.put("matches", List.of(newMatch));
                            }
                        } else if ("plan_coverage".equals(type) || "member_coverage".equals(type)) {
                            enrichedPayload.put("coverage_answer", content);
                        } else if ("member_info".equals(type)) {
                            enrichedPayload.put("llm_reasoning", content);
                        } else {
                            enrichedPayload.put("answer", content);
                            enrichedPayload.put("type", "general_answer");
                        }
                    } else {
                        enrichedPayload.put("answer", content);
                        enrichedPayload.put("type", "general_answer");
                    }

                    finalResponse.put("response", enrichedPayload);
                    finalResponse.put("processing_time_ms", duration);
                    finalResponse.put("model_used", "nvidia");
                    return finalResponse;
                }
            }
        }
        throw new RestClientException("NVIDIA API call did not return a valid completion");
    }

    private String formatTrainedResponseAsContext(Map<?, ?> respMap) {
        StringBuilder sb = new StringBuilder();
        String type = String.valueOf(respMap.get("type"));
        sb.append("Trained Model Classification Type: ").append(type).append("\n");

        if ("denial_explanation".equals(type) || respMap.containsKey("matches")) {
            sb.append("Local Database Matches:\n");
            Object matchesObj = respMap.get("matches");
            if (matchesObj instanceof List) {
                List<?> matches = (List<?>) matchesObj;
                for (Object matchObj : matches) {
                    if (matchObj instanceof Map) {
                        Map<?, ?> match = (Map<?, ?>) matchObj;
                        sb.append("- Code: ").append(match.get("code"))
                          .append(", Description: ").append(match.get("description"))
                          .append(", Action: ").append(match.get("action")).append("\n");
                    }
                }
            }
        } else if ("plan_coverage".equals(type) || "member_coverage".equals(type) || respMap.containsKey("plan_details")) {
            sb.append("Local Database Member & Plan Details:\n");
            sb.append("Member ID: ").append(respMap.get("member_id")).append("\n");
            sb.append("Member Name: ").append(respMap.get("member_name")).append("\n");
            sb.append("Status: ").append(respMap.get("status")).append("\n");
            sb.append("Plan ID: ").append(respMap.get("plan_id")).append("\n");
            sb.append("Effective Date: ").append(respMap.get("effective_date")).append("\n");
            sb.append("End Date: ").append(respMap.get("end_date")).append("\n");
            Object planDetailsObj = respMap.get("plan_details");
            if (planDetailsObj instanceof Map) {
                Map<?, ?> pd = (Map<?, ?>) planDetailsObj;
                sb.append("Coverage Type: ").append(pd.get("coverage_type")).append("\n");
                sb.append("Covered Services: ").append(pd.get("covered_services")).append("\n");
                sb.append("Copay: ").append(pd.get("copay")).append("\n");
                if (pd.get("notes") != null) {
                    sb.append("Notes: ").append(pd.get("notes")).append("\n");
                }
            }
            if (respMap.containsKey("coverage_answer")) {
                sb.append("Pre-calculated coverage answer: ").append(respMap.get("coverage_answer")).append("\n");
            }
        } else if ("member_info".equals(type) || respMap.containsKey("member")) {
            sb.append("Local Database Member Info:\n");
            Object memberObj = respMap.get("member");
            if (memberObj instanceof Map) {
                Map<?, ?> member = (Map<?, ?>) memberObj;
                sb.append("Member ID: ").append(member.get("member_id")).append("\n");
                sb.append("Member Name: ").append(member.get("member_name")).append("\n");
                sb.append("Status: ").append(member.get("status")).append("\n");
                sb.append("Plan ID: ").append(member.get("plan_id")).append("\n");
            }
        } else if (respMap.containsKey("answer")) {
            sb.append("Local Database Answer: ").append(respMap.get("answer")).append("\n");
        }
        return sb.toString();
    }

    private String extractDenialCode(String query) {
        if (query == null) return "Code";
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\b([A-Z]{2,3})\\s*[- ]?\\s*(\\d{1,3})\\b", java.util.regex.Pattern.CASE_INSENSITIVE);
        java.util.regex.Matcher matcher = pattern.matcher(query);
        if (matcher.find()) {
            return (matcher.group(1) + matcher.group(2)).toUpperCase();
        }
        return "Code";
    }

    /**
     * Strip &lt;think&gt;...&lt;/think&gt; reasoning blocks from NVIDIA model responses.
     * When enable_thinking is true, the Nemotron model returns its reasoning
     * process wrapped in these tags before the actual answer.
     */
    private String stripThinkingTags(String content) {
        if (content == null || content.isEmpty()) return content;
        // Remove <think>...</think> blocks (including multiline content)
        String stripped = content.replaceAll("(?s)<think>.*?</think>", "").trim();
        // If stripping removed everything, return original content
        return stripped.isEmpty() ? content : stripped;
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

            if (useLlmForSuggestions && hasLlmConfig()) {
                merged.addAll(generateLlmSuggestions(normalizedInput, medicalContext, safeLimit * 2));
            }

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

    private boolean hasLlmConfig() {
        return llmApiUrl != null && !llmApiUrl.isBlank()
                && llmApiKey != null && !llmApiKey.isBlank();
    }

    private List<String> generateLlmSuggestions(String input, Map<String, Object> medicalContext, int limit) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(llmApiKey);

            String prompt = """
                    Generate short healthcare claim denial query suggestions.
                    Return only a JSON array of strings, no markdown.
                    Input prefix: %s
                    Context: %s
                    Limit: %d
                    """.formatted(
                    input == null ? "" : input,
                    medicalContext == null ? Map.of() : medicalContext,
                    limit);

            Map<String, Object> body = new HashMap<>();
            body.put("model", llmModel);
            body.put("temperature", llmTemperature);
            body.put("top_p", llmTopP);
            body.put("max_tokens", llmMaxTokens);
            body.put("stream", false);
            body.put("messages", List.of(
                    Map.of("role", "system", "content",
                            "You help generate safe, non-diagnostic query suggestions for healthcare claims operations."),
                    Map.of("role", "user", "content", prompt)));
            if (llmEnableThinking || llmReasoningBudget > 0) {
                Map<String, Object> chatTemplateKwargs = new HashMap<>();
                chatTemplateKwargs.put("enable_thinking", llmEnableThinking);
                body.put("chat_template_kwargs", chatTemplateKwargs);
                if (llmReasoningBudget > 0) {
                    body.put("reasoning_budget", llmReasoningBudget);
                }
            }

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = nvidiaRestTemplate.exchange(llmApiUrl, HttpMethod.POST, request, Map.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return List.of();
            }

            Object choices = response.getBody().get("choices");
            if (choices instanceof List<?> choiceList && !choiceList.isEmpty()
                    && choiceList.get(0) instanceof Map<?, ?> firstChoice) {
                Object message = firstChoice.get("message");
                if (message instanceof Map<?, ?> messageMap) {
                    Object content = messageMap.get("content");
                    return parseSuggestionContent(String.valueOf(content), limit);
                }
            }

            return List.of();
        } catch (Exception ex) {
            logger.warn("LLM suggestion call failed, falling back to retrieval-only recommendations: {}",
                    ex.getMessage());
            return List.of();
        }
    }

    private List<String> parseSuggestionContent(String content, int limit) {
        if (content == null || content.isBlank()) {
            return List.of();
        }

        String normalized = content.trim()
                .replaceAll("^```(?:json)?", "")
                .replaceAll("```$", "")
                .trim();

        if (normalized.startsWith("[") && normalized.endsWith("]")) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }

        return List.of(normalized.split("\\r?\\n|,(?=\\s*\\\")"))
                .stream()
                .map(item -> item.replaceAll("^[\\s\\d.\\-\\[\\]\"]+", "")
                        .replaceAll("[\\s\\]\"]+$", "")
                        .trim())
                .filter(item -> !item.isBlank())
                .limit(limit)
                .collect(Collectors.toList());
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
