'use client';

import { useState } from 'react';

interface TestResult {
  success: boolean;
  stats: {
    documentCount: number;
    sizeInMB: string;
    indexes: string[];
    sampleDocuments: any[];
  };
}

export default function TestMongoDBPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test-mongodb');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to test connection');
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">MongoDB Connection Test</h1>
        
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
            <h2 className="text-red-800 font-semibold">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-6">
            <div className="p-4 bg-green-100 border border-green-400 rounded">
              <h2 className="text-green-800 font-semibold">Connection Successful!</h2>
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Collection Statistics</h2>
                <p>Document Count: {result.stats.documentCount}</p>
                <p>Size: {result.stats.sizeInMB} MB</p>
              </div>

              <div>
                <h2 className="text-lg font-semibold">Indexes</h2>
                <ul className="list-disc pl-5">
                  {result.stats.indexes.map((index, i) => (
                    <li key={i}>{index}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold">Sample Documents</h2>
                <div className="space-y-2">
                  {result.stats.sampleDocuments.map((doc, i) => (
                    <pre key={i} className="p-2 bg-gray-100 rounded overflow-x-auto">
                      {JSON.stringify(doc, null, 2)}
                    </pre>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}