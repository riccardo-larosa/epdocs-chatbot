'use client'

import { useState, useRef, useEffect } from 'react'
import { Message, useChat } from 'ai/react'
import CopyableResponse from '@/components/CopyableResponse'
import PromptSuggestions from '@/components/PromptSuggestions'
import LoadingBubbles from '@/components/LoadingBubbles'
import { TimeoutWarning, TimeoutError } from '@/components/TimeoutWarning'
import ThemeToggle from '@/components/ThemeToggle'

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/rfp/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        setTimeout(onClose, 1500)
      } else {
        setError(data.error ?? 'Failed to change password')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change password</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {success ? (
          <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">
            Password changed successfully.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}



export default function RFPPage() {
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const timeoutWarningRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const { messages, input, handleInputChange, handleSubmit, error, append, isLoading } = useChat(
    { 
      api: '/api/chat',
      body: { useTools: true, mode: 'rfp' },
      onError: (error) => {
        console.error('Chat error:', error);
        setShowTimeoutWarning(false);
        if (timeoutWarningRef.current) {
          clearTimeout(timeoutWarningRef.current);
          timeoutWarningRef.current = null;
        }
      },
      onFinish: () => {
        setShowTimeoutWarning(false);
        if (timeoutWarningRef.current) {
          clearTimeout(timeoutWarningRef.current);
          timeoutWarningRef.current = null;
        }
      }
    }
  )

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (messages && messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  // Clear timeout warning when loading stops
  useEffect(() => {
    if (!isLoading && timeoutWarningRef.current) {
      setShowTimeoutWarning(false);
      clearTimeout(timeoutWarningRef.current);
      timeoutWarningRef.current = null;
    }
  }, [isLoading]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutWarningRef.current) {
        clearTimeout(timeoutWarningRef.current);
      }
    };
  }, []);

  // Auto-resize textarea based on content
  const MAX_HEIGHT = 200; // Maximum height in pixels
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, capped at MAX_HEIGHT
      const newHeight = Math.min(textarea.scrollHeight, MAX_HEIGHT);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Handle Enter key for submit, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      // Start timeout warning after 25 seconds
      timeoutWarningRef.current = setTimeout(() => {
        setShowTimeoutWarning(true)
      }, 25000)
    }
    handleSubmit(e)
  }

  const handlePrompt = (prompt: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      content: prompt,
      role: "user",
    };
    append(msg);
    
    // Start timeout warning after 25 seconds
    timeoutWarningRef.current = setTimeout(() => {
      setShowTimeoutWarning(true)
    }, 25000)
  }

  const handleRetry = () => {
    if (messages && messages.length > 0) {
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage.role === 'user') {
        append(lastUserMessage);
        
        // Start timeout warning after 25 seconds
        timeoutWarningRef.current = setTimeout(() => {
          setShowTimeoutWarning(true)
        }, 25000)
      }
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Elastic Path RFP Assistant
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get comprehensive information for your Request for Proposal
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowChangePassword(true)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Change password
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {(!messages || messages.length === 0) && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Welcome to the Elastic Path RFP Assistant
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                  I can help you with comprehensive information about Elastic Path products and services, 
                  including technical specifications, implementation details, pricing, and more for your Request for Proposal.
                </p>
                <PromptSuggestions onPromptClick={handlePrompt} />
              </div>
            )}
            
            {messages?.map((message) => (
              <div key={message.id} className="whitespace-pre-wrap">
                {message.role === 'user' ? (
                  <div className="flex flex-row-reverse gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 dark:bg-gray-600">
                      <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                    <p className="bg-emerald-600 rounded-lg p-2 max-w-[80%] shadow-md dark:bg-emerald-800 text-white">
                      {message.content}
                    </p>
                  </div>
                ) : message.role === 'assistant' && message.content && (
                  <div className="flex gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center flex-shrink-0 dark:bg-gray-700">
                      <svg className="w-8 h-8 text-emerald-500 dark:text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <CopyableResponse content={message.content} />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-center space-x-2">
                <LoadingBubbles />
                <span className="text-gray-600 dark:text-gray-400">
                  Searching RFP information...
                </span>
              </div>
            )}
            
            {showTimeoutWarning && isLoading && (
              <TimeoutWarning isVisible={showTimeoutWarning} />
            )}

            {/* Error Display */}
            {error && (
              <TimeoutError error={error as Error} onRetry={handleRetry} />
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <form ref={formRef} onSubmit={handleFormSubmit} className="flex space-x-4">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Elastic Path products, pricing, implementation, or any RFP-related questions..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none overflow-y-auto min-h-[42px] max-h-[200px]"
                disabled={isLoading}
                rows={1}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed self-end"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 