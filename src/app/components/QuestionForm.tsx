'use client';

import { useCompletion } from 'ai/react';

export default function YourComponent() {
  const { completion, input, handleInputChange, handleSubmit, isLoading, error } = useCompletion({
    api: '/api/question',
    onError: (error) => {
      console.error('Error:', error);
    },
    onResponse: (response) => {
      console.log('Response received:', response);
    },
    onFinish: (completion) => {
      console.log('Final completion:', completion);
    },
  });

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask a question..."
          className="w-full max-w-md p-2 border rounded"
        />
        <button 
          type="submit" 
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {isLoading ? 'Loading...' : 'Ask'}
        </button>
      </form>
      
      {error && (
        <div className="text-red-500">
          Error: {error.message}
        </div>
      )}

      {completion && (
        <div className="mt-4 whitespace-pre-wrap">
          {completion}
        </div>
      )}
    </div>
  );
}