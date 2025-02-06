import { InvalidToolArgumentsError, NoSuchToolError, ToolExecutionError, streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { findRelevantContent, findTechnicalContent } from '@/lib/mongoDbRetriever';
import { execGetRequest } from '@/lib/execRequests';
import { z } from 'zod';
// import { AISDKExporter } from 'langsmith/vercel';
import { llmobs } from 'dd-trace';
import * as prompts from '@/constants/prompts';

export async function POST(request: Request) {

    const { messages, useTools } = await request.json();
    // console.log(`useTools: ${useTools}`);
    const latestMessage = messages[messages?.length - 1]?.content;
    const site = process.env.NEXT_PUBLIC_SITE;

    // console.log('messages:-------------------');
    // messages?.map((msg: any) => (
    //     console.log(`role: ${msg.role}, content: ${msg.content ? msg.content.slice(0, 100) + '...' : 'undefined'}`)
    // ));
    
    let context = '';
    let systemPrompt = '';
    let epccTools, epsmTools;
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
        epccTools = {
            getContent: tool({
                description: 'get content from Elastic Path knowledge base',
                parameters: z.object({
                    latestMessage: z.string().describe('the users question'),
                }),
                execute: async ({ latestMessage }) => {
                    const content = await findRelevantContent(latestMessage);
                    if (!content || content.length === 0) {
                        return { content: "No relevant content found." };
                    }
                    return content;
                },
            }),
            getTechnicalContent: tool({
                description: 'get technical content, like API reference and code from Elastic Path API reference',
                parameters: z.object({
                    latestMessage: z.string().describe('the users question'),
                }),
                execute: async ({ latestMessage }) => {
                    const content = await findTechnicalContent(latestMessage);
                    if (!content || content.length === 0) {
                        return { content: "No technical content found." };
                    }
                    return content;
                },
            }),
            execGetRequest: tool({
                description: 'execute a GET request to the specified endpoint once you know the endpoint, token and params. \
                         If you need to get the endpoint, and params, use the getTechnicalContent tool first. \
                         The token needs to be a valid bearer token for the Elastic Path API. \
                         If the token is not included in the tool call, don\'t execute the call and ask for the token first.',
                parameters: z.object({
                    endpoint: z.string().describe('the endpoint to call'),
                    token: z.string().describe('the token to use'),
                    params: z.record(z.string(), z.string()).optional().describe('the parameters to pass to the endpoint'),
                }),
                execute: async ({ endpoint, token, params }) => {
                    try {
                        const result = await execGetRequest(endpoint, token, params);
                        return result || { message: "Request completed but no data returned" };
                    } catch (error: unknown) {
                        if (error instanceof Error) {
                            return { error: error.message };
                        }
                        return { error: "Request failed" };
                    }
                },
            }), 
            // execPostRequest: tool({
            //     description: 'execute a POST request to the specified endpoint once you know the endpoint, token and params. \
            //              If you need to get the endpoint, and params, use the getTechnicalContent tool first. \
            //              The token needs to be a valid bearer token for the Elastic Path API. \
            //              If the token is not included in the tool call, don\'t execute the call and ask for the token first.',
            //     parameters: z.object({
            //         endpoint: z.string().describe('the endpoint to call'),
            //         token: z.string().describe('the token to use'),
            //         body: z.any().describe('the body to pass to the endpoint'),
            //     }),
            //     execute: async ({ endpoint, token, body }) => execPostRequest(endpoint, token, body),
            // }),
            // execPutRequest: tool({
            //     description: 'execute a PUT request to the specified endpoint once you know the endpoint, token and params. \
            //              If you need to get the endpoint, and params, use the getTechnicalContent tool first. \
            //              The token needs to be a valid bearer token for the Elastic Path API. \
            //              If the token is not included in the tool call, don\'t execute the call and ask for the token first.',
            //     parameters: z.object({
            //         endpoint: z.string().describe('the endpoint to call'),
            //         token: z.string().describe('the token to use'),
            //         body: z.any().describe('the body to pass to the endpoint'),
            //     }),
            //     execute: async ({ endpoint, token, body }) => execPutRequest(endpoint, token, body),
            // }), 
        }
    } else {
        systemPrompt = prompts.PROMPT_EPSM_DOCS_INTRO + prompts.PROMPT_EPSM_DOCS_OUTRO;
        epsmTools = {
            getContent: tool({
                description: 'get content from Elastic Path knowledge base',
                parameters: z.object({
                    latestMessage: z.string().describe('the users question'),
                }),
                execute: async ({ latestMessage }) => findRelevantContent(latestMessage),
            }),
        }
    }
    //console.log(`systemPrompt: ${systemPrompt}`);
    // Start a new LLM span
    //llmobs.wrap({ kind: 'tool' }, findRelevantContent);

    try {
        result = streamText({
                model: openai('gpt-4o'),
                messages: [
                { role: "system", content: systemPrompt },
                ...messages
            ],
            //experimental_telemetry: AISDKExporter.getSettings(),
            maxSteps: 10,
            tools: site === 'EPCC' ? epccTools : epsmTools,
            toolChoice: 'auto',
            onFinish: ({ usage, text }) => {
                const { promptTokens, completionTokens, totalTokens } = usage;
                // console.log(`markdown text: ${text}`);
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
            // onStepFinish: (step) => {
            //     // console.log(`step: ${JSON.stringify(step.toolCalls)}`);
            // }
        });

        return result.toDataStreamResponse({
            getErrorMessage: (error: any) => {
                if (NoSuchToolError.isInstance(error)) {
                  return 'The model tried to call a unknown tool.';
                } else if (InvalidToolArgumentsError.isInstance(error)) {
                    console.log(`InvalidToolArgumentsError: ${error.toolName} with arguments: ${error.toolArgs}`);
                  return 'The model called a tool with invalid arguments.';
                } else if (ToolExecutionError.isInstance(error)) {
                  return `An error occurred during tool execution: ${error.message}`;
                } else {
                  return 'An unknown error occurred.';
                }
              },
        });

    } catch (error) {
        console.error('Error in streamText:', error);
        throw error;
    }

    

}