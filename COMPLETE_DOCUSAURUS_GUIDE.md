# Complete Docusaurus Integration Guide for Elastic Path Chatbot

This guide provides step-by-step instructions for integrating the enhanced Elastic Path Chatbot API into your Docusaurus documentation site.

## 🔄 **Updated API Features Summary**

The enhanced API now includes:
- ✅ **CORS Support** - Cross-origin requests from your Docusaurus site
- ✅ **Rate Limiting** - Configurable request limits (default: 10 requests/minute)
- ✅ **API Key Authentication** - Optional authentication for production
- ✅ **Input Validation** - Robust request validation
- ✅ **Error Handling** - Comprehensive error responses
- ✅ **Security Headers** - Production-ready security

## 🚀 **Step-by-Step Implementation**

### **Step 1: Set Up Your Chatbot API** 

First, ensure your chatbot API has the enhanced security features. Update your environment variables:

```bash
# In your chatbot API project (.env)
MONGODB_CONNECTION_URI=mongodb+srv://...
MONGODB_DATABASE_NAME=epdocs_chatbot
MONGODB_COLLECTION_NAME=documents
MONGODB_API_COLLECTION_NAME=api_documents
OPENAI_API_KEY=sk-...

# Security Configuration
REQUIRE_API_KEY=true
VALID_API_KEYS=docusaurus-key-1,mobile-app-key-2,website-key-3
ALLOWED_ORIGINS=https://your-docusaurus-site.com,https://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

### **Step 2: Deploy Your Enhanced API**

Deploy your updated chatbot API to Vercel, Netlify, or your preferred platform.

```bash
# In your chatbot project
npm run build
vercel --prod

# Note your deployment URL: https://your-chatbot-api.vercel.app
```

### **Step 3: Create Docusaurus Project (if needed)**

```bash
npx create-docusaurus@latest my-docs-site classic
cd my-docs-site
```

### **Step 4: Install Required Dependencies**

```bash
npm install --save react-markdown remark-gfm rehype-highlight highlight.js
```

### **Step 5: Create Chat Components Structure**

```bash
mkdir -p src/components/Chat
touch src/components/Chat/ChatBot.tsx
touch src/components/Chat/ChatMessage.tsx
touch src/components/Chat/ChatInput.tsx
touch src/components/Chat/useChatAPI.ts
touch src/components/Chat/chat.module.css
```

### **Step 6: Implement Chat API Hook**

Create `src/components/Chat/useChatAPI.ts`:

```typescript
import { useState, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface ChatConfig {
  apiEndpoint: string;
  apiKey?: string;
  useTools?: boolean;
}

export const useChatAPI = (config: ChatConfig) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      id: crypto.randomUUID()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [...messages, userMessage],
          useTools: config.useTools ?? true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';

      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        id: crypto.randomUUID()
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        assistantResponse += chunk;
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: assistantResponse }
              : msg
          )
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Remove the user message if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [config, messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearChat,
    isLoading,
    error
  };
};
```

### **Step 7: Create Message Component**

Create `src/components/Chat/ChatMessage.tsx`:

```typescript
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import styles from './chat.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`${styles.messageContainer} ${isUser ? styles.userMessage : styles.assistantMessage}`}>
      <div className={styles.messageAvatar}>
        {isUser ? (
          <div className={styles.userAvatar}>👤</div>
        ) : (
          <div className={styles.botAvatar}>🤖</div>
        )}
      </div>
      
      <div className={styles.messageContent}>
        {isUser ? (
          <p className={styles.userText}>{message.content}</p>
        ) : (
          <div className={styles.assistantResponse}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
                code: ({ node, inline, className, children, ...props }) => {
                  if (inline) {
                    return (
                      <code className={styles.inlineCode} {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
```

### **Step 8: Create Input Component**

Create `src/components/Chat/ChatInput.tsx`:

```typescript
import React, { useState, KeyboardEvent } from 'react';
import styles from './chat.module.css';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  placeholder = "Ask a question about Elastic Path..."
}) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.inputContainer}>
      <div className={styles.inputWrapper}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={isLoading ? "Answering..." : placeholder}
          disabled={isLoading}
          className={styles.textInput}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className={styles.sendButton}
          aria-label="Send message"
        >
          📤
        </button>
      </div>
      
      <div className={styles.disclaimer}>
        This is an experimental AI chatbot. Please verify all information before use.
      </div>
    </div>
  );
};
```

### **Step 9: Create Main ChatBot Component**

Create `src/components/Chat/ChatBot.tsx`:

```typescript
import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChatAPI } from './useChatAPI';
import styles from './chat.module.css';

interface ChatBotProps {
  apiEndpoint: string;
  apiKey?: string;
  useTools?: boolean;
  welcomeMessage?: string;
  height?: string;
}

export const ChatBot: React.FC<ChatBotProps> = ({
  apiEndpoint,
  apiKey,
  useTools = true,
  welcomeMessage = "Hi! I'm the Elastic Path AI assistant. How can I help you today?",
  height = "600px"
}) => {
  const { messages, sendMessage, clearChat, isLoading, error } = useChatAPI({
    apiEndpoint,
    apiKey,
    useTools
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={styles.chatContainer} style={{ height }}>
      <div className={styles.chatHeader}>
        <h3>🤖 Elastic Path AI Assistant</h3>
        <button 
          onClick={clearChat} 
          className={styles.clearButton}
          aria-label="Clear chat"
        >
          🗑️ Clear
        </button>
      </div>
      
      <div className={styles.messagesContainer}>
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className={`${styles.messageContainer} ${styles.assistantMessage}`}>
            <div className={styles.messageAvatar}>
              <div className={styles.botAvatar}>🤖</div>
            </div>
            <div className={styles.messageContent}>
              <p className={styles.welcomeMessage}>{welcomeMessage}</p>
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className={`${styles.messageContainer} ${styles.assistantMessage}`}>
            <div className={styles.messageAvatar}>
              <div className={styles.botAvatar}>🤖</div>
            </div>
            <div className={styles.messageContent}>
              <div className={styles.loadingDots}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>
              ❌ Error: {error}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput 
        onSendMessage={sendMessage} 
        isLoading={isLoading}
      />
    </div>
  );
};
```

### **Step 10: Create Styles**

Create `src/components/Chat/chat.module.css`:

```css
.chatContainer {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ifm-color-emphasis-300);
  border-radius: 12px;
  background: var(--ifm-background-color);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  font-family: var(--ifm-font-family-base);
  overflow: hidden;
}

.chatHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--ifm-color-emphasis-300);
  background: linear-gradient(135deg, var(--ifm-color-primary) 0%, var(--ifm-color-primary-dark) 100%);
  color: white;
}

.chatHeader h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.clearButton {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.clearButton:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.messagesContainer {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  max-height: calc(100% - 160px);
  background: var(--ifm-background-color);
}

.messageContainer {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  opacity: 0;
  animation: fadeInUp 0.3s ease forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.userMessage {
  flex-direction: row-reverse;
}

.assistantMessage {
  flex-direction: row;
}

.messageAvatar {
  flex-shrink: 0;
}

.userAvatar, .botAvatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.userAvatar {
  background: linear-gradient(135deg, var(--ifm-color-primary) 0%, var(--ifm-color-primary-dark) 100%);
}

.botAvatar {
  background: linear-gradient(135deg, var(--ifm-color-emphasis-200) 0%, var(--ifm-color-emphasis-300) 100%);
}

.messageContent {
  flex: 1;
  min-width: 0;
}

.userText {
  background: linear-gradient(135deg, var(--ifm-color-primary) 0%, var(--ifm-color-primary-dark) 100%);
  color: white;
  padding: 1rem 1.25rem;
  border-radius: 20px 20px 4px 20px;
  margin: 0;
  max-width: 85%;
  margin-left: auto;
  word-wrap: break-word;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.assistantResponse {
  background: var(--ifm-color-emphasis-100);
  padding: 1rem 1.25rem;
  border-radius: 20px 20px 20px 4px;
  max-width: 85%;
  border: 1px solid var(--ifm-color-emphasis-200);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.assistantResponse p:last-child {
  margin-bottom: 0;
}

.assistantResponse pre {
  background: var(--ifm-color-emphasis-200) !important;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid var(--ifm-color-emphasis-300);
}

.assistantResponse code {
  background: var(--ifm-color-emphasis-200);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9em;
}

.inlineCode {
  background: var(--ifm-color-emphasis-200) !important;
  padding: 0.25rem 0.5rem !important;
  border-radius: 4px !important;
  font-size: 0.9em !important;
}

.assistantResponse a {
  color: var(--ifm-color-primary);
  text-decoration: underline;
  font-weight: 500;
}

.assistantResponse a:hover {
  color: var(--ifm-color-primary-dark);
}

.welcomeMessage {
  background: linear-gradient(135deg, var(--ifm-color-info-contrast-background) 0%, rgba(var(--ifm-color-info-contrast-background), 0.8) 100%);
  color: var(--ifm-color-info-contrast-foreground);
  padding: 1rem 1.25rem;
  border-radius: 20px 20px 20px 4px;
  margin: 0;
  max-width: 85%;
  border: 1px solid var(--ifm-color-info);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.loadingDots {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background: var(--ifm-color-emphasis-100);
  border-radius: 20px 20px 20px 4px;
  border: 1px solid var(--ifm-color-emphasis-200);
  max-width: 85%;
}

.loadingDots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ifm-color-primary);
  animation: loading 1.4s infinite both;
}

.loadingDots span:nth-child(1) { animation-delay: 0s; }
.loadingDots span:nth-child(2) { animation-delay: 0.2s; }
.loadingDots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes loading {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.errorContainer {
  padding: 1rem;
  background: var(--ifm-color-danger-contrast-background);
  border: 1px solid var(--ifm-color-danger);
  border-radius: 12px;
  margin-bottom: 1rem;
}

.errorMessage {
  color: var(--ifm-color-danger);
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
}

.inputContainer {
  border-top: 1px solid var(--ifm-color-emphasis-300);
  padding: 1.5rem;
  background: var(--ifm-background-surface-color);
}

.inputWrapper {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

.textInput {
  flex: 1;
  border: 2px solid var(--ifm-color-emphasis-400);
  border-radius: 25px;
  padding: 0.875rem 1.25rem;
  font-family: var(--ifm-font-family-base);
  font-size: 0.9rem;
  background: var(--ifm-background-color);
  color: var(--ifm-font-color-base);
  resize: none;
  min-height: 50px;
  max-height: 120px;
  transition: all 0.2s ease;
}

.textInput:focus {
  outline: none;
  border-color: var(--ifm-color-primary);
  box-shadow: 0 0 0 3px rgba(var(--ifm-color-primary-rgb), 0.1);
}

.textInput:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sendButton {
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ifm-color-primary) 0%, var(--ifm-color-primary-dark) 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-size: 1.2rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.sendButton:hover:not(:disabled) {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.sendButton:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.disclaimer {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: var(--ifm-color-emphasis-600);
  text-align: center;
  font-style: italic;
}

/* Dark mode adjustments */
[data-theme='dark'] .assistantResponse {
  background: var(--ifm-color-emphasis-100);
  border-color: var(--ifm-color-emphasis-300);
}

[data-theme='dark'] .assistantResponse pre {
  background: var(--ifm-color-emphasis-200) !important;
}

[data-theme='dark'] .textInput {
  background: var(--ifm-background-surface-color);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .chatContainer {
    height: 100vh !important;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
  
  .userText, .assistantResponse, .welcomeMessage {
    max-width: 92%;
  }
  
  .messagesContainer {
    padding: 1rem;
  }
  
  .inputContainer {
    padding: 1rem;
  }
  
  .chatHeader {
    padding: 1rem;
  }
  
  .messageAvatar {
    display: none;
  }
  
  .userText {
    border-radius: 16px 16px 4px 16px;
  }
  
  .assistantResponse, .welcomeMessage {
    border-radius: 16px 16px 16px 4px;
  }
}
```

### **Step 11: Create Chat Page**

Create `src/pages/chat.tsx`:

```typescript
import React from 'react';
import Layout from '@theme/Layout';
import { ChatBot } from '../components/Chat/ChatBot';

export default function ChatPage(): JSX.Element {
  // Use environment variables or hardcode your API endpoint
  const API_ENDPOINT = 'https://your-chatbot-api.vercel.app/api/chat';
  const API_KEY = 'your-api-key'; // Optional - only if you enabled API key auth

  return (
    <Layout
      title="AI Assistant"
      description="Get help with Elastic Path using our AI assistant"
    >
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--10 col--offset-1">
            <div className="text--center margin-bottom--lg">
              <h1>🤖 Elastic Path AI Assistant</h1>
              <p className="text--lg">
                Ask questions about Elastic Path products, APIs, and documentation. 
                This AI assistant can help you find information quickly and provide 
                code examples.
              </p>
            </div>
            
            <ChatBot
              apiEndpoint={API_ENDPOINT}
              apiKey={API_KEY} // Remove this line if not using API keys
              useTools={true}
              height="700px"
              welcomeMessage="Hi! I'm here to help you with Elastic Path. Ask me about products, APIs, integrations, or any technical questions!"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
```

### **Step 12: Update Docusaurus Navigation**

Edit `docusaurus.config.js`:

```javascript
const config = {
  // ... existing config
  
  themeConfig: {
    // ... existing theme config
    
    navbar: {
      // ... existing navbar config
      items: [
        // ... existing items
        {
          to: '/chat',
          label: '🤖 AI Assistant',
          position: 'left',
        },
      ],
    },
  },
};

module.exports = config;
```

### **Step 13: Configure Environment Variables (Optional)**

Create `.env.local` in your Docusaurus project:

```bash
REACT_APP_CHATBOT_API_ENDPOINT=https://your-chatbot-api.vercel.app/api/chat
REACT_APP_CHATBOT_API_KEY=your-api-key
```

Then update your chat page to use these:

```typescript
// In chat.tsx
const API_ENDPOINT = process.env.REACT_APP_CHATBOT_API_ENDPOINT || 'https://your-chatbot-api.vercel.app/api/chat';
const API_KEY = process.env.REACT_APP_CHATBOT_API_KEY;
```

### **Step 14: Test Your Integration**

```bash
# Start Docusaurus development server
npm start

# Visit http://localhost:3000/chat
# Test asking questions like:
# - "What is PXM?"
# - "How do I create a product via the API?"
# - "Explain cart functionality"
```

### **Step 15: Deploy to Production**

```bash
# Build for production
npm run build

# Deploy to your hosting platform
npm run deploy
```

## 🎛 **Advanced Options**

### **Option 1: Floating Chat Widget**

Create a floating chat that appears on every page:

```typescript
// src/components/Chat/FloatingChat.tsx
import React, { useState } from 'react';
import { ChatBot } from './ChatBot';

export const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
    }}>
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          right: '0',
          width: '400px',
          height: '600px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <ChatBot
            apiEndpoint="https://your-chatbot-api.vercel.app/api/chat"
            height="100%"
          />
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #007acc 0%, #005a99 100%)',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease',
        }}
      >
        {isOpen ? '✕' : '🤖'}
      </button>
    </div>
  );
};
```

### **Option 2: Embed in Specific Pages**

Add to any `.mdx` file:

```mdx
---
title: API Documentation
---

# API Documentation

Ask questions about this API using our AI assistant:

import { ChatBot } from '@site/src/components/Chat/ChatBot';

<ChatBot
  apiEndpoint="https://your-chatbot-api.vercel.app/api/chat"
  height="400px"
  welcomeMessage="Ask me anything about this API documentation!"
/>

## REST Endpoints

...
```

## 🔐 **Security Best Practices**

1. **Use HTTPS** for all API communications
2. **Set CORS origins** to only allow your domains
3. **Enable API key authentication** for production
4. **Monitor rate limits** and adjust as needed
5. **Keep API keys secure** - never commit them to version control

## 🎨 **Customization Tips**

1. **Colors**: Modify CSS variables to match your brand
2. **Icons**: Replace emojis with custom SVG icons
3. **Welcome Message**: Customize for different pages/contexts
4. **Height**: Adjust based on your layout needs
5. **Mobile**: Test and adjust mobile responsiveness

## 🔍 **Troubleshooting**

### Common Issues:

1. **CORS Errors**: 
   - Ensure your API's `ALLOWED_ORIGINS` includes your Docusaurus domain
   - Check browser console for specific CORS messages

2. **Rate Limiting**:
   - Increase `RATE_LIMIT_MAX_REQUESTS` if needed
   - Monitor rate limit headers in network tab

3. **Authentication Issues**:
   - Verify API key format and validity
   - Check if `REQUIRE_API_KEY` is properly configured

4. **Styling Issues**:
   - Ensure CSS modules are working properly
   - Check for conflicting Docusaurus styles

### Debug Mode:

Add console logging to troubleshoot:

```typescript
// In useChatAPI.ts
console.log('API Request:', {
  endpoint: config.apiEndpoint,
  messages: messages.length,
  useTools: config.useTools
});
```

## 🎉 **You're Done!**

Your Docusaurus site now has a fully functional AI chatbot powered by your enhanced Elastic Path API! The integration provides:

- ✅ Real-time streaming responses
- ✅ Markdown formatting with syntax highlighting
- ✅ Mobile-responsive design
- ✅ Error handling and loading states
- ✅ Security features (CORS, rate limiting, API keys)
- ✅ Seamless integration with Docusaurus themes

Users can now get instant help with Elastic Path products directly from your documentation site! 