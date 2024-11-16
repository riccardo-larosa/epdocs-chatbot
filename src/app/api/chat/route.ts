import { Message } from 'ai';
import { LangChainAdapter } from 'ai';
import { ChatOpenAI } from '@langchain/openai';

import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { vectorStore } from '@/utils/openai';
import { NextResponse } from 'next/server';
import { SystemMessagePromptTemplate } from "@langchain/core/prompts";
//import { BufferMemory } from "langchain/memory";


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const messages: Message[] = body.messages ?? [];
        console.log(`messages: ${messages}`);
        const question = messages[messages.length - 1].content;
        console.log(`question: ${question}`);

        const model = new ChatOpenAI({
            temperature: 0.8,
            streaming: true,
        });

        const retriever = vectorStore().asRetriever({
            "searchType": "mmr",
            "searchKwargs": { "fetchK": 10, "lambda": 0.25 }
        });

        const results = await retriever.invoke(question);
        console.log(`results: ${results}`);

        const promptTemplate = `Answer the following 
            question based on the context:

            Question: {question}
            Context: {context}

            Answer the question in a helpful and comprehensive way.`;
        const message = SystemMessagePromptTemplate.fromTemplate("{text}");
        const chatPrompt = ChatPromptTemplate.fromMessages([
            new SystemMessagePromptTemplate(promptTemplate)
        ]);
        const formattedPrompt = await chatPrompt.format({
            context: results,
            question: question
        });

        // const prompt = ChatPromptTemplate.fromTemplate(formattedPrompt);

        const documentChain = await createStuffDocumentsChain({
            llm: model,
            prompt: chatPrompt,
        });

        const retrievalChain = await createRetrievalChain({
            retriever,
            combineDocsChain: documentChain,
        });

        const response = await retrievalChain.stream({
            input: question
        });

        return LangChainAdapter.toDataStreamResponse(response);
    }
    catch (e: any) {
        console.log(`Error: ${e.message}`);
        return NextResponse.json({ message: 'Error Processing' + e.message }, { status: 500 });
    }
}