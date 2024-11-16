import { NextResponse } from 'next/server';
import { MongoDBRetrieverAgent } from '@/lib/mongoDbRetrieverAgent';

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    
    const config = {
      mongodbUri: process.env.MONGODB_CONNECTION_URI!,
      dbName: process.env.MONGODB_DATABASE_NAME!,
      collectionName: process.env.MONGODB_COLLECTION_NAME!,
      openaiApiKey: process.env.OPENAI_API_KEY!,
      topK: 3,
      indexName: "vector_index",
    };

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start streaming response
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    // Process in background
    console.log('Creating agent...');
    const agent = new MongoDBRetrieverAgent(config);
    console.log('Initializing agent...');
    await agent.init(config);
    
    console.log('Starting to process question...');
    try {
      await agent.answerQuestion(question, async (chunk: string) => {
        console.log('Writing chunk:', chunk);
        await writer.write(encoder.encode(`data: ${chunk}\n\n`));
      });
      console.log('Finished processing question');
    } finally {
      await writer.close();
      await agent.close();
    }

    return response;
  } catch (error) {
    console.error('Error in question route:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}