import { 
    ChatOpenAI, 
    OpenAIEmbeddings 
  } from '@langchain/openai';
  import { 
    AgentExecutor, 
    createOpenAIToolsAgent,
    type AgentStep 
  } from 'langchain/agents';
  import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
  import { 
    ChatPromptTemplate, 
    MessagesPlaceholder 
  } from '@langchain/core/prompts';
  import { Tool, DynamicTool } from '@langchain/core/tools';
  import { MongoClient } from 'mongodb';
  import { RunnableSequence } from '@langchain/core/runnables';
  import { AgentConfig, QueryResponse } from '../types/agent';
  
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
        ["system", "You are a helpful AI assistant. To answer questions, you must first search for relevant information using the MongoDB_Retriever tool. After getting the search results, provide a comprehensive answer based on the retrieved information."],
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
        callbacks: [{
          handleToolStart: async (tool, input) => {
            console.log('Starting tool:', tool.name);
          },
          handleToolEnd: async (output: string) => {
            console.log('Tool output:', output);
          },
          handleLLMNewToken: async (token: string) => {
            console.log('Token:', token);
          },
        }],
      });
    }
  
    private async retrieveRelevantDocuments(query: string) {
      return await this.vectorStore.similaritySearch(query, this.topK);
    }
  
    async answerQuestion(question: string, onProgress?: (chunk: string) => Promise<void>) {
      if (!this.client || !this.client.connect) {
        throw new Error('MongoDB client is not connected. Please call init() first.');
      }
      
      try {
        let accumulatedResponse = '';
        const response = await this.agent.invoke(
          { input: question },
          {
            callbacks: [{
              handleLLMNewToken: async (token: string) => {
                if (onProgress && token !== '') {
                  accumulatedResponse += token;
                  await onProgress(token);
                }
              },
              handleToolStart: async (tool, input) => {
                console.log('Starting tool:', tool.name);
              },
              handleToolEnd: async (output: string) => {
                console.log('Tool output:', output);
              },
              handleChainEnd: async (outputs: Record<string, any>) => {
                console.log('Chain output:', outputs);
                // Ensure any remaining content is sent
                if (onProgress && outputs.output && outputs.output !== accumulatedResponse) {
                  await onProgress(outputs.output.slice(accumulatedResponse.length));
                }
              }
            }]
          }
        );

        return response.output;
      } catch (error) {
        console.error('Error in answerQuestion:', error);
        throw error;
      }
    }
  
    async close() {
      await this.client.close();
    }
    
  }
