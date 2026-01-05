package com.denial.bot.repository;

import com.denial.bot.entity.Conversation;
import com.denial.bot.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findByUser(User user);
    List<Conversation> findByUserAndOutputType(User user, String outputType);
    @Query("SELECT c FROM Conversation c WHERE c.user = :user AND c.createdAt BETWEEN :start AND :end")
    List<Conversation> findByUserAndDateRange(User user, Date start, Date end);

}
