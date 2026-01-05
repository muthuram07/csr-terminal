package com.denial.bot.model;

import lombok.*;

/**
 * Login response DTO.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String username;
    private String message;
    private boolean success;

    @Override
    public String toString() {
        return "LoginResponse{" +
                "token='" + (token == null ? null : "[PROTECTED]") + '\'' +
                ", username='" + username + '\'' +
                ", message='" + message + '\'' +
                ", success=" + success +
                '}';
    }
}
