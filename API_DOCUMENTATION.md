# Elastic Path Chatbot API Documentation

## Overview

The Elastic Path Chatbot provides a REST API endpoint that can be called from external sites and applications. This API leverages OpenAI's GPT-4 model combined with Elastic Path's knowledge base to provide intelligent responses about Elastic Path products and services.

## 📍 Endpoint

```
POST /api/chat
```

## 📝 Request Format

```typescript
interface ChatRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    id?: string;
  }>;
  useTools?: boolean; // Default: true
}
```

### Parameters

- **messages** (required): Array of conversation messages
  - **role**: The role of the message sender (`user`, `assistant`, or `system`)
  - **content**: The message content
  - **id**: Optional unique identifier for the message

- **useTools** (optional): Boolean flag to enable/disable tool usage
  - `true` (default): Uses AI tools for enhanced search and retrieval
  - `false`: Uses direct vector search without tools

## 📤 Example Requests

### 1. Simple Question (with tools enabled)

```javascript
const response = await fetch('https://your-domain.com/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      {
        role: "user",
        content: "What is PXM in Elastic Path?",
        id: crypto.randomUUID()
      }
    ],
    useTools: true
  })
});

// Handle streaming response
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let result = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  result += chunk;
  console.log('Streaming chunk:', chunk);
}
```

### 2. Multi-turn Conversation

```javascript
const conversationHistory = [
  { role: "user", content: "What is Elastic Path Commerce Cloud?" },
  { role: "assistant", content: "Elastic Path Commerce Cloud is..." },
  { role: "user", content: "How do I create a product?" }
];

const response = await fetch('https://your-domain.com/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: conversationHistory,
    useTools: true
  })
});
```

### 3. Direct Context Mode (without tools)

```javascript
const response = await fetch('https://your-domain.com/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      { role: "user", content: "Explain cart functionality" }
    ],
    useTools: false  // Uses direct vector search instead of tools
  })
});
```

## 🛠 Client Implementation Examples

### JavaScript/TypeScript Client

```typescript
class ElasticPathChatAPI {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async sendMessage(
    messages: Array<{role: string, content: string, id?: string}>,
    useTools: boolean = true
  ): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, useTools })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.body!;
  }

  async getSimpleAnswer(question: string): Promise<string> {
    const messages = [{ role: "user", content: question }];
    const stream = await this.sendMessage(messages);
    
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullResponse += decoder.decode(value);
    }

    return fullResponse;
  }
}

// Usage
const chatAPI = new ElasticPathChatAPI('https://your-chatbot-domain.com');
const answer = await chatAPI.getSimpleAnswer('How do I create a promotion?');
console.log(answer);
```

### React Hook for External Integration

```typescript
// useElasticPathChat.ts
import { useState, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

export const useElasticPathChat = (apiEndpoint: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      role: 'user',
      content,
      id: crypto.randomUUID()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiEndpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          useTools: true
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
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
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint, messages]);

  return { messages, sendMessage, isLoading, error };
};
```

### PHP Client Example

```php
<?php
class ElasticPathChatAPI {
    private $baseUrl;
    
    public function __construct($baseUrl) {
        $this->baseUrl = rtrim($baseUrl, '/');
    }
    
    public function sendMessage($messages, $useTools = true) {
        $url = $this->baseUrl . '/api/chat';
        
        $data = [
            'messages' => $messages,
            'useTools' => $useTools
        ];
        
        $options = [
            'http' => [
                'header' => "Content-type: application/json\r\n",
                'method' => 'POST',
                'content' => json_encode($data)
            ]
        ];
        
        $context = stream_context_create($options);
        $result = file_get_contents($url, false, $context);
        
        return $result;
    }
    
    public function askQuestion($question) {
        $messages = [
            ['role' => 'user', 'content' => $question]
        ];
        
        return $this->sendMessage($messages);
    }
}

// Usage
$chat = new ElasticPathChatAPI('https://your-chatbot-domain.com');
$response = $chat->askQuestion('How do I integrate payments?');
echo $response;
?>
```

### Python Client Example

```python
import requests
import json
from typing import List, Dict, Optional

class ElasticPathChatAPI:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
    
    def send_message(self, messages: List[Dict], use_tools: bool = True) -> requests.Response:
        url = f"{self.base_url}/api/chat"
        
        payload = {
            "messages": messages,
            "useTools": use_tools
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, json=payload, headers=headers, stream=True)
        response.raise_for_status()
        
        return response
    
    def ask_question(self, question: str) -> str:
        messages = [{"role": "user", "content": question}]
        response = self.send_message(messages)
        
        result = ""
        for chunk in response.iter_content(chunk_size=1024, decode_unicode=True):
            if chunk:
                result += chunk
        
        return result

# Usage
chat_api = ElasticPathChatAPI('https://your-chatbot-domain.com')
answer = chat_api.ask_question('How do I set up webhooks?')
print(answer)
```

## 🔧 API Features & Capabilities

### Available Tools (when `useTools: true`)

1. **`getContent`** - Searches Elastic Path knowledge base for general documentation
2. **`getTechnicalContent`** - Searches API reference and technical documentation

### Response Format

- **Streaming**: Returns data as Server-Sent Events (SSE)
- **Content-Type**: `text/plain; charset=utf-8`
- **Format**: Raw markdown text chunks that can be rendered or processed as needed

### Environment Variables Required

```bash
MONGODB_CONNECTION_URI=mongodb+srv://...
MONGODB_DATABASE_NAME=epdocs_chatbot
MONGODB_COLLECTION_NAME=documents
MONGODB_API_COLLECTION_NAME=api_documents
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SITE=EPCC  # or EPSM for Elastic Path Self Managed
```

## 🛡 Security Considerations

For production use, consider implementing the following security measures:

### CORS Configuration

```typescript
// Add to your API route
export async function POST(request: Request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Your existing chat logic...
}
```

### Rate Limiting

```typescript
// Implement rate limiting
const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

// Example rate limiting logic (implement according to your needs)
const rateLimitKey = `rate_limit:${clientIP}`;
const requestCount = await redis.incr(rateLimitKey);
if (requestCount === 1) {
  await redis.expire(rateLimitKey, 60); // 1 minute window
}
if (requestCount > 10) { // 10 requests per minute
  return new Response('Rate limit exceeded', { status: 429 });
}
```

### API Key Authentication

```typescript
// Add API key validation
const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
if (!apiKey || !validateApiKey(apiKey)) {
  return new Response('Unauthorized', { status: 401 });
}

function validateApiKey(apiKey: string): boolean {
  // Implement your API key validation logic
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  return validKeys.includes(apiKey);
}
```

## 📊 Response Examples

### Successful Response

The API returns streaming text content. Here's what a typical response might look like:

```
Based on the Elastic Path documentation, PXM (Product Experience Manager) is a comprehensive product information management system that allows you to:

1. **Centralize Product Data**: Store and manage all product information in one place
2. **Create Rich Product Experiences**: Build detailed product catalogs with multimedia content
3. **Manage Product Hierarchies**: Organize products using flexible category structures

For more detailed information, you can visit the [PXM Documentation](https://elasticpath.dev/docs/pxm/products/pxm-products).
```

### Error Response

```json
{
  "error": "Bad Request",
  "message": "Invalid message format",
  "status": 400
}
```

## 🚀 Integration Examples

### Embedding in a Website

```html
<!DOCTYPE html>
<html>
<head>
    <title>Elastic Path Help</title>
</head>
<body>
    <div id="chat-container">
        <div id="messages"></div>
        <input type="text" id="question-input" placeholder="Ask a question...">
        <button onclick="askQuestion()">Send</button>
    </div>

    <script>
        async function askQuestion() {
            const input = document.getElementById('question-input');
            const question = input.value.trim();
            if (!question) return;

            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML += `<div><strong>You:</strong> ${question}</div>`;
            
            const response = await fetch('https://your-chatbot-domain.com/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: question }],
                    useTools: true
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let answer = '';

            messagesDiv.innerHTML += `<div><strong>Assistant:</strong> <span id="streaming-answer"></span></div>`;
            const answerSpan = document.getElementById('streaming-answer');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                answer += chunk;
                answerSpan.textContent = answer;
            }

            input.value = '';
        }
    </script>
</body>
</html>
```

### WordPress Plugin Integration

```php
<?php
// WordPress shortcode for Elastic Path chat
function elastic_path_chat_shortcode($atts) {
    $atts = shortcode_atts(array(
        'endpoint' => 'https://your-chatbot-domain.com',
        'placeholder' => 'Ask about Elastic Path...'
    ), $atts);

    ob_start();
    ?>
    <div class="ep-chat-widget">
        <input type="text" id="ep-question" placeholder="<?php echo esc_attr($atts['placeholder']); ?>">
        <button onclick="epAskQuestion('<?php echo esc_js($atts['endpoint']); ?>')">Ask</button>
        <div id="ep-answer"></div>
    </div>
    
    <script>
        async function epAskQuestion(endpoint) {
            const question = document.getElementById('ep-question').value;
            const answerDiv = document.getElementById('ep-answer');
            
            const response = await fetch(endpoint + '/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: question }]
                })
            });
            
            // Handle streaming response...
        }
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('elastic_path_chat', 'elastic_path_chat_shortcode');
?>
```

## 📝 Best Practices

1. **Handle Streaming Responses**: Always implement proper streaming response handling for real-time user experience
2. **Error Handling**: Implement robust error handling for network issues and API errors
3. **Rate Limiting**: Respect rate limits and implement client-side throttling
4. **Conversation Context**: Maintain conversation history for multi-turn interactions
5. **Security**: Use HTTPS and implement proper authentication for production use
6. **Caching**: Consider caching frequently asked questions to reduce API calls

## 🔗 Related Resources

- [Elastic Path Documentation](https://elasticpath.dev)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Server-Sent Events (SSE) Guide](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

## 📞 Support

For API support and questions, please reach out to the Elastic Path support team or create an issue in this repository. 