import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { findRelevantContent, findTechnicalContent } from '@/lib/mongoDbRetriever';
import { z } from 'zod';
// import { AISDKExporter } from 'langsmith/vercel';
import { llmobs } from 'dd-trace';


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
    if (!useTools) {
        const content = await findRelevantContent(latestMessage);
        context = content.map(doc => doc.pageContent).join('\n\n');
    }

    const systemPrompt = `You are knowledgeable about Elastic Path products. You can answer any questions about 
            Commerce Manager, 
            Product Experience Manager also known as PXM,
            Cart and Checkout,
            Promotions,
            Composer,
            Payments
            Subscriptions,
            Studio.
            Check Elastic Path knowledge base before answering any questions.
            
            ${useTools ? `Only respond to questions using information from tool calls.   
            ` : `
            Answer the following question based on the context:
            Question: ${latestMessage}
            Context: ${context}
            `}
            If no relevant information is found, respond, 
                "I'm sorry, I don't have enough context to answer that question with confidence. 
                Please try another question, visit https://elasticpath.dev to learn more, or reach out to our support team."
                                
            From the documents returned, after you have answered the question, provide a list of links to the documents that are most relevant to the question.
            They should open in a new tab.
            Build any of the relative links doing the following:
            ${site === 'EPSM' ? `  
            - remove the website/versioned_docs/ prefix
            - replace the .md suffix with .html
            - replace spaces with hyphens
            - replace /version-N.M.x/ with /N.M.x/ for everything except /version-8.6.x/
            - remove /version-8.6.x/ if it exists
            using https://documentation.elasticpath.com/commerce/docs as the root
            ` : `
            - remove the /data_md/ prefix
            - remove the .md suffix
            - replace spaces with hyphens
            using https://elasticpath.dev as the root
            `}
            
            Answer the question in a helpful and comprehensive way. `;

    let result;

    if (!useTools) {

        result =  streamText({
            model: openai('gpt-4o'),
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            // experimental_telemetry: AISDKExporter.getSettings(),
        });
    }

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
                    description: 'get technical content, like API reference from Elastic Path API reference',
                    parameters: z.object({
                        latestMessage: z.string().describe('the users question'),
                    }),
                    execute: async ({ latestMessage }) => findTechnicalContent(latestMessage),
                }),
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


