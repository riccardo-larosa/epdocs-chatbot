'use client';

import { Message, useChat } from 'ai/react';
import { SendIcon, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import PromptSuggestions from '../components/PromptSuggestions';
import EpIcon from '../components/icons/EpIcon';
import ReactMarkdown from 'react-markdown';
import LoadingBubbles from '../components/LoadingBubbles';

export default function Ask_Stream() {
  const { messages, input, handleInputChange, handleSubmit, error, append, isLoading } = useChat(
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
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="flex flex-col w-full max-w-3xl px-6 pt-24 mx-auto stretch bg-[#F9FBFA]">
        <div className="fixed top-0 left-0 right-0 h-24 flex items-center justify-center bg-[#F9FBFA] border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <EpIcon className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-lg font-semibold">Elastic Path Docs Chat</span>
          </div>
        </div>
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
                    ) : m.role === 'assistant' && m.content && (
                      <>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                            <EpIcon className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div className="bg-gray-100 rounded-lg p-4 max-w-[80%] shadow-md">
                            <ReactMarkdown
                              components={{
                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold my-3" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-xl font-bold my-2" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-lg font-bold my-1" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc ml-4 my-1" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal ml-4 my-1" {...props} />,
                                li: ({ node, ...props }) => <li className="" {...props} />,
                                a: ({ node, ...props }) => (
                                  <a className="text-blue-600 hover:text-blue-800 underline" {...props} />
                                ),
                              }}
                            >
                              {m.content}
                            </ReactMarkdown>
                          </div>
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
      <div className="fixed bottom-0 w-full max-w-3xl bg-white pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col justify-center items-center px-6">
          <div className={`w-full flex items-center p-2 mb-2 border-2 border-gray-300 rounded-full shadow-xl 
              ${isLoading ? 'animate-pulse border-blue-400 border-4' : ''}`}>
            <Sparkles className="w-5 h-5 text-gray-400 mr-2" />
            <input
              className="w-full bg-transparent focus:outline-none"
              value={input}
              placeholder={isLoading ? "Answering..." : "Ask a Question"}
              onChange={handleInputChange}
            />
            <button className="text-gray-400 hover:text-gray-600 ml-2">
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