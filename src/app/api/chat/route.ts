
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { findRelevantContent } from '@/lib/mongoDbRetriever';

export async function POST(req: Request) {
    try {
        const { messages, useTools } = await req.json();
        const latestMessage = messages[messages?.length - 1]?.content;
        console.log(`question: ${latestMessage}`);

        messages?.map((msg: any) => (
            console.log(`role: ${msg.role}, content: ${msg.content}`)
        ));

        const content = await findRelevantContent(latestMessage);
        const context = content.map(doc => doc.pageContent).join('\n\n');
        //console.log(`context: ${context}`);

        const systemPrompt = `You are knowledgeable about Elastic Path products. You can answer any questions about 
                Commerce Manager, 
                Product Experience Manager also known as PXM,
                Cart and Checkout,
                Promotions,
                Composer,
                Payments
                Subscriptions,
                Studio.
                Check Elastic Path knowledge base before answering any questions.
                
                ${useTools ? `Only respond to questions using information from tool calls.   
                if no relevant information is found in the tool calls, respond, "Sorry, I don't know."
                ` : `
                Answer the following question based on the context:
                Question: ${latestMessage}
                Context: ${context}
                if no relevant information is found, respond, "Sorry, I don't know."
                `}
                    
                From the documents returned, after you have answered the question, provide a list of links to the documents that are most relevant to the question.
                Build any of the relative links doing the following:
                - remove the /data_md/ prefix
                - remove the .md suffix
                - replace spaces with hyphens
                using https://elasticpath.dev as the root
                
                Answer the question in a helpful and comprehensive way.`;

        //console.log(`systemPrompt: ${systemPrompt}`);

        const result =  streamText({
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