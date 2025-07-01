import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { findRelevantContent, findTechnicalContent } from '@/lib/mongoDbRetriever';
import { scrapeWebPage, isWebScrapingEnabled, getAvailableScrapingTargets } from '@/lib/webScraper';
// import { execGetRequest } from '@/lib/execRequests';
import { z } from 'zod';
// import { AISDKExporter } from 'langsmith/vercel';
import { llmobs } from 'dd-trace';
import * as prompts from '@/constants/prompts';
import { 
  getClientIP, 
  checkRateLimit, 
  validateApiKey, 
  getCorsHeaders, 
  validateChatRequest 
} from '@/lib/apiSecurity';

// Set maximum duration for this API route (in seconds)
// This prevents timeouts for long AI responses
export const maxDuration = 300; // 5 minutes

// Handle CORS preflight requests
export async function OPTIONS(request: Request) {
    const corsHeaders = getCorsHeaders(request);
    return new Response(null, { status: 200, headers: corsHeaders });
}

// Handle GET requests with clear error message
export async function GET(request: Request) {
    const corsHeaders = getCorsHeaders(request);
    return new Response(
        JSON.stringify({ 
            error: 'Method Not Allowed',
            message: 'This endpoint only supports POST requests. Please send a POST request with a JSON body containing messages.',
            allowedMethods: ['POST', 'OPTIONS'],
            example: {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { messages: [{ role: 'user', content: 'Your question here' }] }
            }
        }),
        {
            status: 405,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Allow': 'POST, OPTIONS'
            },
        }
    );
}

export async function POST(request: Request) {
    const corsHeaders = getCorsHeaders(request);

    try {
        // 1. Rate limiting
        const clientIP = getClientIP(request);
        const rateLimitResult = checkRateLimit(clientIP, {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10')
        });

        if (!rateLimitResult.success) {
            return new Response(
                JSON.stringify({ 
                    error: 'Rate limit exceeded',
                    resetTime: rateLimitResult.resetTime 
                }),
                {
                    status: 429,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
                    },
                }
            );
        }

        // 2. API key validation (if required for external API access)
        const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
        const origin = request.headers.get('origin');
        const referer = request.headers.get('referer');
        
        // Check if this is a request from the hosted UI
        const hostedDomains = [
            process.env.NEXT_PUBLIC_VERCEL_URL || '',
            // Allow additional hosted domains via environment variable
            ...(process.env.HOSTED_DOMAINS?.split(',') || []),
            // Default local development domains
            'localhost:3000',
            'localhost:3001',
            '127.0.0.1:3000',
            // Fallback for known Elastic Path domains
            'chat.elasticpath.dev',
            'chat-smc-elasticpath.dev',
        ].filter(Boolean); // Remove empty strings
        
        const isHostedUI = 
            // Check origin against all hosted domains
            (origin && hostedDomains.some(domain => 
                origin.includes(domain) || 
                origin.includes('localhost') ||
                origin.includes('127.0.0.1')
            )) ||
            // Check referer for /ask or /rfp path or hosted domains
            (referer && (
                referer.includes('/ask') || 
                referer.includes('/rfp') || 
                hostedDomains.some(domain => referer.includes(domain)) ||
                referer.includes('localhost') ||
                referer.includes('127.0.0.1')
            )) ||
            // Direct server-side requests (no origin/referer)
            (!origin && !referer) ||
            // Development mode: treat localhost requests as hosted UI
            (process.env.NODE_ENV === 'development') ||
            // If DEBUG_AUTH is enabled, be more permissive for testing
            (process.env.DEBUG_AUTH === 'true' && !origin && !referer);
        
        // Debug logging for troubleshooting
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
            console.log('Auth Debug:', {
                origin,
                referer,
                hostedDomains,
                isHostedUI,
                requireApiKey: process.env.REQUIRE_API_KEY,
                hasApiKey: !!apiKey
            });
        }
        
        // Only require API key for external API access, not for the hosted chatbot UI
        // BUT: If no API keys are configured, allow all requests (development/testing mode)
        const shouldRequireApiKey = process.env.REQUIRE_API_KEY === 'true' && 
                                   !isHostedUI && 
                                   process.env.VALID_API_KEYS && 
                                   process.env.VALID_API_KEYS.trim() !== '';
        
        if (shouldRequireApiKey && !validateApiKey(apiKey || '')) {
            return new Response(
                JSON.stringify({ 
                    error: 'API key required for external access',
                    message: 'This endpoint requires an API key when accessed from external applications. The hosted chatbot interface does not require an API key.',
                    debug: process.env.DEBUG_AUTH === 'true' ? {
                        isHostedUI,
                        hasValidApiKeys: !!(process.env.VALID_API_KEYS && process.env.VALID_API_KEYS.trim() !== ''),
                        origin,
                        referer
                    } : undefined
                }),
                {
                    status: 401,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                }
            );
        }

        // 3. Request validation
        const body = await request.json();
        
        const validation = validateChatRequest(body);
        if (!validation.valid) {
            console.error('Chat validation failed:', validation.error);
            return new Response(
                JSON.stringify({ error: validation.error }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                }
            );
        }

        const { messages, useTools, mode } = body;
    console.log(`useTools: ${useTools}`);
    console.log(`mode: ${mode}`);
    const latestMessage = messages[messages?.length - 1]?.content;
    console.log(`latestMessage: ${latestMessage}`);
    const site = process.env.NEXT_PUBLIC_SITE;
    console.log(`site: ${site}`);

    console.log('messages:-------------------');
    messages?.map((msg: any) => (
        console.log(`role: ${msg.role}, content: ${msg.content ? msg.content.slice(0, 100) + '...' : 'undefined'}`)
    ));
    
    let context = '';
    let systemPrompt = '';
    let result: any;

    // Handle RFP mode - prioritize RFP content
    if (mode === 'rfp') {
        if (!useTools) {
            const content = await findRelevantContent(latestMessage, 'rfp');
            context = content.map(doc => doc.pageContent).join('\n\n');
            systemPrompt = prompts.PROMPT_RFP_INTRO + `
Answer the following question based on the context, focusing on information relevant to RFP requirements:
Question: ${latestMessage}
Context: ${context}
` + prompts.PROMPT_RFP_OUTRO;
            
            result = streamText({
                model: openai('gpt-4o'),
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                // experimental_telemetry: AISDKExporter.getSettings(),
            });

            const response = result.toDataStreamResponse();
            
            // Add CORS headers to streaming response
            Object.entries(corsHeaders).forEach(([key, value]) => {
                response.headers.set(key, value);
            });
            
            return response;
        } else {
            systemPrompt = prompts.PROMPT_RFP_INTRO + prompts.PROMPT_RFP_WITH_TOOLS + prompts.PROMPT_RFP_OUTRO;
        }
    } else {
        // Standard mode
        if (!useTools) {
            const content = await findRelevantContent(latestMessage);
            context = content.map(doc => doc.pageContent).join('\n\n');
            systemPrompt = prompts.PROMPT_EPCC_DOCS_INTRO + `
                Answer the following question based on the context:
                Question: ${latestMessage}
                Context: ${context}
                ` + prompts.PROMPT_EPCC_DOCS_OUTRO;
                
            result = streamText({
                model: openai('gpt-4o'),
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                // experimental_telemetry: AISDKExporter.getSettings(),
            });

            const response = result.toDataStreamResponse();
            
            // Add CORS headers to streaming response
            Object.entries(corsHeaders).forEach(([key, value]) => {
                response.headers.set(key, value);
            });
            
            return response;
        }
    }

    // Handle tools mode
    if (mode === 'rfp') {
        const scrapingInfo = isWebScrapingEnabled() ? `\n\nWeb Scraping Available: ${getAvailableScrapingTargets()}` : '';
        systemPrompt = prompts.PROMPT_RFP_INTRO + prompts.PROMPT_RFP_WITH_TOOLS + scrapingInfo + prompts.PROMPT_RFP_OUTRO;
    } else if (site === 'EPCC') {
        const scrapingInfo = isWebScrapingEnabled() ? `\n\nWeb Scraping Available: ${getAvailableScrapingTargets()}` : '';
        systemPrompt = prompts.PROMPT_EPCC_DOCS_INTRO + prompts.PROMPT_EPCC_DOCS_WITH_TOOLS + scrapingInfo + prompts.PROMPT_EPCC_DOCS_OUTRO;
    } else {
        const scrapingInfo = isWebScrapingEnabled() ? `\n\nWeb Scraping Available: ${getAvailableScrapingTargets()}` : '';
        systemPrompt = prompts.PROMPT_EPSM_DOCS_INTRO + scrapingInfo + prompts.PROMPT_EPSM_DOCS_OUTRO;
    }
    console.log(`systemPrompt: ${systemPrompt}`);
    // Start a new LLM span
    //llmobs.wrap({ kind: 'tool' }, findRelevantContent);

    result = streamText({
            model: openai('gpt-4o'),
            messages: [
                { role: "system", content: systemPrompt },
                ...messages
            ],
            //experimental_telemetry: AISDKExporter.getSettings(),
            maxSteps: 3,
            tools: {
                getContent: tool({
                    description: mode === 'rfp' ? 'get RFP-focused content from Elastic Path knowledge base, STRONGLY prioritizing RFP collection content over documentation and web content. Focus on pricing, implementation, security, and customer success information from RFP responses.' : 'get content from Elastic Path knowledge base',
                    parameters: z.object({
                        latestMessage: z.string().describe('the users question'),
                    }),
                    execute: async ({ latestMessage }) => findRelevantContent(latestMessage, mode),
                }),
                getTechnicalContent: tool({
                    description: mode === 'rfp' ? 'get technical content for RFP responses, including API reference, architecture details, and integration capabilities' : 'get technical content, like API reference and code from Elastic Path API reference',
                    parameters: z.object({
                        latestMessage: z.string().describe('the users question'),
                    }),
                    execute: async ({ latestMessage }) => findTechnicalContent(latestMessage),
                }),
                scrapeWebPage: tool({
                    description: isWebScrapingEnabled() ? (mode === 'rfp' ? 'scrape content from a whitelisted web page ONLY as a last resort when RFP content and documentation are insufficient. RFP responses should prioritize curated RFP content over web-scraped content.' : 'scrape content from a whitelisted web page. Only URLs that have been specifically allowed can be scraped for security reasons.') : 'web scraping is not enabled. No external URLs can be scraped.',
                    parameters: z.object({
                        url: z.string().describe('the URL to scrape (must be in the allowed whitelist)'),
                    }),
                    execute: async ({ url }) => {
                        if (!isWebScrapingEnabled()) {
                            throw new Error('Web scraping is not enabled. No external URLs can be scraped.');
                        }
                        return await scrapeWebPage(url);
                    },
                }),
                // execGetRequest: tool({
                //     description: 'execute a GET request to the specified endpoint',
                //     parameters: z.object({
                //         endpoint: z.string().describe('the endpoint to call'),
                //         token: z.string().describe('the token to use'),
                //         params: z.record(z.string(), z.string()).describe('the parameters to pass to the endpoint'),
                //     }),
                //     execute: async ({ endpoint, token, params }) => execGetRequest(endpoint, token, params),
                // }),
            },
            onFinish: ({ usage, text }) => {
                const { promptTokens, completionTokens, totalTokens } = usage;
                console.log(`markdown text: ${text}`);
                console.log('Prompt tokens:', promptTokens);
                console.log('Completion tokens:', completionTokens);
                console.log('Total tokens:', totalTokens);
                
                // Only trace with Datadog if DD_API_KEY is available
                if (process.env.DD_API_KEY) {
                    llmobs.trace({ kind: 'llm', name: 'myLLM', modelName: 'gpt-4o', modelProvider: 'openai' }, () => {
                        llmobs.annotate({
                            inputData: [ { content: `${latestMessage}`, role: 'user' }],
                            outputData: { content: `${text}`, role: 'ai' },
                            tags: { host: process.env.NEXT_PUBLIC_VERCEL_URL },
                            metrics: { inputTokens: promptTokens, outputTokens: completionTokens, totalTokens: totalTokens }
                        })
                    })
                }
            },
        });

        const response = result.toDataStreamResponse();
        
        // Add CORS headers to streaming response
        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
        
        return response;

    } catch (error) {
        console.error('Chat API error:', error);
        
        // Enhanced error logging for debugging
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        
        // Check for specific MongoDB connection errors
        if (error && typeof error === 'object' && 'message' in error && 
            typeof error.message === 'string' && error.message.includes('MongoServerSelectionError')) {
            console.error('MongoDB connection failed. Check MONGODB_CONNECTION_URI environment variable.');
        }
        
        // Check for OpenAI API errors
        if (error && typeof error === 'object' && 'message' in error && 
            typeof error.message === 'string' && error.message.includes('OpenAI')) {
            console.error('OpenAI API error. Check OPENAI_API_KEY environment variable.');
        }
        
        return new Response(
            JSON.stringify({ 
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error?.toString() : 'Something went wrong',
                // Add debug info in development
                                 debug: process.env.NODE_ENV === 'development' ? {
                     errorType: error instanceof Error ? error.name : 'Unknown',
                     envVars: {
                         hasMongoUri: !!process.env.MONGODB_CONNECTION_URI,
                         hasOpenAIKey: !!process.env.OPENAI_API_KEY,
                         site: process.env.NEXT_PUBLIC_SITE
                     }
                 } : undefined
            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            }
        );
    }
}