# Timeout Troubleshooting Guide

## 🔍 Problem Description

The chatbot was experiencing timeout issues during long AI responses, particularly when:
- Generating comprehensive, detailed answers
- Processing complex questions requiring multiple tool calls
- Handling API requests that exceed default timeout limits

## 🛠️ Solutions Implemented

### 1. **Server-Side Timeout Configuration**

#### Vercel Function Timeout
- **Added**: `export const maxDuration = 300;` in `/api/chat/route.ts`
- **Added**: `vercel.json` configuration with 5-minute timeout
- **Result**: Extended server timeout from default (10-15s) to 5 minutes

```typescript
// src/app/api/chat/route.ts
export const maxDuration = 300; // 5 minutes
```

```json
// vercel.json
{
  "functions": {
    "src/app/api/chat/route.ts": {
      "maxDuration": 300
    }
  }
}
```

### 2. **Client-Side Timeout Handling**

#### Enhanced useChat Configuration
- **Added**: 5-minute timeout on frontend requests
- **Added**: Proper error handling for timeout scenarios
- **Added**: User feedback during long processing times

```typescript
const { messages, input, handleInputChange, handleSubmit, error, append, isLoading } = useChat({
  api: '/api/chat',
  body: { useTools: true },
  timeout: 300000, // 5 minutes
  onError: (error) => {
    if (error.message?.includes('timeout')) {
      console.warn('Request timed out - this can happen with very long responses');
    }
  }
});
```

### 3. **User Experience Improvements**

#### Timeout Warning Component
- **Shows warning** after 30 seconds of processing
- **Provides tips** for faster responses
- **Manages user expectations** during long operations

#### Enhanced Error Handling
- **Distinguishes** between timeout and other errors
- **Provides actionable advice** for users
- **Includes retry functionality**

## 📊 Timeout Limits

| Component | Previous Limit | New Limit | Notes |
|-----------|----------------|-----------|-------|
| Vercel Function | 10-15 seconds | 5 minutes | Server-side processing |
| Frontend Request | Browser default (~30s) | 5 minutes | Client-side timeout |
| User Warning | None | 30 seconds | Proactive user feedback |

## 🚀 Performance Optimizations

### 1. **Streaming Response Handling**
- Maintains real-time streaming for immediate feedback
- Proper chunk processing and error recovery
- Optimized memory usage during long responses

### 2. **Request Optimization**
- Efficient MongoDB queries in retrieval tools
- Proper connection pooling and caching
- Optimized prompt engineering to reduce token usage

## 🔧 Configuration Files

### Environment Variables
```bash
# Optional: Adjust these for different timeout preferences
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

### Vercel Configuration
```json
{
  "functions": {
    "src/app/api/chat/route.ts": {
      "maxDuration": 300
    }
  },
  "regions": ["iad1"],
  "buildCommand": "npm run build"
}
```

## 🎯 Best Practices for Users

### To Avoid Timeouts
1. **Break complex questions** into smaller, focused parts
2. **Be specific** about what you need rather than asking broad questions
3. **Ask one topic at a time** instead of multiple questions together

### Example Transformations

❌ **Problematic (likely to timeout):**
> "Can you explain everything about PXM, including all the APIs, how to set up products, categories, hierarchies, inventory management, pricing, promotions, and give me complete code examples for each with error handling?"

✅ **Better (fast response):**
> "How do I create a product in PXM using the API?"

Then follow up with:
> "How do I add that product to a category?"

## 🐛 Debugging Timeout Issues

### Check These First
1. **Browser Network Tab**: Look for requests exceeding 5 minutes
2. **Server Logs**: Check for `maxDuration` exceeded errors
3. **Error Messages**: Look for "timeout" or "aborted" keywords

### Server-Side Debug
```typescript
// Add to route.ts for debugging
console.log('Request started:', new Date().toISOString());
// ... processing ...
console.log('Request completed:', new Date().toISOString());
```

### Client-Side Debug
```typescript
// Enable in development
const timeStart = Date.now();
// ... after response ...
console.log(`Request took: ${Date.now() - timeStart}ms`);
```

## 🔄 Monitoring and Alerts

### Vercel Dashboard
- Monitor function duration in Vercel dashboard
- Set up alerts for functions approaching timeout limits
- Track error rates and response times

### User Feedback
- Monitor user reports of timeout issues
- Track completion rates of different question types
- Analyze patterns in timeout occurrences

## 📝 Future Improvements

### Potential Enhancements
1. **Adaptive Timeouts**: Adjust timeout based on question complexity
2. **Progressive Response**: Show partial results during processing
3. **Caching Layer**: Cache common responses to reduce processing time
4. **Load Balancing**: Distribute heavy requests across multiple regions

### Performance Monitoring
1. **Response Time Analytics**: Track average response times by question type
2. **Timeout Rate Tracking**: Monitor percentage of requests timing out
3. **User Satisfaction**: Measure user completion rates and feedback

## 🚨 Emergency Procedures

### If Timeouts Persist
1. **Increase maxDuration** in both route.ts and vercel.json
2. **Check MongoDB connection** performance and optimization
3. **Review OpenAI API** response times and quotas
4. **Consider request queuing** for high-complexity questions

### Rollback Plan
1. Remove timeout configurations to return to defaults
2. Revert to simpler error handling
3. Disable timeout warnings temporarily
4. Monitor system recovery

---

This guide should be reviewed and updated as the system evolves and new timeout-related issues are discovered. 