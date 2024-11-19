// import { Document } from 'mongodb';

export interface AgentConfig {
  mongodbUri: string;
  dbName: string;
  collectionName: string;
  openaiApiKey: string;
  indexName?: string;
  topK?: number;
}

export interface QueryResponse {
  answer: string;
  sourceDocuments?: string[];
  error?: string;
}
