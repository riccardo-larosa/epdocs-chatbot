'use client';

import { useState } from 'react';

export default function DebugAPI() {
    const [response, setResponse] = useState<string>('');
    const [status, setStatus] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const testAPI = async (testType: string) => {
        setLoading(true);
        setResponse('');
        setStatus(null);

        try {
            let fetchOptions: RequestInit = {};

            switch (testType) {
                case 'post-valid':
                    fetchOptions = {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            messages: [{ role: 'user', content: 'test API' }],
                            useTools: false
                        })
                    };
                    break;

                case 'post-with-key':
                    fetchOptions = {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer test-key-123'
                        },
                        body: JSON.stringify({
                            messages: [{ role: 'user', content: 'test API with key' }],
                            useTools: false
                        })
                    };
                    break;

                case 'get-method':
                    fetchOptions = {
                        method: 'GET'
                    };
                    break;

                case 'options-method':
                    fetchOptions = {
                        method: 'OPTIONS'
                    };
                    break;
            }

            const response = await fetch('/api/chat', fetchOptions);
            setStatus(response.status);

            if (response.ok && testType.startsWith('post')) {
                // Handle streaming response
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let result = '';

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        result += decoder.decode(value, { stream: true });
                    }
                }
                setResponse(result);
            } else {
                const text = await response.text();
                setResponse(text);
            }
        } catch (error) {
            setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setStatus(0);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">API Debug Tools</h1>
            
            <div className="grid gap-4 mb-6">
                <button
                    onClick={() => testAPI('post-valid')}
                    className="p-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    disabled={loading}
                >
                    Test POST (Valid Request)
                </button>
                
                <button
                    onClick={() => testAPI('post-with-key')}
                    className="p-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    disabled={loading}
                >
                    Test POST (With API Key)
                </button>
                
                <button
                    onClick={() => testAPI('get-method')}
                    className="p-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    disabled={loading}
                >
                    Test GET (Should fail with 405)
                </button>
                
                <button
                    onClick={() => testAPI('options-method')}
                    className="p-3 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                    disabled={loading}
                >
                    Test OPTIONS (CORS preflight)
                </button>
            </div>

            {loading && (
                <div className="mb-4 p-4 bg-blue-100 rounded">
                    <p>Testing API...</p>
                </div>
            )}

            {status !== null && (
                <div className="mb-4 p-4 bg-gray-100 rounded">
                    <h3 className="font-bold">Status: {status}</h3>
                    <p className="text-sm">
                        {status === 200 && '✅ Success'}
                        {status === 405 && '❌ Method Not Allowed (Expected for GET)'}
                        {status === 401 && '🔒 Unauthorized (API Key Required)'}
                        {status === 400 && '❌ Bad Request'}
                        {status === 0 && '🔴 Network Error'}
                    </p>
                </div>
            )}

            {response && (
                <div className="mb-4 p-4 bg-gray-50 rounded">
                    <h3 className="font-bold mb-2">Response:</h3>
                    <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-64">
                        {response}
                    </pre>
                </div>
            )}

            <div className="mt-8 p-4 bg-yellow-50 rounded border border-yellow-200">
                <h3 className="font-bold mb-2">Troubleshooting 405 Errors:</h3>
                <ul className="text-sm space-y-2">
                    <li>• <strong>POST should work</strong> - Returns 200 with streaming data</li>
                    <li>• <strong>GET should fail</strong> - Returns 405 (Method Not Allowed)</li>
                    <li>• <strong>OPTIONS should work</strong> - Returns 200 for CORS</li>
                    <li>• Check that your client is sending POST, not GET</li>
                    <li>• Verify Content-Type: application/json header</li>
                    <li>• For external access, API key may be required</li>
                </ul>
            </div>
        </div>
    );
} 