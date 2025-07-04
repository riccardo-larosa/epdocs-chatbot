interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

// Simple in-memory rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  return forwarded?.split(',')[0] || realIP || cfConnectingIP || 'unknown';
}

export function checkRateLimit(
  clientIP: string, 
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }
): RateLimitResult {
  const now = Date.now();
  
  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  const clientData = rateLimitStore.get(clientIP);
  
  if (!clientData || clientData.resetTime < now) {
    // First request or window expired
    rateLimitStore.set(clientIP, {
      count: 1,
      resetTime: now + config.windowMs
    });
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    };
  }
  
  if (clientData.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: clientData.resetTime
    };
  }
  
  // Increment counter
  rateLimitStore.set(clientIP, {
    count: clientData.count + 1,
    resetTime: clientData.resetTime
  });
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - clientData.count - 1,
    resetTime: clientData.resetTime
  };
}

export function validateApiKey(apiKey: string): boolean {
  if (!apiKey) return false;
  
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  // If no API keys are configured, allow all requests (development mode)
  if (validKeys.length === 0) {
    console.warn('No API keys configured. Consider setting VALID_API_KEYS for production.');
    return true;
  }
  
  return validKeys.includes(apiKey);
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
  
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    corsHeaders['Access-Control-Allow-Origin'] = origin || '*';
  }
  
  return corsHeaders;
}

export function validateChatRequest(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  
  const { messages, useTools } = body;
  
  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, error: 'Messages array is required and cannot be empty' };
  }
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    // More detailed validation with index information
    if (!message || typeof message !== 'object') {
      return { valid: false, error: `Message at index ${i} is not an object` };
    }
    
    if (!message.role) {
      return { valid: false, error: `Message at index ${i} is missing role property` };
    }
    
    if (!['user', 'assistant', 'system'].includes(message.role)) {
      return { valid: false, error: `Message at index ${i} has invalid role: ${message.role}` };
    }
    
    // Handle different message formats from AI SDK
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
    
    // Allow empty content for assistant messages that might be streaming
    if (message.role === 'assistant' && (!messageContent || messageContent.trim() === '')) {
      // This is okay for streaming responses
      continue;
    }
    
    // Validate content type
    if (messageContent !== undefined && typeof messageContent !== 'string') {
      return { valid: false, error: `Message at index ${i} content must be a string, got ${typeof messageContent}` };
    }
    
    // Only require non-empty content for user messages
    if (message.role === 'user' && (!messageContent || messageContent.trim().length === 0)) {
      return { valid: false, error: `User message at index ${i} cannot have empty content` };
    }
    
    // For user messages, ensure we have some content
    if (message.role === 'user' && !messageContent) {
      return { valid: false, error: `User message at index ${i} is missing content` };
    }
  }
  
  if (useTools !== undefined && typeof useTools !== 'boolean') {
    return { valid: false, error: 'useTools must be a boolean' };
  }
  
  return { valid: true };
} 