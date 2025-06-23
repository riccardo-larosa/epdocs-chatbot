# Elastic Path Chatbot Integration for Docusaurus

This guide provides complete instructions for integrating the Elastic Path Chatbot API into your Docusaurus documentation site.

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd your-docusaurus-site
npm install --save react-markdown remark-gfm rehype-highlight highlight.js
```

### Step 2: Create Chat Components

Create the following directory structure in your Docusaurus site:

```
src/
├── components/
│   └── Chat/
│       ├── ChatBot.tsx
│       ├── ChatMessage.tsx
│       ├── ChatInput.tsx
│       ├── useChatAPI.ts
│       └── chat.module.css
└── pages/
    └── chat.tsx
```

## 📁 Component Implementation

### 1. Chat API Hook (`src/components/Chat/useChatAPI.ts`)

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

### 2. Chat Message Component (`src/components/Chat/ChatMessage.tsx`)

```typescript
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
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
          <div className={styles.userAvatar}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        ) : (
          <div className={styles.botAvatar}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20,4C21.11,4 22,4.89 22,6V18C22,19.11 21.11,20 20,20H4C2.89,20 2,19.11 2,18V6C2,4.89 2.89,4 4,4H20M20,6H4V18H20V6M6,9H18V11H6V9M6,12H14V14H6V12Z" />
            </svg>
          </div>
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

### 3. Chat Input Component (`src/components/Chat/ChatInput.tsx`)

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
          onKeyPress={handleKeyPress}
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
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
          </svg>
        </button>
      </div>
      
      <div className={styles.disclaimer}>
        This is an experimental AI chatbot. Please verify all information before use.
      </div>
    </div>
  );
};
```

### 4. Main ChatBot Component (`src/components/Chat/ChatBot.tsx`)

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
        <h3>Elastic Path Assistant</h3>
        <button 
          onClick={clearChat} 
          className={styles.clearButton}
          aria-label="Clear chat"
        >
          Clear
        </button>
      </div>
      
      <div className={styles.messagesContainer}>
        {/* Welcome message */}
        <div className={`${styles.messageContainer} ${styles.assistantMessage}`}>
          <div className={styles.messageAvatar}>
            <div className={styles.botAvatar}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20,4C21.11,4 22,4.89 22,6V18C22,19.11 21.11,20 20,20H4C2.89,20 2,19.11 2,18V6C2,4.89 2.89,4 4,4H20M20,6H4V18H20V6M6,9H18V11H6V9M6,12H14V14H6V12Z" />
              </svg>
            </div>
          </div>
          <div className={styles.messageContent}>
            <p className={styles.welcomeMessage}>{welcomeMessage}</p>
          </div>
        </div>

        {/* Chat messages */}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className={`${styles.messageContainer} ${styles.assistantMessage}`}>
            <div className={styles.messageAvatar}>
              <div className={styles.botAvatar}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20,4C21.11,4 22,4.89 22,6V18C22,19.11 21.11,20 20,20H4C2.89,20 2,19.11 2,18V6C2,4.89 2.89,4 4,4H20M20,6H4V18H20V6M6,9H18V11H6V9M6,12H14V14H6V12Z" />
                </svg>
              </div>
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
              Error: {error}
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

### 5. Chat Styles (`src/components/Chat/chat.module.css`)

```css
.chatContainer {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ifm-color-emphasis-300);
  border-radius: 8px;
  background: var(--ifm-background-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-family: var(--ifm-font-family-base);
}

.chatHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--ifm-color-emphasis-300);
  background: var(--ifm-color-emphasis-100);
}

.chatHeader h3 {
  margin: 0;
  color: var(--ifm-color-primary);
  font-size: 1rem;
  font-weight: 600;
}

.clearButton {
  background: none;
  border: 1px solid var(--ifm-color-emphasis-400);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  color: var(--ifm-color-emphasis-700);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.clearButton:hover {
  background: var(--ifm-color-emphasis-200);
  border-color: var(--ifm-color-emphasis-500);
}

.messagesContainer {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  max-height: calc(100% - 140px);
}

.messageContainer {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
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

.userAvatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--ifm-color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.userAvatar svg {
  width: 18px;
  height: 18px;
}

.botAvatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--ifm-color-emphasis-200);
  color: var(--ifm-color-emphasis-700);
  display: flex;
  align-items: center;
  justify-content: center;
}

.botAvatar svg {
  width: 18px;
  height: 18px;
}

.messageContent {
  flex: 1;
  min-width: 0;
}

.userText {
  background: var(--ifm-color-primary);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 18px;
  margin: 0;
  max-width: 80%;
  margin-left: auto;
  word-wrap: break-word;
}

.assistantResponse {
  background: var(--ifm-color-emphasis-100);
  padding: 0.75rem 1rem;
  border-radius: 18px;
  max-width: 80%;
  border: 1px solid var(--ifm-color-emphasis-200);
}

.assistantResponse p:last-child {
  margin-bottom: 0;
}

.assistantResponse pre {
  background: var(--ifm-color-emphasis-200) !important;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.assistantResponse code {
  background: var(--ifm-color-emphasis-200);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-size: 0.875em;
}

.inlineCode {
  background: var(--ifm-color-emphasis-200) !important;
  padding: 0.125rem 0.25rem !important;
  border-radius: 3px !important;
  font-size: 0.875em !important;
}

.assistantResponse a {
  color: var(--ifm-color-primary);
  text-decoration: underline;
}

.welcomeMessage {
  background: var(--ifm-color-info-contrast-background);
  color: var(--ifm-color-info-contrast-foreground);
  padding: 0.75rem 1rem;
  border-radius: 18px;
  margin: 0;
  max-width: 80%;
  border: 1px solid var(--ifm-color-info);
}

.loadingDots {
  display: flex;
  gap: 0.25rem;
  padding: 1rem;
}

.loadingDots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ifm-color-emphasis-500);
  animation: loading 1.4s infinite both;
}

.loadingDots span:nth-child(1) { animation-delay: 0s; }
.loadingDots span:nth-child(2) { animation-delay: 0.2s; }
.loadingDots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes loading {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.errorContainer {
  padding: 0.75rem;
  background: var(--ifm-color-danger-contrast-background);
  border: 1px solid var(--ifm-color-danger);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.errorMessage {
  color: var(--ifm-color-danger);
  margin: 0;
  font-size: 0.875rem;
}

.inputContainer {
  border-top: 1px solid var(--ifm-color-emphasis-300);
  padding: 1rem;
}

.inputWrapper {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.textInput {
  flex: 1;
  border: 1px solid var(--ifm-color-emphasis-400);
  border-radius: 20px;
  padding: 0.75rem 1rem;
  font-family: var(--ifm-font-family-base);
  font-size: 0.875rem;
  background: var(--ifm-background-color);
  color: var(--ifm-font-color-base);
  resize: none;
  min-height: 44px;
  max-height: 120px;
  transition: border-color 0.2s ease;
}

.textInput:focus {
  outline: none;
  border-color: var(--ifm-color-primary);
}

.textInput:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sendButton {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: var(--ifm-color-primary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.sendButton:hover:not(:disabled) {
  background: var(--ifm-color-primary-dark);
  transform: scale(1.05);
}

.sendButton:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.sendButton svg {
  width: 20px;
  height: 20px;
}

.disclaimer {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--ifm-color-emphasis-600);
  text-align: center;
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
    height: 100% !important;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
  
  .userText, .assistantResponse, .welcomeMessage {
    max-width: 90%;
  }
  
  .messagesContainer {
    padding: 0.75rem;
  }
  
  .inputContainer {
    padding: 0.75rem;
  }
}
```

## 📄 Page Implementation

### Create a Chat Page (`src/pages/chat.tsx`)

```typescript
import React from 'react';
import Layout from '@theme/Layout';
import { ChatBot } from '../components/Chat/ChatBot';

export default function ChatPage(): JSX.Element {
  return (
    <Layout
      title="AI Assistant"
      description="Get help with Elastic Path using our AI assistant"
    >
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <h1>Elastic Path AI Assistant</h1>
            <p>
              Ask questions about Elastic Path products, APIs, and documentation. 
              This AI assistant can help you find information quickly and provide 
              code examples.
            </p>
            
            <ChatBot
              apiEndpoint="https://your-chatbot-api.vercel.app/api/chat"
              apiKey="your-api-key" // Optional
              useTools={true}
              height="700px"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
```

## 🔧 Docusaurus Configuration

### Update `docusaurus.config.js`

```javascript
// Add to your existing config
const config = {
  // ... existing config
  
  plugins: [
    // ... existing plugins
    
    // Add client modules for global styles
    [
      '@docusaurus/plugin-client-redirects',
      {
        // your redirect config
      },
    ],
  ],
  
  themeConfig: {
    // ... existing theme config
    
    navbar: {
      // ... existing navbar items
      items: [
        // ... existing items
        {
          to: '/chat',
          label: 'AI Assistant',
          position: 'left',
        },
      ],
    },
  },
};
```

## 🎛 Advanced Integration Options

### 1. Floating Chat Widget

Create a floating chat widget that appears on all pages:

```typescript
// src/components/Chat/FloatingChat.tsx
import React, { useState } from 'react';
import { ChatBot } from './ChatBot';
import styles from './floatingChat.module.css';

export const FloatingChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.floatingChat}>
      {isOpen && (
        <div className={styles.chatWidget}>
          <ChatBot
            apiEndpoint="https://your-chatbot-api.vercel.app/api/chat"
            height="500px"
          />
        </div>
      )}
      
      <button
        className={styles.chatToggle}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
};
```

### 2. Embed in Documentation Pages

Add chat directly to specific documentation pages:

```mdx
---
title: API Reference
---

# API Reference

This page contains our API documentation.

<ChatBot
  apiEndpoint="https://your-chatbot-api.vercel.app/api/chat"
  height="400px"
  welcomeMessage="Ask me about this API documentation!"
/>

## Endpoints

...
```

### 3. Custom Swizzling (Advanced)

Swizzle Docusaurus components to add chat everywhere:

```bash
npm run swizzle @docusaurus/theme-classic Layout -- --wrap
```

Then modify the Layout wrapper to include the floating chat.

## 🔐 Security Configuration

### Environment Variables for Docusaurus

Create `.env.local` in your Docusaurus project:

```bash
# Chatbot API Configuration
NEXT_PUBLIC_CHATBOT_API_ENDPOINT=https://your-chatbot-api.vercel.app/api/chat
NEXT_PUBLIC_CHATBOT_API_KEY=your-api-key
```

### Use Environment Variables in Components

```typescript
const ChatBot: React.FC = () => {
  const apiEndpoint = process.env.NEXT_PUBLIC_CHATBOT_API_ENDPOINT;
  const apiKey = process.env.NEXT_PUBLIC_CHATBOT_API_KEY;
  
  if (!apiEndpoint) {
    return <div>Chat is not configured</div>;
  }
  
  return (
    <ChatBot
      apiEndpoint={apiEndpoint}
      apiKey={apiKey}
    />
  );
};
```

## 🚀 Deployment

### Build and Deploy

```bash
# Build Docusaurus with chat integration
npm run build

# Deploy to your hosting platform
npm run deploy
```

### Vercel Deployment

```json
// vercel.json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "build" }
    }
  ]
}
```

## 🎨 Customization Options

### Theme Integration

The CSS uses Docusaurus CSS variables, so it automatically adapts to:
- Light/dark mode
- Custom color schemes
- Font settings
- Responsive breakpoints

### Custom Styling

Override styles by creating your own CSS module:

```css
/* src/css/custom.css */
.chatbot-custom {
  --chat-primary-color: #your-brand-color;
  --chat-background: #your-background-color;
}
```

### API Configuration

You can customize the chat behavior:

```typescript
<ChatBot
  apiEndpoint="https://your-api.com/chat"
  apiKey="your-key"
  useTools={true}
  welcomeMessage="Custom welcome message"
  height="600px"
/>
```

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your API includes your Docusaurus domain in `ALLOWED_ORIGINS`
2. **Styling Issues**: Check that CSS modules are properly imported
3. **Build Errors**: Ensure all dependencies are installed and compatible

### Debug Mode

Add debug logging to the chat hook:

```typescript
// Add to useChatAPI.ts
console.log('Sending request to:', config.apiEndpoint);
console.log('Request body:', { messages, useTools: config.useTools });
```

This integration provides a complete, production-ready chat interface that seamlessly integrates with your Docusaurus documentation site while maintaining the look and feel of your existing theme! 