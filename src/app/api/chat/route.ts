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

        const retriever = vectorStore().asRetriever({
            "searchType": "mmr",
            "searchKwargs": { "fetchK": 10, "lambda": 0.25 }
        });

        const results = await retriever.invoke(question);
        console.log(`results: ${results}`);
        //convert the documents to a string
        const context = results.map(doc => doc.pageContent).join('\n\n');
        console.log(`context: ${context}`);
        
        const contextObject = results.map(doc => ({ 
            source: doc.metadata.source, 
            id: doc.metadata.id, 
         }));
        console.log(`contextObject: ${contextObject}`);

        
        const promptTemplate = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(
                `Answer the following question based on the context:

                Question: {question}
                Context: {context}

                Answer the question in a helpful and comprehensive way.`
            )
        ]);

        const formattedPrompt = await promptTemplate.formatMessages({
            context: context, // use the context string we created earlier
            question: question
        });

        // const prompt = ChatPromptTemplate.fromTemplate(formattedPrompt);
        console.log(`formattedPrompt: ${formattedPrompt}`);

        const model = new ChatOpenAI({
            temperature: 0.8,
            streaming: true,
        });

        const eventStream = await model.streamEvents(
            formattedPrompt,
            {
                version: "v2",
                encoding: "text/event-stream",
            },
        );

        return new Response(eventStream, {
            headers: {
                "content-type": "text/event-stream",
            },
        });
    }
    catch (e: any) {
        console.log(`Error: ${e.message}`);
        return NextResponse.json({ message: 'Error Processing' + e.message }, { status: 500 });
    }
}