// import { NextRequest, NextResponse } from 'next/server';
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { findRelevantContent } from '@/lib/mongoDbRetriever';
import { z } from 'zod';

// const findRelevantContent = async (question: string) => {
//     const config = {
//         mongodbUri: process.env.MONGODB_CONNECTION_URI!,
//         dbName: process.env.MONGODB_DATABASE_NAME!,
//         collectionName: process.env.MONGODB_COLLECTION_NAME!,
//         openaiApiKey: process.env.OPENAI_API_KEY!,
//         topK: 3,
//         indexName: "vector_index",
//     };

//     const agent = new MongoDBRetriever();
//     await agent.init(config);

//     // Get relevant documents
//     console.log(`question: ${question}`);
//     const results = await agent.similaritySearch(question);
//     const context = results.map(doc => doc.pageContent).join('\n\n');
//     // log the first 100 characters of the context
//     console.log(`context: ${context.slice(0, 100)}`);
//     return context;

// }

export async function POST(request: Request) {

    const { messages } = await request.json();
    const latestMessage = messages[messages?.length - 1]?.content;
    console.log(`latestMessage: ${latestMessage}`);

    messages?.map((msg: any) => (
        console.log(`role: ${msg.role}, content: ${msg.content}`)
    ));
    
    // const context = await findRelevantContent(latestMessage);

    // const assistantPrompt = `You are a helpful assistant. 
    //     Answer the following question based on the context:
    //     ${context}
    //     `;
    const assistantPrompt = `You are knowledgeable about Elastic Path products. You can answer any questions about 
        Commerce Manager, 
        Product Experience Manager also known as PXM,
        Cart and Checkout,
        Promotions,
        Composer,
        Payments
        Subscriptions,
        Studio.
        Check Elastic Path knowledge base before answering any questions.
        Only respond to questions using information from tool calls.
        if no relevant information is found in the tool calls, respond, "Sorry, I don't know."
        From the documents returned, after you have answered the question, provide a list of links to the documents that are most relevant to the question.
        Build any of the relative links doing the following:
        - remove the /data_md/ prefix
        - remove the .md suffix
        - replace spaces with hyphens
        using https://elasticpath.dev as the root`;

    const result = streamText({
        model: openai('gpt-4o'),
        messages: [
            { role: "assistant", content: assistantPrompt },
            //{ role: "user", content: `.. ${latestMessage}` }, // this is already in the messages array
            ...messages
        ],

        maxSteps: 3,
        tools: {
            getContent: tool({
                description: 'get content from Elastic Path knowledge base',
                parameters: z.object({
                    latestMessage: z.string().describe('the users question'),
                }),
                execute: async ({ latestMessage }) => findRelevantContent(latestMessage),
            })
        },
        // maxToolRoundtrips: 3,
        //toolChoice: 'required',
        onFinish: ({ usage }) => {
            const { promptTokens, completionTokens, totalTokens } = usage;
            // your own logic, e.g. for saving the chat history or recording usage
            console.log('Prompt tokens:', promptTokens);
            console.log('Completion tokens:', completionTokens);
            console.log('Total tokens:', totalTokens);
        },
    });

    return result.toDataStreamResponse();

}


