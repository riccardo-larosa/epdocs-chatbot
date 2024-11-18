import { ChatOpenAI } from '@langchain/openai';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { MongoDBRetrieverAgent } from '@/lib/mongoDbRetrieverAgent';

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const question = messages[messages.length - 1].content;
        console.log(`question: ${question}`);

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
        const results = await agent.retrieveRelevantDocuments(question);
        const context = results.map(doc => doc.pageContent).join('\n\n');
        console.log(`context: ${context}`);

        const systemPrompt = 
                `Answer the following question based on the context:

                Question: ${question}
                Context: ${context}

                Answer the question in a helpful and comprehensive way.`;

        console.log(`systemPrompt: ${systemPrompt}`);
        const model = new ChatOpenAI({
            temperature: 0.8,
            streaming: true,
        });

        const result = await streamText({
            model: openai('gpt-4o'),
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
        });

        return result.toDataStreamResponse();
    }
    catch (e: any) {
        console.log(`Error: ${e.message}`);
        return Response.json({ message: 'Error Processing' + e.message }, { status: 500 });
    }
}