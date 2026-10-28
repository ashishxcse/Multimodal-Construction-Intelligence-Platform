import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, HardHat, User, Lightbulb, RotateCcw } from 'lucide-react';
import { sendChatMessage } from '../api';
import toast from 'react-hot-toast';

const WELCOME_MSG = {
  role: 'ai',
  content: `👋 Hello! I'm **ConstructAI**, your expert Indian construction intelligence assistant.

I can help you with:
- 📐 **Indian construction standards** (IS 456, IS 875, IS 1893, NBC)
- 💰 **Cost estimates & BOQ** in ₹ INR for any project type
- 🦺 **Safety regulations** (IS 4130, Factories Act, BOCW Act 1996)
- 🏗️ **Structural engineering** and concrete mix design
- 📅 **Project management** (EVM schedule variance, PERT/CPM)
- 🔧 **Material selection** and local market procurement advice

What would you like to know?`,
  suggestions: [
    'What is the cost per sq.ft for a residential building in Mumbai?',
    'What PPE is mandatory on an Indian construction site per IS 4130?',
    'Explain the IS 456 standard for concrete mix design',
    'How do I calculate EVM for my project?',
  ],
};

function renderMessage(text) {
  if (typeof text !== 'string') return text;
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => (
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part
  ));
}

export default function AIChat() {
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setLastQuery(msg);
    const requestId = ++requestIdRef.current;

    const userMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await sendChatMessage(msg);
      const data = res.data;
      if (requestId !== requestIdRef.current) return;
      setMessages(prev => [...prev, {
        role: 'ai',
        content: data.answer,
        suggestions: data.follow_up_suggestions || [],
        confidence: data.confidence,
        dataPoints: data.data_points || [],
      }]);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      const detail = err.response?.data?.detail || 'Unable to get a response. Check the backend and AI service status.';
      setMessages(prev => [...prev, {
        role: 'ai',
        content: detail,
        isError: true,
        suggestions: [],
      }]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reset = () => {
    requestIdRef.current += 1;
    setMessages([WELCOME_MSG]);
    setInput('');
    setLastQuery('');
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-sm mb-sm">
          <MessageCircle size={24} style={{ color: 'var(--color-accent-orange)' }} />
          <h1 className="page-title" style={{ marginBottom: 0 }}>AI Construction Assistant</h1>
        </div>
        <p className="page-subtitle">Expert construction AI assistant powered by Groq Llama models. Ask questions about Indian IS codes, rates in ₹ INR, and site regulations.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 460, maxHeight: 720 }}>
        {/* Chat Header */}
        <div style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(249,115,22,0.06)',
        }}>
          <div className="flex items-center gap-sm">
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--gradient-construction)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px rgba(249,115,22,0.4)',
            }}>
              <HardHat size={18} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>ConstructAI Specialist</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                {loading ? '⟳ Formulating response...' : '● Online · IS Code & Cost Intelligence'}
              </p>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-icon"
            onClick={reset}
            title="Clear chat"
            id="clear-chat-btn"
            aria-label="Clear chat conversation"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Messages Container */}
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '16px' }} role="log" aria-live="polite">
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div className={`chat-message ${msg.role}`}>
                <div className="chat-avatar" style={{
                  background: msg.role === 'ai'
                    ? 'var(--gradient-construction)'
                    : 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                }}>
                  {msg.role === 'ai' ? <HardHat size={16} color="white" /> : <User size={16} color="white" />}
                </div>
                <div className={`chat-bubble ${msg.role === 'ai' ? 'ai' : 'user'}`} style={msg.isError ? { borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' } : {}}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{renderMessage(msg.content)}</span>
                  {msg.confidence && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
                      Confidence: {(msg.confidence * 100).toFixed(0)}%
                    </p>
                  )}
                  {msg.isError && lastQuery && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={() => sendMessage(lastQuery)}
                        className="btn btn-outline-orange"
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                        <RotateCcw size={12} />
                        Retry Query
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              {msg.suggestions?.length > 0 && (
                <div className="flex" style={{ flexWrap: 'wrap', gap: 8, marginTop: 10, marginLeft: 44 }}>
                  {msg.suggestions.map((s, j) => (
                    <button
                      key={j}
                      onClick={() => sendMessage(s)}
                      disabled={loading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'rgba(249,115,22,0.08)',
                        border: '1px solid rgba(249,115,22,0.28)',
                        color: '#fed7aa', borderRadius: 20,
                        padding: '5px 12px', fontSize: '0.78rem', cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      aria-label={`Ask suggestion: ${s}`}
                    >
                      <Lightbulb size={12} style={{ color: 'var(--color-accent-orange)' }} />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-message">
              <div className="chat-avatar" style={{ background: 'var(--gradient-construction)' }}>
                <HardHat size={16} color="white" />
              </div>
              <div className="chat-bubble ai" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(k => (
                    <div key={k} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--color-accent-orange)', opacity: 0.7,
                      animation: `bounce 1.2s ${k * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ConstructAI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', gap: 10, alignItems: 'flex-end',
          background: 'rgba(5,12,26,0.5)',
        }}>
          <textarea
            ref={inputRef}
            className="form-control chat-input"
            placeholder="Ask about costs in ₹ INR, safety per IS codes, materials, or structural queries..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ flex: 1, minHeight: 44, maxHeight: 120, resize: 'none' }}
            id="chat-input"
            aria-label="Message ConstructAI"
          />
          <button
            className="btn btn-primary"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            id="send-chat-btn"
            style={{ height: 44, minWidth: 44, padding: 0 }}
            aria-label="Send question to ConstructAI"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
