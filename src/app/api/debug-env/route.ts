import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    // Only allow this in development or when DEBUG_AUTH is enabled
    if (process.env.NODE_ENV === 'production' && process.env.DEBUG_AUTH !== 'true') {
        return new Response(
            JSON.stringify({ error: 'Debug endpoint disabled in production' }),
            { 
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    const debugInfo = {
        environment: process.env.NODE_ENV,
        requireApiKey: process.env.REQUIRE_API_KEY,
        hasValidApiKeys: !!(process.env.VALID_API_KEYS && process.env.VALID_API_KEYS.trim() !== ''),
        validApiKeysCount: process.env.VALID_API_KEYS ? process.env.VALID_API_KEYS.split(',').length : 0,
        debugAuth: process.env.DEBUG_AUTH,
        hostedDomains: process.env.HOSTED_DOMAINS?.split(',') || [],
        nextPublicVercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
        requestHeaders: {
            origin: request.headers.get('origin'),
            referer: request.headers.get('referer'),
            userAgent: request.headers.get('user-agent'),
        },
        timestamp: new Date().toISOString(),
    };

    return new Response(
        JSON.stringify(debugInfo, null, 2),
        {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        }
    );
} 