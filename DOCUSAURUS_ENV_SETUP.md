# 🌍 Docusaurus Environment Configuration for Chatbot API

This guide shows you how to properly configure environment variables in Docusaurus for your chatbot API integration.

## 🚀 Environment File Setup

### **1. Create Environment Files**

In your Docusaurus project root, create these files:

#### **`.env`** (Default configuration)
```bash
# Chatbot API Configuration
REACT_APP_CHATBOT_API_URL=https://your-production-app.vercel.app/api/chat
REACT_APP_CHATBOT_API_KEY=your-production-api-key
REACT_APP_CHATBOT_SITE_NAME=Your Documentation Site

# Optional Features
REACT_APP_ENABLE_CHAT_HISTORY=true
REACT_APP_MAX_MESSAGE_LENGTH=1000
REACT_APP_RATE_LIMIT_WARNING=true
REACT_APP_DEBUG_MODE=false
```

#### **`.env.local`** (Local development - never commit)
```bash
# Local development overrides
REACT_APP_CHATBOT_API_URL=http://localhost:3000/api/chat
REACT_APP_CHATBOT_API_KEY=dev-key-123
REACT_APP_CHATBOT_SITE_NAME=Local Dev Site
REACT_APP_DEBUG_MODE=true
```

#### **`.env.production`** (Production builds)
```bash
# Production-specific settings
REACT_APP_CHATBOT_API_URL=https://your-production-app.vercel.app/api/chat
REACT_APP_CHATBOT_API_KEY=prod-key-456
REACT_APP_CHATBOT_SITE_NAME=Production Documentation
REACT_APP_DEBUG_MODE=false
```

### **2. Update .gitignore**

Add to your Docusaurus `.gitignore`:
```bash
# Environment files
.env.local
.env.*.local

# Keep tracked:
# .env
# .env.production
```

## 📁 Configuration Structure

### **Create `src/config/chatbot.js`**

```javascript
/**
 * Centralized chatbot configuration
 */

export const chatbotConfig = {
  // API Configuration
  apiUrl: process.env.REACT_APP_CHATBOT_API_URL || 'https://fallback-url.com/api/chat',
  apiKey: process.env.REACT_APP_CHATBOT_API_KEY,
  siteName: process.env.REACT_APP_CHATBOT_SITE_NAME || 'Documentation',
  
  // Feature flags
  enableChatHistory: process.env.REACT_APP_ENABLE_CHAT_HISTORY === 'true',
  maxMessageLength: parseInt(process.env.REACT_APP_MAX_MESSAGE_LENGTH) || 1000,
  showRateLimitWarning: process.env.REACT_APP_RATE_LIMIT_WARNING === 'true',
  debugMode: process.env.REACT_APP_DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development',
  
  // UI Configuration
  theme: process.env.REACT_APP_CHATBOT_THEME || 'auto',
  position: process.env.REACT_APP_CHATBOT_POSITION || 'bottom-right',
};

/**
 * Validate configuration on app start
 */
export function validateChatbotConfig() {
  const errors = [];
  
  if (!chatbotConfig.apiUrl) {
    errors.push('REACT_APP_CHATBOT_API_URL is required');
  }
  
  if (!chatbotConfig.apiKey && process.env.NODE_ENV === 'production') {
    errors.push('REACT_APP_CHATBOT_API_KEY is required in production');
  }
  
  try {
    new URL(chatbotConfig.apiUrl);
  } catch {
    errors.push('REACT_APP_CHATBOT_API_URL must be a valid URL');
  }
  
  if (errors.length > 0) {
    console.error('❌ Chatbot configuration errors:', errors);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid chatbot configuration: ${errors.join(', ')}`);
    }
  } else {
    console.log('✅ Chatbot configuration loaded:', {
      apiUrl: chatbotConfig.apiUrl,
      hasApiKey: !!chatbotConfig.apiKey,
      siteName: chatbotConfig.siteName,
      environment: process.env.NODE_ENV,
    });
  }
}

/**
 * Get API headers with authentication
 */
export function getApiHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (chatbotConfig.apiKey) {
    headers['Authorization'] = `Bearer ${chatbotConfig.apiKey}`;
  }
  
  return headers;
}

export default chatbotConfig;
```

### **Initialize in `src/theme/Root.js`**

```javascript
import React from 'react';
import { validateChatbotConfig } from '../config/chatbot';

// Initialize configuration when app starts
if (typeof window !== 'undefined') {
  validateChatbotConfig();
}

export default function Root({ children }) {
  return <>{children}</>;
}
```

## 🔧 Usage in Components

### **Custom Hook: `src/hooks/useChatbot.js`**

```javascript
import { useState, useCallback } from 'react';
import { chatbotConfig, getApiHeaders } from '../config/chatbot';

export function useChatbot() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (content) => {
    if (!content?.trim()) return;

    const userMessage = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(chatbotConfig.apiUrl, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          messages: [...messages, userMessage],
          useTools: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';

      // Add placeholder for assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                assistantResponse += parsed.choices[0].delta.content;
                
                // Update the assistant message in real-time
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantResponse
                  };
                  return updated;
                });
              }
            } catch (e) {
              if (chatbotConfig.debugMode) {
                console.warn('Failed to parse streaming data:', e);
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
      // Remove the user message if there was an error
      setMessages(prev => prev.slice(0, -1));
      
      if (chatbotConfig.debugMode) {
        console.error('Chatbot error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    error,
    config: chatbotConfig
  };
}
```

### **Component Example: `src/components/ChatBot.jsx`**

```jsx
import React, { useState } from 'react';
import { useChatbot } from '../hooks/useChatbot';
import ReactMarkdown from 'react-markdown';

export default function ChatBot() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, clearMessages, isLoading, error, config } = useChatbot();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      await sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h3>💬 Chat with {config.siteName}</h3>
        {messages.length > 0 && (
          <button onClick={clearMessages} className="clear-btn">
            Clear Chat
          </button>
        )}
      </div>

      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message message-${message.role}`}>
            <div className="message-content">
              {message.role === 'assistant' ? (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message message-assistant">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
          {config.debugMode && (
            <details>
              <summary>Debug Info</summary>
              <pre>{JSON.stringify({ apiUrl: config.apiUrl, hasApiKey: !!config.apiKey }, null, 2)}</pre>
            </details>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${config.siteName} anything...`}
          disabled={isLoading}
          maxLength={config.maxMessageLength}
          className="chat-input"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isLoading}
          className="send-button"
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </form>

      {config.showRateLimitWarning && (
        <div className="rate-limit-info">
          ℹ️ Please avoid sending too many messages quickly
        </div>
      )}
    </div>
  );
}
```

## 🎨 Styling with CSS Variables

### **Add to `src/css/custom.css`**

```css
/* Chatbot styling using Docusaurus CSS variables */
.chatbot-container {
  max-width: 800px;
  margin: 2rem auto;
  border: 1px solid var(--ifm-border-color);
  border-radius: var(--ifm-border-radius);
  background: var(--ifm-background-color);
  overflow: hidden;
}

.chatbot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--ifm-color-primary);
  color: var(--ifm-color-primary-contrast-background);
}

.messages-container {
  height: 400px;
  overflow-y: auto;
  padding: 1rem;
  background: var(--ifm-background-color-subtle);
}

.message {
  margin-bottom: 1rem;
}

.message-user {
  text-align: right;
}

.message-user .message-content {
  display: inline-block;
  background: var(--ifm-color-primary);
  color: var(--ifm-color-primary-contrast-background);
  padding: 0.5rem 1rem;
  border-radius: 1rem 1rem 0.25rem 1rem;
  max-width: 80%;
}

.message-assistant .message-content {
  background: var(--ifm-background-color);
  border: 1px solid var(--ifm-border-color);
  padding: 0.5rem 1rem;
  border-radius: 1rem 1rem 1rem 0.25rem;
  max-width: 80%;
}

.chat-input-form {
  display: flex;
  padding: 1rem;
  background: var(--ifm-background-color);
  border-top: 1px solid var(--ifm-border-color);
}

.chat-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--ifm-border-color);
  border-radius: var(--ifm-border-radius);
  margin-right: 0.5rem;
}

.send-button {
  background: var(--ifm-color-primary);
  color: var(--ifm-color-primary-contrast-background);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--ifm-border-radius);
  cursor: pointer;
}

.error-message {
  background: var(--ifm-color-danger-light);
  color: var(--ifm-color-danger-dark);
  padding: 1rem;
  margin: 1rem;
  border-radius: var(--ifm-border-radius);
}

.typing-indicator {
  display: flex;
  gap: 0.25rem;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ifm-color-secondary);
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
```

## 🚀 Deployment Configuration

### **Vercel**
Add environment variables in your Vercel dashboard:
```bash
REACT_APP_CHATBOT_API_URL=https://your-api.vercel.app/api/chat
REACT_APP_CHATBOT_API_KEY=your-production-key
```

### **Netlify**
Add in `netlify.toml`:
```toml
[build.environment]
  REACT_APP_CHATBOT_API_URL = "https://your-api.vercel.app/api/chat"
  REACT_APP_CHATBOT_API_KEY = "your-production-key"
```

### **GitHub Actions**
Add to your workflow:
```yaml
env:
  REACT_APP_CHATBOT_API_URL: ${{ secrets.CHATBOT_API_URL }}
  REACT_APP_CHATBOT_API_KEY: ${{ secrets.CHATBOT_API_KEY }}
```

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - contains sensitive development keys
2. **Use different API keys** for development and production
3. **Validate configuration** on app startup
4. **Handle API errors gracefully** with user-friendly messages
5. **Implement rate limiting** in your UI to prevent abuse
6. **Use HTTPS** for all production API URLs

## 📚 Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_CHATBOT_API_URL` | ✅ | - | Your chatbot API endpoint |
| `REACT_APP_CHATBOT_API_KEY` | 🔒 Production | - | API authentication key |
| `REACT_APP_CHATBOT_SITE_NAME` | ❌ | "Documentation" | Display name for your site |
| `REACT_APP_ENABLE_CHAT_HISTORY` | ❌ | `false` | Persist chat across sessions |
| `REACT_APP_MAX_MESSAGE_LENGTH` | ❌ | `1000` | Maximum characters per message |
| `REACT_APP_RATE_LIMIT_WARNING` | ❌ | `false` | Show rate limit warnings |
| `REACT_APP_DEBUG_MODE` | ❌ | `false` | Enable debug logging |

Remember: All `REACT_APP_*` variables are **publicly visible** in the built application, so never put sensitive data in them! 