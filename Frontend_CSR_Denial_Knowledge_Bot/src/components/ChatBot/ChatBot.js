import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/apiService';
import './ChatBot.css';

function ChatBot() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const initializedRef = useRef(false);
  const messageIdRef = useRef(0); // Unique ID counter for messages

  // Chat state
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedModel, setSelectedModel] = useState('nvidia');

  // Generate unique message IDs to prevent duplicate key warnings
  const generateMessageId = useCallback(() => {
    return `msg-${Date.now()}-${++messageIdRef.current}`;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addBotMessage = useCallback((text, type = 'text', options = null) => {
    // Clean response inline to avoid dependency issues
    const cleanText = typeof text === 'string' ? text.replace(/\*\*/g, '').replace(/\*/g, '') : text;

    const message = {
      id: generateMessageId(),
      text: cleanText,
      sender: 'bot',
      timestamp: new Date(),
      type,
      options,
      modelUsed: options?.modelUsed || null
    };
    setMessages(prev => [...prev, message]);
  }, [generateMessageId]);

  // Initialize chat with welcome message
  useEffect(() => {
    // Only initialize once to prevent duplicates
    if (!initializedRef.current) {
      initializedRef.current = true;

      // Add welcome messages as chat messages
      const welcomeMessage = {
        id: generateMessageId(),
        text: "👋 Hello! I'm your Smart CSR Knowledge Bot assistant. I can help you with denial codes and plan coverage queries.",
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };

      const examplesMessage = {
        id: generateMessageId(),
        text: "💡 Just type your question!\n\nFor example:\n\n🔹 \"What does denial code CO-45 mean?\"\n🔹 \"Is dental covered for member M12345?\"\n🔹 \"Why was my claim rejected with code 96?\"",
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages([welcomeMessage, examplesMessage]);
    }
  }, [generateMessageId]);
  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const onUnauthorized = async () => {
      await logout();
      navigate('/signin');
    };

    window.addEventListener('unauthorized', onUnauthorized);
    return () => window.removeEventListener('unauthorized', onUnauthorized);
  }, [logout, navigate]);

  const addUserMessage = (text) => {
    const message = {
      id: generateMessageId(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  /*
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const input = currentInput.trim();
      if (!input || isTyping) {
        setRecommendations([]);
        setShowRecommendations(false);
        return;
      }

      try {
        // Check if authenticated
        if (!apiService.isAuthenticated()) {
          setRecommendations([]);
          return;
        }

        // Get recommendations using the new API service
        const response = await apiService.post('/api/smart/recommendations', {
          input,
          limit: 5,
          medicalContext: {
            lastUserMessage: messages.filter(m => m.sender === 'user').slice(-1)[0]?.text || ''
          }
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setRecommendations(data.suggestions || []);
          setShowRecommendations(true);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setRecommendations([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [currentInput, isTyping, messages]);
  */



  // Helper: Normalize API responses to our structured UI types so styling applies consistently
  const normalizeResponse = (rawResult, userQuery) => {
    // 1) Extract possible payload containers
    let payload = null;
    if (rawResult) {
      payload = rawResult.response ?? rawResult.data ?? rawResult.result ?? rawResult.output ?? rawResult;
    }
    if (!payload) return null;

    const warningText = rawResult?.warning || rawResult?.response?.warning || payload?.warning;
    const wrap = (val) => {
      if (warningText && typeof val === 'string') {
        return {
          type: 'general-text-structured',
          data: {
            answer: val,
            warning: warningText
          }
        };
      }
      return val;
    };

    // 2) If string looks like JSON, attempt to parse once safely
    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          payload = JSON.parse(trimmed);
        } catch (_) {
          // keep as string if parsing fails
        }
      }
    }

    // 3) If nested again inside a 'response' after parsing, unwrap
    if (payload && typeof payload === 'object' && payload.response) {
      payload = payload.response;
    }
    // Some responses wrap member details under payload.member.
    if (payload && typeof payload === 'object' && payload.type === 'member_info' && payload.member) {
      payload = { ...payload, ...payload.member };
    }

    // If backend returned a plain string, try to infer a denial explanation structure
    if (typeof payload === 'string') {
      const text = payload;
      // Try to infer a plan coverage structured response from plain text FIRST
      const memberMatch = text.match(/Member\s*[:-]?\s*([^(\n]+)\s*\((M\d+)\)/i) || text.match(/Member\s*[:-]?\s*([^\n]+)/i);
      const member_name = memberMatch ? (memberMatch[1] || '').trim() : undefined;
      const member_id = (text.match(/\bM\d+\b/i)?.[0] || (memberMatch && memberMatch[2])) || undefined;
      const planIdMatch = text.match(/Plan\s*ID\b[^A-Za-z0-9]*([A-Za-z0-9_-]+)/i);
      const plan_id = planIdMatch ? planIdMatch[1] : undefined;
      const typeMatch = text.match(/\b(HMO|PPO|EPO|POS)\b/i);
      const coverage_type = typeMatch ? typeMatch[1] : undefined;
      const servicesMatch = text.match(/Covered\s*Services\s*[:-]?\s*([^\n]+)/i) || text.match(/Services\s*[:-]?\s*([^\n]+)/i);
      const covered_services = servicesMatch ? servicesMatch[1].trim() : undefined;
      const copayMatch = text.match(/Copay[^:\n]*[:-]?\s*([^\n]+)/i);
      const copay = copayMatch ? copayMatch[1].trim() : undefined;
      const periodMatch = text.match(/(?:effective|coverage)\s*periods?\s*[:-]?\s*([\d/–—'-]+)\s*to\s*([\d/–—'-]+)/i);
      const effective_date = periodMatch ? periodMatch[1].replace(/[’']/g, '-') : undefined;
      const end_date = periodMatch ? periodMatch[2].replace(/[’']/g, '-') : undefined;

      // Infer coverage answer from the user query and covered services
      let coverage_answer;
      const serviceQueryMatch = userQuery.match(/is\s+([a-z\s]+?)\s+covered/i);
      const queriedService = serviceQueryMatch ? serviceQueryMatch[1].trim().toLowerCase() : undefined;
      if (queriedService && covered_services) {
        const normalizedServices = covered_services.toLowerCase();
        coverage_answer = normalizedServices.includes(queriedService)
          ? `Yes, ${queriedService} is covered.`
          : `No, ${queriedService} is not covered.`;
      }

      const hasPlanSignals = member_name || member_id || plan_id || covered_services || copay || coverage_type;
      if (hasPlanSignals) {
        return {
          type: 'plan-result-structured',
          data: {
            coverage_answer: coverage_answer || 'Coverage details found.',
            effective_date,
            end_date,
            member_id,
            member_name,
            plan_details: {
              copay: copay || 'N/A',
              coverage_type: coverage_type || 'N/A',
              covered_services: covered_services || 'N/A',
              notes: undefined,
            },
            plan_id: plan_id || 'N/A',
            status: undefined,
            type: 'member_coverage',
          },
        };
      }

      // If not plan-like, try to infer a denial explanation structure
      const codeFromQuery = userQuery.match(/\b[A-Za-z]{1,3}-?\d{1,3}\b/i)?.[0] || '';
      const codeFromText = text.match(/\b(?:CO|PR|PI|OA|CR|N)-?\d{1,3}\b/i)?.[0] || '';
      const inferredCode = codeFromQuery || codeFromText;

      const actionMatch = text.match(/(?:recommended\s*action|suggested\s*action|next\s*steps|action)\s*[:-]?\s*([\s\S]+)/i);
      const beforeAction = actionMatch ? text.slice(0, actionMatch.index).trim() : text.trim();
      const description = beforeAction
        .replace(/^\s*(denial\s*code[^:]*[:-]?)/i, '')
        .replace(/^\s*(code[^:]*[:-]?)/i, '')
        .replace(/^\s*means\s*[:-]?\s*/i, '')
        .trim();
      const suggested = actionMatch ? (actionMatch[1] || '').trim() : '';

      if (inferredCode || suggested || /denial\s*code/i.test(text)) {
        return {
          type: 'denial-result-structured',
          data: {
            denial_code: inferredCode || codeFromQuery || codeFromText || 'Code',
            description: description || text,
            suggested_action: suggested,
            original_text: text,
            original_query: userQuery,
          },
        };
      }
    }

    // Denial explanations — handle matches array from ML API
    if (
      payload?.type === 'denial_explanation' ||
      payload?.type === 'denial' ||
      payload?.type === 'denial_lookup' ||
      payload?.denial_code ||
      payload?.explanation ||
      payload?.suggested_action ||
      payload?.description ||
      payload?.reason ||
      payload?.matches
    ) {
      const originalCode = userQuery.match(/\b[A-Za-z]{1,3}-?\d{1,3}\b/)?.[0] || payload.denial_code || payload.code;

      // Handle matches array from ML API (e.g. {matches: [{code, description, action, similarity}], type: "denial_explanation"})
      if (Array.isArray(payload.matches) && payload.matches.length > 0) {
        const bestMatch = payload.matches[0]; // highest similarity is first
        const mapped = {
          denial_code: originalCode || bestMatch.code,
          description: bestMatch.description || bestMatch.explanation || bestMatch.meaning,
          suggested_action: payload.recommendation || bestMatch.action || bestMatch.suggested_action,
        };

        // If multiple matches, include them all for display
        if (payload.matches.length > 1) {
          mapped.all_matches = payload.matches;
        }

        return {
          type: 'denial-result-structured',
          data: { ...mapped, original_query: userQuery, warning: warningText },
        };
      }

      const mapped = {
        denial_code: originalCode,
        description: payload.description || payload.explanation || payload.meaning || payload.reason,
        suggested_action: payload.recommendation || payload.suggested_action || payload.action || payload.next_steps,
      };
      return {
        type: 'denial-result-structured',
        data: { ...payload, ...mapped, original_query: userQuery, warning: warningText },
      };
    }

    // Plan/member coverage
    if (
      payload?.type === 'plan_coverage' ||
      payload?.type === 'member_coverage' ||
      payload?.coverage_answer ||
      payload?.plan_details ||
      payload?.coverageAnswer ||
      payload?.planDetails
    ) {
      // Map camelCase keys if present
      const data = {
        ...payload,
        coverage_answer: payload.coverage_answer ?? payload.coverageAnswer,
        plan_details: payload.plan_details ?? payload.planDetails,
        member_id: payload.member_id ?? payload.memberId,
        member_name: payload.member_name ?? payload.memberName,
        plan_id: payload.plan_id ?? payload.planId,
        effective_date: payload.effective_date ?? payload.effectiveDate,
        end_date: payload.end_date ?? payload.endDate,
        status: payload.status,
      };
      if (!data.coverage_answer && (payload.message || payload.suggestion)) {
        return wrap(`${payload.message || 'Coverage details are unavailable.'}${payload.suggestion ? ` ${payload.suggestion}` : ''}`);
      }
      return { type: 'plan-result-structured', data };
    }

    // Member info
    if (
      payload?.type === 'member_info' ||
      (payload?.member_id && (payload?.member_name || payload?.status)) ||
      (payload?.memberId && (payload?.memberName || payload?.status))
    ) {
      if (payload?.error) {
        return wrap(payload.error);
      }
      const member = payload.member ?? payload;
      const planDetails = member.plan_details ?? member.planDetails ?? {};
      return {
        type: 'plan-result-structured',
        data: {
          coverage_answer: payload.coverage_answer || payload.llm_reasoning || 'Member details found.',
          member_id: member.member_id ?? member.memberId ?? 'N/A',
          member_name: member.member_name ?? member.memberName ?? member.name ?? 'N/A',
          status: member.status ?? 'N/A',
          plan_id: member.plan_id ?? member.planId ?? 'N/A',
          effective_date: member.effective_date ?? member.effectiveDate ?? 'N/A',
          end_date: member.end_date ?? member.endDate ?? 'N/A',
          llm_reasoning: payload.llm_reasoning || (payload.coverage_answer !== 'Member details found.' ? payload.coverage_answer : undefined),
          plan_details: {
            coverage_type: planDetails.coverage_type ?? planDetails.coverageType ?? 'N/A',
            covered_services: planDetails.covered_services ?? planDetails.coveredServices ?? 'N/A',
            copay: planDetails.copay ?? 'N/A',
            notes: planDetails.notes,
          },
          warning: warningText
        },
      };
    }

    // Generated response/help/out of scope passthroughs
    if (payload.type === 'generated_response' && payload.response) {
      return wrap(payload.response);
    }
    if (payload.type === 'general_answer') {
      const answer = payload.answer || 'How can I help you today?';
      const suggestions = Array.isArray(payload.suggested_queries) ? payload.suggested_queries.slice(0, 3) : [];
      if (suggestions.length === 0) {
        return wrap(answer);
      }
      return wrap(`${answer}\n\nTry:\n${suggestions.map((s) => `- ${s}`).join('\n')}`);
    }
    if (payload.type === 'help_response' || payload.type === 'general_help') {
      return wrap(payload.message || payload.response || 'Here to help with denial codes and coverage questions!');
    }
    if (payload.type === 'out_of_scope') {
      return { type: 'out_of_scope', data: { message: payload.message || 'This seems out of scope.' } };
    }

    return typeof payload === 'string' ? wrap(payload) : payload;
  };

  // NEW SMART NLP INPUT HANDLER
  const handleInputSubmit = async (e) => {
    e.preventDefault();

    if (currentInput.trim()) {
      const userQuery = currentInput.trim();
      addUserMessage(userQuery);
      setCurrentInput('');
      setShowRecommendations(false);
      setRecommendations([]);

      // Process query using Smart Query API through Spring Boot backend
      setIsTyping(true);

      try {
        // Check authentication
        if (!apiService.isAuthenticated()) {
          addBotMessage("Please log in to use the smart query feature.");
          setIsTyping(false);
          return;
        }

        // Make the smart query request using the API service
        const response = await apiService.post('/api/smart/query', {
          query: userQuery,
          model: selectedModel,
          timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
          medicalContext: {
            recentMessages: messages.slice(-4).map(m => ({ sender: m.sender, text: typeof m.text === 'string' ? m.text : '' }))
          }
        });

        const result = await response.json();

        if (response.ok && result?.success !== false) {
          const modelUsed = result?.model_used || null;
          const normalized = normalizeResponse(result, userQuery);
          if (normalized) {
            addBotMessage(normalized, 'text', { modelUsed });
          } else {
            addBotMessage(result.response || 'I processed your query successfully.', 'text', { modelUsed });
          }
        } else {
          const errorMessage = result.error || result.message || "I'm having trouble connecting to my smart processing system. Please try again in a moment.";
          addBotMessage(`❌ ${errorMessage}`);
        }
      } catch (error) {
        console.error('Smart Query API Error:', error);
        addBotMessage("❌ I'm having trouble connecting to my smart processing system. Please try again in a moment. 🔄\n\nAlternative: You can still ask me about denial codes, plan coverage, and member information - I'll do my best to help!");
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="chatbot-container">
      {/* Elegant Header */}
      <header className="chatbot-header">
        <div className="header-content">
          <div className="bot-avatar">🤖</div>
          <div className="header-text">
            <h1>CSR Denial Knowledge Bot</h1>
            <p>Your AI Assistant for Instant Answers</p>
          </div>
        </div>

        <div className="header-actions">
          <button onClick={() => navigate('/')} className="header-btn">
            ← Back to Home
          </button>
          <button onClick={handleLogout} className="header-btn">
            Sign Out →
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="chat-area">
        {/* Chat Messages */}
        <div className="chat-messages">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
            />
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="chat-message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="message-text" style={{ fontStyle: 'italic', color: '#64748b' }}>
                  AI is thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="messages-end-spacer" />
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="chat-input-container">
        <form onSubmit={handleInputSubmit} className="chat-input-form">
          <div className="model-selector-container">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="model-select-dropdown"
              disabled={isTyping}
            >
              <option value="nvidia">⚡ NVIDIA Nemotron (Deep Reasoning)</option>
              <option value="trained">🎯 Trained Model (Project Specific)</option>
            </select>
          </div>
          <div className="input-wrapper">
            <textarea
              value={currentInput}
              onChange={(e) => {
                setCurrentInput(e.target.value);
                if (!e.target.value.trim()) {
                  setShowRecommendations(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (currentInput.trim() && !isTyping) {
                    handleInputSubmit(e);
                  }
                }
              }}
              placeholder="Ask about denial codes, plan coverage, or member information..."
              className="chat-input"
              disabled={isTyping}
              autoComplete="off"
              rows="1"
              style={{ resize: 'none', overflow: 'hidden' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            {showRecommendations && recommendations.length > 0 && (
              <div className="recommendations-dropdown">
                {recommendations.map((suggestion, idx) => (
                  <button
                    key={`${suggestion}-${idx}`}
                    type="button"
                    className="recommendation-item"
                    onClick={() => {
                      setCurrentInput(suggestion);
                      setShowRecommendations(false);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="send-button"
            disabled={!currentInput.trim() || isTyping}
          >
            {isTyping ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                <span>Ask</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Chat Message Component
function ChatMessage({ message }) {

  if (message.sender === 'user') {
    return (
      <div className="chat-message user">
        <div className="message-avatar">👤</div>
        <div className="message-content">
          <div className="message-text">{message.text}</div>
        </div>
      </div>
    );
  }

  // Bot message handling
  return (
    <div className="chat-message assistant">
      <div className="message-avatar">🤖</div>
      <div className="message-content">
        {message.modelUsed && (
          <div className={`model-badge ${message.modelUsed === 'nvidia' ? 'model-badge-nvidia' : 'model-badge-trained'}`}>
            {message.modelUsed === 'nvidia' ? '⚡ NVIDIA Nemotron' : '🎯 Trained Model'}
          </div>
        )}
        {message.text?.type === 'general-text-structured' ? (
          <div className="structured-response" style={{ maxWidth: '600px', display: 'block' }}>
            <div className="message-text" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
              {typeof message.text.data.answer === 'string' ? message.text.data.answer.split('\n').map((line, index) => (
                <div key={index}>{line}</div>
              )) : String(message.text.data.answer)}
            </div>
            {message.text.data.warning && (
              <div className="warning-section" style={{
                background: '#fef3cd',
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>⚠️</span>
                <span style={{ color: '#92400e', fontSize: '0.85rem' }}>{message.text.data.warning}</span>
              </div>
            )}
          </div>
        ) : message.text?.type === 'member-result-structured' ? (
          <div className="structured-response">
            <div className="response-header">
              <span>📋</span>
              <h3 className="response-title">Plan & Coverage Query Results</h3>
            </div>

            <div className="coverage-answer">
              {message.text.data.coverage_answer}
            </div>

            <div className="response-grid">
              <div className="response-section">
                <div className="section-title">
                  👤 Member Information
                </div>
                <div className="info-item">
                  <span className="info-label">Member</span>
                  <span className="info-value">
                    {message.text.data.member_name || 'N/A'} ({message.text.data.member_id || 'N/A'})
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Status</span>
                  <span className="info-value">{message.text.data.status || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Plan</span>
                  <span className="info-value">
                    {message.text.data.plan_id || 'N/A'}
                    {message.text.data.plan_details?.coverage_type && message.text.data.plan_details.coverage_type !== 'N/A' ?
                      ` (${message.text.data.plan_details.coverage_type})` : ''}
                  </span>
                </div>
                {(message.text.data.effective_date || message.text.data.end_date) && (
                  <div className="info-item">
                    <span className="info-label">Coverage Period</span>
                    <span className="info-value">
                      {message.text.data.effective_date || 'N/A'} to {message.text.data.end_date || 'N/A'}
                    </span>
                  </div>
                )}
              </div>

              <div className="response-section">
                <div className="section-title">
                  📊 Plan Details
                </div>
                {Object.entries(message.text.data.plan_details || {}).map(([key, value]) => (
                  <div key={key} className="info-item">
                    <span className="info-label">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <span className="info-value">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {message.text.data.warning && (
              <div className="warning-section" style={{
                background: '#fef3cd',
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>⚠️</span>
                <span style={{ color: '#92400e' }}>{message.text.data.warning}</span>
              </div>
            )}
          </div>
        ) : message.text?.type === 'denial-result-structured' ? (
          <div className="structured-response">
            <div className="response-header" style={{ justifyContent: 'center', gap: '0.5rem' }}>
              <span>🔍</span>
              <h3 className="response-title" style={{ margin: 0 }}>Denial Code Explanation</h3>
              {message.text.data.denial_code && (
                <span style={{
                  marginLeft: '0.5rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                  color: 'white',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  {message.text.data.denial_code}
                </span>
              )}
            </div>

            <div className="response-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div className="response-section">
                <div className="section-title">📋 Description</div>
                <div className="section-content">
                  {message.text.data.description ||
                    message.text.data.explanation ||
                    message.text.data.meaning ||
                    message.text.data.details ||
                    'No description available'}
                </div>
              </div>

              <div className="response-section">
                <div className="section-title">✅ Suggested Action</div>
                <div className="section-content">
                  {message.text.data.suggested_action ||
                    message.text.data.action ||
                    message.text.data.recommendation ||
                    message.text.data.next_steps ||
                    'Check payer fee schedule or submit an appeal with documentation'}
                </div>
              </div>
            </div>
            {message.text.data.warning && (
              <div className="warning-section" style={{
                background: '#fef3cd',
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>⚠️</span>
                <span style={{ color: '#92400e', fontSize: '0.85rem' }}>{message.text.data.warning}</span>
              </div>
            )}
          </div>
        ) : message.text?.type === 'plan-result-structured' ? (
          <div className="structured-response">
            <div className="response-header" style={{ justifyContent: 'center' }}>
              <span>📋</span>
              <h3 className="response-title">Plan & Coverage Information</h3>
            </div>

            {/* Coverage Answer - Main Result */}
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              textAlign: 'center',
              fontWeight: '600',
              fontSize: '1rem',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}>
              {message.text.data.coverage_answer}
            </div>

            <div className="response-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {/* Member Information */}
              <div className="response-section">
                <div className="section-title">
                  👤 Member Details
                </div>
                <div style={{
                  display: 'grid',
                  gap: '0.3rem',
                  fontSize: '0.8rem'
                }}>
                  <div><strong>ID:</strong> {message.text.data.member_id}</div>
                  <div><strong>Name:</strong> {message.text.data.member_name}</div>
                  <div><strong>Status:</strong>
                    <span style={{
                      color: message.text.data.status === 'Active' ? '#10b981' : '#ef4444',
                      fontWeight: '600',
                      marginLeft: '0.5rem'
                    }}>
                      {message.text.data.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan Details */}
              <div className="response-section">
                <div className="section-title">
                  📋 Plan Information
                </div>
                <div style={{
                  display: 'grid',
                  gap: '0.3rem',
                  fontSize: '0.8rem'
                }}>
                  <div><strong>Plan ID:</strong> {message.text.data.plan_id}</div>
                  <div><strong>Type:</strong> {message.text.data.plan_details?.coverage_type}</div>
                  <div><strong>Copay:</strong> {message.text.data.plan_details?.copay}</div>
                </div>
              </div>

              {/* Coverage Details */}
              <div className="response-section">
                <div className="section-title">
                  🏥 Coverage Details
                </div>
                <div style={{
                  display: 'grid',
                  gap: '0.3rem',
                  fontSize: '0.8rem'
                }}>
                  <div><strong>Services:</strong> {message.text.data.plan_details?.covered_services}</div>
                  <div><strong>Effective:</strong> {message.text.data.effective_date}</div>
                  <div><strong>Expires:</strong> {message.text.data.end_date}</div>
                </div>
              </div>

              {/* Important Notes */}
              {message.text.data.plan_details?.notes ? (
                <div className="response-section">
                  <div className="section-title">
                    📝 Important Notes
                  </div>
                  <div style={{
                    color: '#64748b',
                    fontSize: '0.8rem',
                    fontStyle: 'italic',
                    padding: '0.5rem',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {message.text.data.plan_details.notes}
                  </div>
                </div>
              ) : (
                <div></div>
              )}
              {message.text.data.llm_reasoning && (
                <div className="response-section" style={{ gridColumn: 'span 2', marginTop: '0.8rem' }}>
                  <div className="section-title">⚡ Deep Reasoning Insights</div>
                  <div className="section-content" style={{ fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {message.text.data.llm_reasoning}
                  </div>
                </div>
              )}
              {message.text.data.warning && (
                <div className="warning-section" style={{
                  background: '#fef3cd',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginTop: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  gridColumn: 'span 2'
                }}>
                  <span>⚠️</span>
                  <span style={{ color: '#92400e', fontSize: '0.85rem' }}>{message.text.data.warning}</span>
                </div>
              )}
            </div>
          </div>
        ) : message.text?.type === 'out_of_scope' ? (
          <div className="structured-response">
            <div className="response-header">
              <span>ℹ️</span>
              <h3 className="response-title">Information</h3>
            </div>
            <div style={{
              color: '#64748b',
              textAlign: 'center',
              padding: '1rem',
              fontStyle: 'italic'
            }}>
              {message.text.data.message}
            </div>
          </div>
        ) : (
          <div className="message-text">
            {typeof message.text === 'string' ? message.text.split('\n').map((line, index) => (
              <div key={index}>{line}</div>
            )) : (
              <div>
                {typeof message.text === 'object' ? JSON.stringify(message.text, null, 2) : String(message.text)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatBot; 
