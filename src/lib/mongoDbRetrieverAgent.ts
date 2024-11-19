import { 
    ChatOpenAI, 
    OpenAIEmbeddings 
  } from '@langchain/openai';
  import { 
    AgentExecutor, 
    createOpenAIToolsAgent,
    //type AgentStep 
  } from 'langchain/agents';
  import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
  import { 
    ChatPromptTemplate, 
    MessagesPlaceholder 
  } from '@langchain/core/prompts';
  import { Tool, DynamicTool } from '@langchain/core/tools';
  import { MongoClient } from 'mongodb';
  //import { RunnableSequence } from '@langchain/core/runnables';
  import { AgentConfig } from '../types/agent';
  //import { OpenAIStream } from 'ai';
  import { AIMessageChunk } from '@langchain/core/messages';
  import { concat } from '@langchain/core/utils/stream';
  
  export class MongoDBRetrieverAgent {
    private client!: MongoClient;
    private embeddings!: OpenAIEmbeddings;
    private llm!: ChatOpenAI;
    private vectorStore!: MongoDBAtlasVectorSearch;
    private agent!: AgentExecutor;
    private topK: number;
  
    constructor(config: AgentConfig) {
      this.topK = config.topK || 3;
    }
  
    async init(config: AgentConfig) {
      await this.initialize(config);
    }
  
    private async initialize(config: AgentConfig) {
      // Initialize MongoDB connection
      this.client = new MongoClient(config.mongodbUri);
      await this.client.connect();
      const collection = this.client.db(config.dbName).collection(config.collectionName);
  
      // Initialize OpenAI components
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: config.openaiApiKey,
        modelName: "text-embedding-3-small",
      });
  
      this.llm = new ChatOpenAI({
        modelName: "gpt-4",
        temperature: 0,
        streaming: true,
        openAIApiKey: config.openaiApiKey,
      });
  
      // Initialize vector store
      this.vectorStore = new MongoDBAtlasVectorSearch(
        //collection,
        this.embeddings,
        {
          collection: collection,
          indexName: config.indexName || "vector_index",
        }
      );
  
      // Create and initialize the agent
      await this.initializeAgent();
    }
  
    private async createRetrievalTool(): Promise<Tool> {
      return new DynamicTool({
        name: "MongoDB_Retriever",
        description: "Use this tool to search for information. Input should be a search query.",
        func: async (query: string) => {
          console.log('Executing search for:', query);
          const results = await this.vectorStore.similaritySearch(query, this.topK);
          const formattedResults = results.map(doc => doc.pageContent).join('\n\n');
          console.log('Search results:', formattedResults);
          return formattedResults;
        },
      });
    }
  
    private async initializeAgent() {
      const tools = [await this.createRetrievalTool()];
  
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are a helpful AI assistant. Follow these steps for every question:
1. ALWAYS use the MongoDB_Retriever tool first to search for relevant information
2. After receiving the search results, provide a comprehensive answer based on that information
3. If the search results are not relevant, say so and explain why

Use the search results to provide accurate, informed responses.`],
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
      ]);
  
      const agent = await createOpenAIToolsAgent({
        llm: this.llm,
        tools,
        prompt,
      });
  
      this.agent = new AgentExecutor({
        agent,
        tools,
        verbose: true,
        returnIntermediateSteps: true,
        // streamCallbackHandlers: [{
        //   handleLLMNewToken: async (token: string) => {
        //     console.log('Token received:', token); // Debug log
        //     if (onProgress) {
        //       await onProgress(token);
        //     }
        //   },
        //   handleToolStart: async (tool, input) => {
        //     console.log('Starting tool:', tool.name);
        //   },
        //   handleToolEnd: async (output: string) => {
        //     console.log('Tool output:', output);
        //   }
        // }]
      });
    }
  
    async retrieveRelevantDocuments(query: string) {
      return await this.vectorStore.similaritySearch(query, this.topK);
    }
  
    async answerQuestion(question: string) {
      if (!this.client || !this.client.connect) {
        throw new Error('MongoDB client is not connected. Please call init() first.');
      }
      
      try {
        //let accumulatedResponse = '';
        const response = await this.agent.stream(
          { input: question },
        //   {
        //     callbacks: [{
        //       handleLLMNewToken: async (token: string) => {
        //         if (onProgress && token !== '') {
        //           accumulatedResponse += token;
        //           await onProgress(token);
        //         }
        //       },
        //       handleToolStart: async (tool, input) => {
        //         console.log('Starting tool:', tool.name);
        //       },
        //       handleToolEnd: async (output: string) => {
        //         console.log('Tool output:', output);
        //       },
        //       handleChainEnd: async (outputs: Record<string, any>) => {
        //         console.log('Chain output:', outputs);
        //         // Ensure any remaining content is sent
        //         if (onProgress && outputs.output && outputs.output !== accumulatedResponse) {
        //           await onProgress(outputs.output.slice(accumulatedResponse.length));
        //         }
        //       }
        //     }]
        //   }
        );

        return response;
      } catch (error) {
        console.error('Error in answerQuestion:', error);
        throw error;
      }
    }
  
    async close() {
      await this.client.close();
    }
  
    async streamAnswer(question: string) {
      if (!this.client || !this.client.connect) {
        throw new Error('MongoDB client is not connected. Please call init() first.');
      }

      // Get relevant documents
      const results = await this.vectorStore.similaritySearch(question, this.topK);
      const context = results.map(doc => doc.pageContent).join('\n\n');
      
      // Create prompt with context
      const input = `Context: ${context}\n\nQuestion: ${question}`;
      
      // Create a TransformStream for the response
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Start streaming
      (async () => {
        try {
          const stream = await this.llm.stream(input);
          let full: AIMessageChunk | undefined;
          
          for await (const chunk of stream) {
            // Update the full message
            full = !full ? chunk : concat(full, chunk);
            
            // Send the chunk's content if it exists
            if (chunk.content) {
              const message = `data: ${JSON.stringify({ content: chunk.content })}\n\n`;
              console.log('Streaming message:', message);
              await writer.write(encoder.encode(message));
            }
          }
          
          await writer.close();
        } catch (error) {
          console.error('Streaming error:', error);
          await writer.close();
        }
      })();

      return readable;
    }
  }
