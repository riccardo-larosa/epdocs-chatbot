import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { findRelevantContent, findTechnicalContent } from '@/lib/mongoDbRetriever';
// import { execGetRequest } from '@/lib/execRequests';
import { z } from 'zod';
// import { AISDKExporter } from 'langsmith/vercel';
import { llmobs } from 'dd-trace';
import * as prompts from '@/constants/prompts';

export async function POST(request: Request) {

    const { messages, useTools } = await request.json();
    console.log(`useTools: ${useTools}`);
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

    if (!useTools) {
        const content = await findRelevantContent(latestMessage);
        context = content.map(doc => doc.pageContent).join('\n\n');
        systemPrompt = prompts.PROMPT_EPCC_DOCS_INTRO + `
            Answer the following question based on the context:
            Question: ${latestMessage}
            Context: ${context}
            ` + prompts.PROMPT_EPCC_DOCS_OUTRO;
        result =  streamText({
            model: openai('gpt-4o'),
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            // experimental_telemetry: AISDKExporter.getSettings(),
        });

        return result.toDataStreamResponse();
    }

    if (site === 'EPCC') {
        systemPrompt = prompts.PROMPT_EPCC_DOCS_INTRO + prompts.PROMPT_EPCC_DOCS_WITH_TOOLS + prompts.PROMPT_EPCC_DOCS_OUTRO;
    } else {
        systemPrompt = prompts.PROMPT_EPSM_DOCS_INTRO + prompts.PROMPT_EPSM_DOCS_OUTRO;
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
                    description: 'get content from Elastic Path knowledge base',
                    parameters: z.object({
                        latestMessage: z.string().describe('the users question'),
                    }),
                    execute: async ({ latestMessage }) => findRelevantContent(latestMessage),
                }),
                getTechnicalContent: tool({
                    description: 'get technical content, like API reference and code from Elastic Path API reference',
                    parameters: z.object({
                        latestMessage: z.string().describe('the users question'),
                    }),
                    execute: async ({ latestMessage }) => findTechnicalContent(latestMessage),
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
                llmobs.trace({ kind: 'llm', name: 'myLLM', modelName: 'gpt-4o', modelProvider: 'openai' }, () => {
                    llmobs.annotate({
                        inputData: [ { content: `${latestMessage}`, role: 'user' }],
                        outputData: { content: `${text}`, role: 'ai' },
                        tags: { host: process.env.NEXT_PUBLIC_VERCEL_URL },
                        metrics: { inputTokens: promptTokens, outputTokens: completionTokens, totalTokens: totalTokens }
                    })
                })
            },
        });

    return result.toDataStreamResponse();

}