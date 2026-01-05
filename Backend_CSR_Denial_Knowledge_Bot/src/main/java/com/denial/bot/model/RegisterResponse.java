package com.denial.bot.model;

import lombok.*;

/**
 * Registration response DTO.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterResponse {
    private boolean success;
    private String message;
    private String username;
    private String email;

    public RegisterResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    @Override
    public String toString() {
        return "RegisterResponse{" +
                "success=" + success +
                ", message='" + message + '\'' +
                ", username='" + username + '\'' +
                ", email='" + (email == null ? null : "[PROTECTED]") + '\'' +
                '}';
    }
}
