# 🌐 Connecting Local Development to Production API

This guide shows you how to connect your local development project to the production chatbot API.

## 🚀 Quick Setup

### Step 1: Update Production CORS Settings

In your production environment (Vercel/Netlify/etc.), update the `ALLOWED_ORIGINS` environment variable:

```bash
# Add your local development URLs to production
ALLOWED_ORIGINS=https://your-docusaurus-site.com,http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
```

### Step 2: Get Your Production URL

Find your production API endpoint:
- **Vercel**: `https://your-app.vercel.app/api/chat`
- **Netlify**: `https://your-app.netlify.app/api/chat` 
- **Custom domain**: `https://yourdomain.com/api/chat`

### Step 3: Configure Local Environment

Create `.env.local` in your local project:

```bash
# Production API Configuration
CHATBOT_API_URL=https://your-app.vercel.app/api/chat
CHATBOT_API_KEY=your-api-key-here  # Only if REQUIRE_API_KEY=true in production
```

## 💻 Usage Examples

### JavaScript/TypeScript

```javascript
const apiUrl = process.env.CHATBOT_API_URL || 'https://your-app.vercel.app/api/chat';
const apiKey = process.env.CHATBOT_API_KEY;

async function askChatbot(question) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: question }],
      useTools: true
    })
  });

  return response.body; // Streaming response
}
```

### React Hook

```jsx
import { useState } from 'react';

function useProdChatbot() {
  const [isLoading, setIsLoading] = useState(false);
  
  const ask = async (question) => {
    setIsLoading(true);
    try {
      const response = await fetch(process.env.CHATBOT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CHATBOT_API_KEY && { 
            'Authorization': `Bearer ${process.env.CHATBOT_API_KEY}` 
          })
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: question }],
          useTools: true
        })
      });
      
      // Handle streaming response here
      return response;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { ask, isLoading };
}
```

### Next.js API Route Proxy

Create `pages/api/chatbot.js` in your local project:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(process.env.CHATBOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CHATBOT_API_KEY && {
          'Authorization': `Bearer ${process.env.CHATBOT_API_KEY}`
        })
      },
      body: JSON.stringify(req.body)
    });

    // Forward the streaming response
    res.setHeader('Content-Type', 'text/plain');
    response.body.pipeTo(new WritableStream({
      write(chunk) {
        res.write(chunk);
      },
      close() {
        res.end();
      }
    }));
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect to chatbot' });
  }
}
```

## 🔒 Security Considerations

### Option 1: API Key Authentication
If your production has `REQUIRE_API_KEY=true`:

1. Get an API key from your production environment
2. Add it to your local `.env.local`
3. Include in Authorization header: `Bearer your-api-key`

### Option 2: IP Allowlisting
For additional security, you can restrict by IP:

```bash
# In production environment
ALLOWED_IPS=127.0.0.1,192.168.1.0/24,your.static.ip.address
```

### Option 3: Development Mode
For testing, temporarily set in production:

```bash
ALLOWED_ORIGINS=*
REQUIRE_API_KEY=false
```

**⚠️ Remember to revert this after testing!**

## 🔧 Troubleshooting

### CORS Errors
```
Access to fetch at 'https://your-app.vercel.app/api/chat' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution**: Add `http://localhost:3000` to `ALLOWED_ORIGINS` in production.

### 401 Unauthorized
```
{"error":"API key required"}
```

**Solution**: Either:
1. Add valid API key to your request headers
2. Set `REQUIRE_API_KEY=false` in production (for testing)

### 429 Rate Limited
```
{"error":"Rate limit exceeded"}
```

**Solution**: Increase rate limits in production:
```bash
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

### Network Errors
**Solution**: Check that your production URL is correct and the service is running.

## 🎯 Production Environment Setup

Update these environment variables in your production deployment:

```bash
# Original production settings
MONGODB_CONNECTION_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SITE=EPCC

# Add local development support
ALLOWED_ORIGINS=https://your-site.com,http://localhost:3000,http://localhost:3001
REQUIRE_API_KEY=true
VALID_API_KEYS=dev-key-123,prod-key-456
RATE_LIMIT_MAX_REQUESTS=50
```

## 📝 Testing Your Connection

Use this simple test:

```bash
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "useTools": true
  }'
```

If successful, you'll see a streaming response with chatbot data! 