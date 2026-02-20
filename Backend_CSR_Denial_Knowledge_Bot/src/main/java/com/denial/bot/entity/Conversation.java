package com.denial.bot.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * Conversation entity represents a single exchange between a user and the AI.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Entity
@Table(name = "conversations", indexes = {
        @Index(name = "idx_conversation_user_bucket", columnList = "user_id, bucket_date_id"),
        @Index(name = "idx_conversation_user_created", columnList = "user_id, created_at")
})
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(name = "user_input", columnDefinition = "TEXT", nullable = false)
    private String userInput;

    @Column(name = "ai_output", columnDefinition = "TEXT", nullable = false)
    private String aiOutput;

    @Column(name = "output_type", nullable = false)
    private String outputType;

    /**
     * Daily partition bucket in user's local date format: YYYY-MM-DD
     */
    @Column(name = "bucket_date_id", nullable = false, length = 10)
    private String bucketDateId;

    @Column(name = "timezone_offset_minutes", nullable = false)
    private Integer timezoneOffsetMinutes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.timezoneOffsetMinutes == null) {
            this.timezoneOffsetMinutes = 0;
        }
        if (this.bucketDateId == null || this.bucketDateId.isBlank()) {
            this.bucketDateId = "1970-01-01";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
