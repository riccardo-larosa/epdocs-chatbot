'use client';

import { Message, useChat } from 'ai/react';
import { SendIcon } from 'lucide-react';
//import { ToolInvocation } from 'ai';
import PromptSuggestions from '../components/PromptSuggestions';
import EpIcon from '../components/icons/EpIcon';

export default function Ask_Stream() {
  const { messages, input, handleInputChange, handleSubmit, error, append } = useChat(
    { api: '/api/chat-stream' }
  );
  const newSession = !messages || messages.length === 0;
  const handlePrompt = (prompt: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      content: prompt,
      role: "user",
    };
    append(msg);
  };

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <section>
        <div className="space-y-4">
          
              <div className="flex gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                  <EpIcon className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="bg-gray-100 rounded-lg p-4 max-w-[80%]">
                  <p> Welcome! I'm the Elastic Path AI. What can I help you with today?</p>
                </div>
              </div>
              
              <br />
          <PromptSuggestions onPromptClick={handlePrompt} />
          {newSession ? (
            <>
            </>

          ) : (
            <>
              {messages.map(m => (
                <div key={m.id} className="whitespace-pre-wrap">

                  {m.role === 'user' ? (
                    <>
                      <div className="font-bold text-right">{m.role}</div>
                      <p className="text-right bg-blue-100 rounded-lg p-4 ml-auto max-w-[80%]">{m.content}</p>
                    </>
                  ) : (
                    <>
                      {m.content && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                            <EpIcon className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div className="bg-gray-100 rounded-lg p-4 max-w-[80%]">
                            <p>{m.content}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {error && (
                    <>
                      <div>An error occurred.{error.message}</div>
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </section>
      <div className="fixed bottom-0 w-full">
        <form onSubmit={handleSubmit}>
          <input
            className=" w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl rounded-full focus:outline-none"
            value={input}
            placeholder="Ask a Question"
            onChange={handleInputChange}
          />
          <button className="  text-gray-400 hover:text-gray-600">
            <SendIcon className="w-5 h-5" />
          </button>
        </form>

        <span className="mt-4 flex justify-between items-center text-sm text-gray-500">
          <p>
            This is an experimental generative AI chatbot. All information should
            be verified prior to use.
          </p>
        </span>
      </div>
    </div>
  );
}