# EPSM Error Troubleshooting Guide

## 🔍 Problem Description

Users were experiencing an error when using the EPSM (Elastic Path Self Managed) version of the chatbot:

```
Error: {"error":"Each message must have role and content"}
```

This error occurred during message validation, preventing the chatbot from processing user requests.

## 🛠️ Root Cause Analysis

The issue was caused by **strict message validation** that didn't account for the different message formats that the AI SDK can send:

### 1. **AI SDK Message Format Evolution**
Different versions of the AI SDK and different scenarios can produce messages with varying structures:

- **Standard format**: `{ role: "user", content: "Hello" }`
- **Parts-based format**: `{ role: "user", parts: [{ type: "text", text: "Hello" }] }`
- **Empty assistant messages**: `{ role: "assistant", content: "" }` (during streaming)

### 2. **Original Validation Logic**
The original validation was too rigid:

```typescript
// OLD - Too strict
for (const message of messages) {
  if (!message.role || !message.content) {
    return { valid: false, error: 'Each message must have role and content' };
  }
  // ...
}
```

This failed when:
- Messages had `parts` arrays instead of `content`
- Assistant messages had empty content during streaming
- Different AI SDK versions sent slightly different formats

## ✅ Solution Implemented

### 1. **Enhanced Message Format Support**
Updated validation to handle multiple message formats:

```typescript
// NEW - Flexible validation
let messageContent = '';

// Check if message has content property
if (message.content !== undefined && message.content !== null) {
  messageContent = message.content;
}
// Check if message has parts array (AI SDK v5+ format)
else if (Array.isArray(message.parts)) {
  // Extract text from parts array
  const textParts = message.parts.filter((part: any) => part.type === 'text');
  messageContent = textParts.map((part: any) => part.text || '').join(' ');
}
// Handle other possible formats
else if (message.text !== undefined) {
  messageContent = message.text;
}
```

### 2. **Streaming-Aware Validation**
Allow empty assistant messages during streaming:

```typescript
// Allow empty content for assistant messages that might be streaming
if (message.role === 'assistant' && (!messageContent || messageContent.trim() === '')) {
  // This is okay for streaming responses
  continue;
}
```

### 3. **Better Error Messages**
Provide detailed error information with message index:

```typescript
return { 
  valid: false, 
  error: `Message at index ${i} is missing content property` 
};
```

### 4. **Debug Logging**
Added comprehensive logging to help diagnose issues:

```typescript
console.log('Request body structure:', {
  hasMessages: !!body.messages,
  messagesType: typeof body.messages,
  messagesLength: Array.isArray(body.messages) ? body.messages.length : 'not array',
  useTools: body.useTools,
  bodyKeys: Object.keys(body || {}),
  firstMessage: body.messages?.[0] ? {
    hasRole: !!body.messages[0].role,
    hasContent: !!body.messages[0].content,
    role: body.messages[0].role,
    contentType: typeof body.messages[0].content,
    contentLength: body.messages[0].content?.length || 0,
    messageKeys: Object.keys(body.messages[0] || {})
  } : 'no first message'
});
```

## 🔍 Debugging Steps

If you encounter similar validation errors:

### 1. **Check the Logs**
Look for debug output in your server logs that shows:
- Message structure
- Content types
- Missing properties

### 2. **Inspect Network Requests**
Use browser developer tools to examine the actual request being sent:
- Open DevTools → Network tab
- Look for POST requests to `/api/chat`
- Examine the request body structure

### 3. **Test Different Scenarios**
- Test with simple messages
- Test with empty messages
- Test after conversation history builds up

### 4. **Environment Differences**
Check if the issue occurs:
- Only with EPSM (`NEXT_PUBLIC_SITE=EPSM`)
- Only with certain message types
- Only after certain user actions

## 🛡️ Prevention Strategies

### 1. **Robust Validation**
Always validate for multiple message formats:
```typescript
// Handle different possible content sources
const getMessageContent = (message: any): string => {
  if (message.content) return message.content;
  if (message.parts) {
    return message.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text || '')
      .join(' ');
  }
  if (message.text) return message.text;
  return '';
};
```

### 2. **Comprehensive Testing**
Test with:
- Different AI SDK versions
- Various message patterns
- Both EPCC and EPSM configurations
- Streaming and non-streaming scenarios

### 3. **Progressive Enhancement**
Design validation to be:
- **Permissive**: Accept various valid formats
- **Informative**: Provide detailed error messages
- **Backwards Compatible**: Work with older SDK versions

## 📊 Common Message Formats

| Format | Example | When Used |
|--------|---------|-----------|
| Standard | `{role: "user", content: "Hello"}` | Basic text messages |
| Parts-based | `{role: "user", parts: [{type: "text", text: "Hello"}]}` | AI SDK v5+, multimodal |
| Empty Assistant | `{role: "assistant", content: ""}` | During streaming |
| Tool Messages | `{role: "assistant", parts: [{type: "tool-call", ...}]}` | Tool usage |

## 🔄 Migration Notes

If upgrading AI SDK versions:

1. **Test message validation** thoroughly
2. **Check for breaking changes** in message formats
3. **Update validation logic** to handle new formats
4. **Monitor error rates** after deployment

---

**Note**: This fix resolves the immediate validation error and makes the system more robust for future AI SDK updates and different usage patterns. 