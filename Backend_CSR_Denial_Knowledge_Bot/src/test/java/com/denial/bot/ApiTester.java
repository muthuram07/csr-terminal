package com.denial.bot;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class ApiTester {

    private static final String BASE_URL = "http://localhost:8081";
    private static final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public static void main(String[] args) {
        System.out.println("=== Denial Knowledge Bot API Tester ===");
        System.out.println("🗄️  H2 Database: Real User Registration & Login");
        System.out.println("💾 Denial Knowledge: Hardcoded (Future AI Model)");
        System.out.println("🔄 Flow: Register → Sign In → Chat");
        System.out.println();

        try {
            // Test 1: Health Check
            testHealthCheck();

            // Test 2: Check initial database stats
            testDatabaseStats();

            // Test 3: Test User Registration
            testUserRegistration();

            // Test 4: Test Login with registered user (manual step after registration)
            String token = testLogin("testuser1", "password123");
            if (token != null) {
                // Test 5: Test denial functionality
                testDenialSubmissions(token);
                
                // Test 6: Test logout
                testLogout(token);
            }

            // Test 7: Test registration validation
            testRegistrationValidation();

            // Test 8: Check final database stats
            testDatabaseStats();

        } catch (Exception e) {
            System.err.println("Error during testing: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private static void testHealthCheck() throws IOException, InterruptedException {
        System.out.println("1. Testing Health Check...");
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/api/denial/health"))
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        System.out.println("   Status: " + response.statusCode());
        System.out.println("   Response: " + response.body());
        System.out.println("   ✅ Health Check Complete\n");
    }

    private static void testDatabaseStats() throws IOException, InterruptedException {
        System.out.println("2. Testing Database Stats...");
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/api/auth/stats"))
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        System.out.println("   Status: " + response.statusCode());
        System.out.println("   " + response.body());
        System.out.println("   ✅ Database Stats Complete\n");
    }

    private static void testUserRegistration() throws IOException, InterruptedException {
        System.out.println("3. Testing User Registration (No Auto-Login)...");
        
        // Test data for registration
        String[] testUsers = {
            "testuser1|test1@example.com|password123",
            "testuser2|test2@example.com|password123",
            "adminuser|admin@example.com|adminpass123"
        };

        for (String userData : testUsers) {
            String[] parts = userData.split("\\|");
            String username = parts[0];
            String email = parts[1];
            String password = parts[2];
            
            System.out.println("   Registering: " + username + " (" + email + ")");
            
            String registrationPayload = """
                {
                    "username": "%s",
                    "email": "%s",
                    "password": "%s"
                }
                """.formatted(username, email, password);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/api/auth/register"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(registrationPayload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                System.out.println("   ✅ " + username + " registered successfully (Frontend will redirect to sign-in)");
            } else {
                System.out.println("   ❌ " + username + " registration failed: " + response.body());
            }
        }
        System.out.println("   ✅ User Registration Test Complete\n");
    }

    private static void testRegistrationValidation() throws IOException, InterruptedException {
        System.out.println("7. Testing Registration Validation...");
        
        // Test duplicate username
        System.out.println("   Testing duplicate username...");
        String duplicateUsernamePayload = """
            {
                "username": "testuser1",
                "email": "newemail@example.com",
                "password": "password123"
            }
            """;

        HttpRequest request1 = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/api/auth/register"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(duplicateUsernamePayload))
                .build();

        HttpResponse<String> response1 = client.send(request1, HttpResponse.BodyHandlers.ofString());
        
        if (response1.statusCode() == 400) {
            System.out.println("   ✅ Duplicate username validation working");
        } else {
            System.out.println("   ❌ Duplicate username validation failed");
        }

        // Test duplicate email
        System.out.println("   Testing duplicate email...");
        String duplicateEmailPayload = """
            {
                "username": "newusername",
                "email": "test1@example.com",
                "password": "password123"
            }
            """;

        HttpRequest request2 = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/api/auth/register"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(duplicateEmailPayload))
                .build();

        HttpResponse<String> response2 = client.send(request2, HttpResponse.BodyHandlers.ofString());
        
        if (response2.statusCode() == 400) {
            System.out.println("   ✅ Duplicate email validation working");
        } else {
            System.out.println("   ❌ Duplicate email validation failed");
        }

        System.out.println("   ✅ Registration Validation Test Complete\n");
    }

    private static String testLogin(String username, String password) throws IOException, InterruptedException {
        System.out.println("4. Testing Manual Login for: " + username + "...");
        
        String loginPayload = """
            {
                "username": "%s",
                "password": "%s"
            }
            """.formatted(username, password);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/api/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(loginPayload))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        System.out.println("   Status: " + response.statusCode());
        System.out.println("   Response: " + response.body());
        
        if (response.statusCode() == 200) {
            // Extract token
            String responseBody = response.body();
            int tokenStart = responseBody.indexOf("\"token\":\"") + 9;
            int tokenEnd = responseBody.indexOf("\"", tokenStart);
            String token = responseBody.substring(tokenStart, tokenEnd);
            
            System.out.println("   🔑 Token extracted successfully");
            System.out.println("   ✅ Login Test Complete\n");
            return token;
        } else {
            System.out.println("   ❌ Login failed\n");
            return null;
        }
    }

    private static void testDenialSubmissions(String token) throws IOException, InterruptedException {
        System.out.println("5. Testing Denial Submissions (Hardcoded Knowledge Base)...");
        
        String[] denialCodes = {"D001", "D002", "D003", "D004", "D005", "D999"};
        
        for (String code : denialCodes) {
            String payload = """
                {
                    "denialCode": "%s",
                    "additionalDescription": "Test description for %s"
                }
                """.formatted(code, code);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/api/denial/submit"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            System.out.println("   Code " + code + ": Status: " + response.statusCode());
            
            if (response.statusCode() == 200) {
                String body = response.body();
                // Extract title from response
                int titleStart = body.indexOf("\"title\":\"") + 9;
                int titleEnd = body.indexOf("\"", titleStart);
                if (titleStart > 8 && titleEnd > titleStart) {
                    String title = body.substring(titleStart, titleEnd);
                    System.out.println("        Response: " + title);
                }
            }
        }
        
        System.out.println("   ✅ Denial Submissions Test Complete\n");
    }

    private static void testLogout(String token) throws IOException, InterruptedException {
        System.out.println("6. Testing Logout...");
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/api/auth/logout"))
                .header("Authorization", "Bearer " + token)
                .POST(HttpRequest.BodyPublishers.ofString("{}"))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        System.out.println("   Status: " + response.statusCode());
        System.out.println("   Response: " + response.body());
        System.out.println("   ✅ Logout Test Complete\n");
    }
} 