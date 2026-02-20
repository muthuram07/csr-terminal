package com.denial.bot.repository;

import com.denial.bot.entity.Conversation;
import com.denial.bot.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    List<Conversation> findByUserOrderByCreatedAtDesc(User user);

    List<Conversation> findByUserAndOutputTypeOrderByCreatedAtDesc(User user, String outputType);

    @Query("""
            SELECT c FROM Conversation c
            WHERE c.user = :user
              AND c.bucketDateId >= :startBucket
              AND c.bucketDateId <= :endBucket
            ORDER BY c.createdAt DESC
            """)
    List<Conversation> findByUserAndBucketRange(User user, String startBucket, String endBucket);

    @Query("""
            SELECT c FROM Conversation c
            WHERE c.user = :user
              AND c.createdAt BETWEEN :start AND :end
            ORDER BY c.createdAt DESC
            """)
    List<Conversation> findByUserAndDateRange(User user, Instant start, Instant end);

}
