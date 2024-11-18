import { NextResponse } from 'next/server';
import { MongoDBRetrieverAgent } from '@/lib/mongoDbRetrieverAgent';
import { streamText } from 'ai';
//import { OpenAIStream, StreamingTextResponse } from "ai";
import { openai } from '@ai-sdk/openai';

export async function POST(request: Request) {
  try {
    // note: because we are using useCompletion instead of useChat, 
    // we are not using the messages array in the request body
    // just the prompt
    const { prompt } = await request.json();
    
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
    const results = await agent.retrieveRelevantDocuments(prompt);
    const context = results.map(doc => doc.pageContent).join('\n\n');
    
    // Create prompt with context
    const input = `Context: ${context}\n\nQuestion: ${prompt}`;
    
    // Create a stream
    const result = await streamText({
      model: openai('gpt-4o'),
      messages: [{ role: 'user', content: input }],
    });

    return result.toDataStreamResponse();


  } catch (error) {
    console.error('Error in question route:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}