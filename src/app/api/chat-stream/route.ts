import { NextRequest, NextResponse } from 'next/server';
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { MongoDBRetrieverAgent } from '@/lib/mongoDbRetrieverAgent';
import { z } from 'zod';

const findRelevantContent = async (question: string) => {
    const config = {
        mongodbUri: process.env.MONGODB_CONNECTION_URI!,
        dbName: process.env.MONGODB_DATABASE_NAME!,
        collectionName: process.env.MONGODB_COLLECTION_NAME!,
        openaiApiKey: process.env.OPENAI_API_KEY!,
        topK: 3,
        indexName: "vector_index",
    };

    const agent = new MongoDBRetrieverAgent(config);
    await agent.init(config);

    // Get relevant documents
    console.log(`question: ${question}`);
    const results = await agent.retrieveRelevantDocuments(question);
    const context = results.map(doc => doc.pageContent).join('\n\n');
    // log the first 100 characters of the context
    console.log(`context: ${context.slice(0, 100)}`);
    return context;

}

export async function POST(request: Request) {

    const { messages } = await request.json();
    const latestMessage = messages[messages?.length - 1]?.content;
    console.log(`latestMessage: ${latestMessage}`);

    messages?.map((msg: any) => (
        console.log(`role: ${msg.role}, content: ${msg.content}`)
    ));
    
    const context = await findRelevantContent(latestMessage);

    const assistantPrompt = `You are a helpful assistant. 
        Answer the following question based on the context:
        ${context}
        `;

    const result = await streamText({
        model: openai('gpt-4-turbo'),
        messages: [
            { role: "assistant", content: assistantPrompt },
            { role: "user", content: `.. ${latestMessage}` }
        ],
        // experimental_toolCallStreaming: true,
        // tools: {
        //     getContent: tool({
        //         description: 'get content from your knowledge base',
        //         parameters: z.object({
        //             latestMessage: z.string().describe('the users question'),
        //         }),
        //         execute: async ({ latestMessage }) => findRelevantContent(latestMessage),
        //     })
        // }
    });

    return result.toDataStreamResponse();

}


