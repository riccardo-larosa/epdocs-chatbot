# 🚨 Deployment Fix: "Unauthorized" Error on Hosted Chatbot

## Issue
The hosted chatbot at `chat.elasticpath.dev/ask` was returning `{"error":"Unauthorized"}` because the API security middleware was incorrectly requiring API keys for the hosted UI.

## ✅ Fix Applied

### Code Changes
1. **Updated API Route Logic**: Modified `src/app/api/chat/route.ts` to distinguish between:
   - **Hosted UI requests** (from `/ask` page) - ❌ No API key required
   - **External API requests** (from other applications) - ✅ API key required (if enabled)

2. **Smart Origin Detection**: The API now checks:
   - `origin` header matches the hosted domain
   - `referer` header contains `/ask` or the hosted domain
   - Server-side requests (no origin/referer)

### Environment Variable Required

**CRITICAL**: You must set these environment variables in your production deployment:

```bash
# Primary domain (for your main deployment)
NEXT_PUBLIC_VERCEL_URL=https://chat.elasticpath.dev

# Additional hosted domains (for multiple deployments)
HOSTED_DOMAINS=chat.elasticpath.dev,chat-smc-elasticpath.dev
```

**For multiple deployments**: Each deployment should have both variables set with the same values.

## 🚀 Deployment Steps

### 1. Update Environment Variables

In your deployment platform (Vercel/Netlify/etc.), ensure these are set:

```bash
# REQUIRED: Your actual domains
NEXT_PUBLIC_VERCEL_URL=https://chat.elasticpath.dev
HOSTED_DOMAINS=chat.elasticpath.dev,chat-smc-elasticpath.dev

# API Security (these control external API access only)
REQUIRE_API_KEY=true
VALID_API_KEYS=your-api-key-1,your-api-key-2

# Optional: Enable debug logging for troubleshooting
# DEBUG_AUTH=true

# Other required variables
MONGODB_CONNECTION_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SITE=EPCC
```

### 2. Deploy the Updated Code

```bash
git add -A
git commit -m "Fix: Allow hosted chatbot UI without API key

- Distinguish between hosted UI and external API requests
- Only require API keys for external integrations
- Update environment configuration docs"

git push origin api-enablement
```

### 3. Verify the Fix

After deployment, test:

1. **Hosted UI** (should work): `https://chat.elasticpath.dev/ask`
2. **External API** (should require API key):
   ```bash
   # Without API key - should work for hosted domain
   curl -X POST https://chat.elasticpath.dev/api/chat \
     -H "Content-Type: application/json" \
     -H "Origin: https://chat.elasticpath.dev" \
     -d '{"messages":[{"role":"user","content":"test"}]}'
   
   # From external domain - should require API key
   curl -X POST https://chat.elasticpath.dev/api/chat \
     -H "Content-Type: application/json" \
     -H "Origin: https://external-site.com" \
     -d '{"messages":[{"role":"user","content":"test"}]}'
   ```

## 🔧 How It Works Now

### Hosted Chatbot UI (`/ask` page)
- ✅ **Always works** without API key
- Users can chat directly on your site
- No authentication required

### External API Access
- 🔒 **Requires API key** (if `REQUIRE_API_KEY=true`)
- Perfect for Docusaurus integrations
- Controlled access for external applications

### Detection Logic
```typescript
const hostedDomains = [
    process.env.NEXT_PUBLIC_VERCEL_URL,
    ...(process.env.HOSTED_DOMAINS?.split(',') || []),
    'localhost:3000', // Local development
    'chat.elasticpath.dev', // Fallback
    'chat-smc-elasticpath.dev', // Fallback
];

const isHostedUI = (origin && hostedDomains.some(domain => origin.includes(domain))) ||
                   (referer && referer.includes('/ask')) ||
                   (!origin && !referer); // Server-side

if (REQUIRE_API_KEY && !isHostedUI && !validApiKey) {
    return unauthorized();
}
```

## 🎯 Key Benefits

1. **User-Friendly**: Hosted chatbot works immediately
2. **Secure**: External API access is controlled
3. **Flexible**: Different rules for different use cases
4. **Clear Errors**: Better error messages for developers

## 📝 Updated Error Messages

- **Before**: `{"error":"Unauthorized"}`
- **After**: `{"error":"API key required for external access","message":"This endpoint requires an API key when accessed from external applications. The hosted chatbot interface does not require an API key."}`

The fix ensures your hosted chatbot works seamlessly while maintaining security for external API integrations! 