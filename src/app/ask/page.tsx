'use client';

import { Message, useChat } from 'ai/react';
import { SendIcon, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import PromptSuggestions from '@/components/PromptSuggestions';
import EpIcon from '@/components/icons/EpIcon';
// import LoadingBubbles from '../components/LoadingBubbles';
import React from 'react';
import FormatResponse from '@/components/FormatResponse';

export default function Ask() {
  const { messages, input, handleInputChange, handleSubmit, error, append, isLoading } = useChat(
    { api: '/api/chat',
      body: { useTools: true }
     }
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
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="flex flex-col w-full max-w-3xl px-6 pt-6 mx-auto stretch bg-[#F9FBFA] dark:bg-[#1F2937]">

        <section className="h-[calc(100vh-200px)] mb-32">
          <div className="space-y-4 overflow-y-auto h-full ">

            <div className="flex gap-3 mb-6">
              <div className="bg-gray-200 rounded-lg p-4 max-w-[80%] dark:bg-gray-600 dark:text-gray-300">
                <div className="flex items-center">
                  <EpIcon className="text-emerald-500 dark:text-emerald-400 w-8 h-8" />
                  <p>I&apos;m the Elastic Path AI. What can I help you with today?</p>
                </div>
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
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 dark:bg-gray-600">
                            <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                          </div>
                          <p className="bg-emerald-600 rounded-lg p-2 max-w-[80%] shadow-md dark:bg-emerald-800 text-white">{m.content}</p>
                        </div>
                      </>
                    ) : m.role === 'assistant' && m.content && (
                      <>
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center flex-shrink-0 dark:bg-gray-700">
                            <EpIcon className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                          </div>
                          <FormatResponse content={m.content} />
                        </div>
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
      </div>
      <div className="fixed bottom-0 w-full max-w-3xl   dark:bg-[#1F2937] pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col justify-center items-center px-6">
          <div className={`w-full flex items-center p-2 mb-2 rounded-full shadow-xl 
              ${isLoading ? ' animate-pulse border-slate-600 border-4' : ' border-2 border-slate-700 '}`}>
            <Sparkles className="w-5 h-5 text-gray-400 mr-2" />
            <input
              className="w-full bg-transparent focus:outline-none"
              value={input}
              placeholder={isLoading ? "Answering..." : "Ask a Question"}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <button type="submit" className="text-gray-400 hover:text-gray-600 ml-2">
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm text-gray-500 text-center mb-2">
              This is an experimental generative AI chatbot. All information should
              be verified prior to use.
          </div>
        </form>
      </div>
    </div>
  );
}