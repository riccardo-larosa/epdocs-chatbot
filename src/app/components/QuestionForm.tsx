'use client';

import { useState } from 'react';

export default function QuestionForm() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAnswer('');

    try {
      const response = await fetch('/api/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            const content = line.slice(5);
            setAnswer(prev => prev + content);
          }
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setAnswer('Error: Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter your question..."
          rows={3}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {isLoading ? 'Loading...' : 'Ask'}
        </button>
      </form>
      
      {answer && (
        <div className="mt-4 p-4 border rounded">
          <pre className="whitespace-pre-wrap">{answer}</pre>
        </div>
      )}
    </div>
  );
}