package com.denial.bot.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.denial.bot.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    /**
     * Find user by username
     * @param username the username to search for
     * @return Optional containing user if found
     */
    Optional<User> findByUsername(String username);
    
    /**
     * Find user by email
     * @param email the email to search for
     * @return Optional containing user if found
     */
    Optional<User> findByEmail(String email);
    
    /**
     * Find user by username and active status
     * @param username the username to search for
     * @param active the active status
     * @return Optional containing user if found
     */
    Optional<User> findByUsernameAndActive(String username, boolean active);
    
    /**
     * Find user by email and active status
     * @param email the email to search for
     * @param active the active status
     * @return Optional containing user if found
     */
    Optional<User> findByEmailAndActive(String email, boolean active);
    
    /**
     * Check if username exists
     * @param username the username to check
     * @return true if username exists
     */
    boolean existsByUsername(String username);
    
    /**
     * Check if email exists
     * @param email the email to check
     * @return true if email exists
     */
    boolean existsByEmail(String email);
} 