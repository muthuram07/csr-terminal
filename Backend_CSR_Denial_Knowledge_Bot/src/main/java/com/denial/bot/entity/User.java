package com.denial.bot.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * User entity representing application users.
 *
 * Keeps a direct constructor with signature (String, String, String, String, boolean)
 * so existing code that instantiates new User(...) compiles reliably.
 */
@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_users_username", columnList = "username"),
        @Index(name = "idx_users_email", columnList = "email")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    private String username;

    @Column(unique = true, nullable = false, length = 150)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String role;

    @Column(nullable = false)
    private boolean active;

    /**
     * Explicit convenience constructor used in services/controllers:
     * new User(username, email, password, role, active)
     */
    public User(String username, String email, String password, String role, boolean active) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.role = role;
        this.active = active;
    }
}
