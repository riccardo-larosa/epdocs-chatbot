import { NextResponse } from 'next/server';
import { MongoDBRetrieverAgent } from '@/lib/mongoDbRetrieverAgent';
import { OpenAIStream, streamText } from 'ai';

export async function POST(request: Request) {
  try {
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
    const llmStream = await agent.answerQuestion(input);

    return new Response(llmStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('Error in question route:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}