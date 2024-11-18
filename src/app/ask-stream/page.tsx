'use client';

import { useChat } from 'ai/react';
import { ToolInvocation } from 'ai';

export default function Ask_Stream() {
  const { messages, input, handleInputChange, handleSubmit, error } = useChat(
    { api: '/api/chat-stream' }
  );
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <div className="space-y-4">
        {messages.map(m => (
          <div key={m.id} className="whitespace-pre-wrap">

            <div className="font-bold">{m.role}</div>
            <p>{m.content}</p>
            {/* {m.toolInvocations?.map((toolInvocation: ToolInvocation) => {
                return (
                  <div key={toolInvocation.id}>
                    <div className="font-bold">Tool: {toolInvocation.toolName}</div>
                    <p>{toolInvocation.result}</p>
                  </div>
                );
              })} */}
            {error && (
              <>
                <div>An error occurred.{error.message}</div>
                
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}