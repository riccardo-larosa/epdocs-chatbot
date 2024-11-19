'use client';

import { Message, useChat } from 'ai/react';
import { SendIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  return (
    <div className="flex flex-col w-full max-w-3xl px-6 py-24 mx-auto stretch bg-[#F9FBFA]">
      <section className="h-[calc(100vh-200px)] mb-32">
        <div className="space-y-4 overflow-y-auto h-full ">
          
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
                      <div className="flex flex-row-reverse gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                        <p className="bg-blue-100 rounded-lg p-4 max-w-[80%] shadow-md">{m.content}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      {m.role === 'assistant' && (
                        <>
                          {m.content ? (
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                                <EpIcon className="w-5 h-5 text-emerald-500" />
                              </div>
                              <div className="bg-gray-100 rounded-lg p-4 max-w-[80%] shadow-md">
                                <p>{m.content}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                                <EpIcon className="w-5 h-5 text-emerald-500" />
                              </div>
                              <div className="bg-gray-100 rounded-lg p-4 max-w-[80%] shadow-md flex gap-2">
                                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </div>
                            </div>
                          )}
                        </>
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
          <div ref={messagesEndRef} />
        </div>
      </section>
      <div className="fixed bottom-0 w-full max-w-3xl bg-white pt-6">
        <form onSubmit={handleSubmit} className="flex justify-center items-center">
          <input
            className="w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl rounded-full focus:outline-none"
            value={input}
            placeholder="Ask a Question"
            onChange={handleInputChange}
          />
          <button className="ml-2 mb-8 text-gray-400 hover:text-gray-600">
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