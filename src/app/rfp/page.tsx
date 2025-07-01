'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/types/agent'
import { ChatMessage } from '@/components/ChatMessage'
import { PromptSuggestions } from '@/components/PromptSuggestions'
import { LoadingBubbles } from '@/components/LoadingBubbles'
import { TimeoutWarning } from '@/components/TimeoutWarning'
import { ThemeToggle } from '@/components/ThemeToggle'

const RFP_PROMPT_SUGGESTIONS = [
  "What are the key capabilities of Elastic Path's Product Experience Manager?",
  "What is the implementation timeline for PXM?",
  "What are the pricing and licensing options?",
  "What security and compliance certifications do you have?",
  "What integration capabilities are available?",
  "What support and maintenance services do you provide?",
  "What are the performance and scalability metrics?",
  "Can you provide customer success stories and case studies?"
]

export default function RFPPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setShowTimeoutWarning(false)

    // Set timeout warning
    timeoutRef.current = setTimeout(() => {
      setShowTimeoutWarning(true)
    }, 25000)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          history: messages,
          mode: 'rfp' // Add RFP mode flag
        }),
      })

      clearTimeout(timeoutRef.current)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setShowTimeoutWarning(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
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
          <ThemeToggle />
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Welcome to the Elastic Path RFP Assistant
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                  I can help you with comprehensive information about Elastic Path products and services, 
                  including technical specifications, implementation details, pricing, and more for your Request for Proposal.
                </p>
                <PromptSuggestions 
                  suggestions={RFP_PROMPT_SUGGESTIONS}
                  onSuggestionClick={handleSuggestionClick}
                />
              </div>
            )}
            
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            
            {isLoading && (
              <div className="flex items-center space-x-2">
                <LoadingBubbles />
                <span className="text-gray-600 dark:text-gray-400">
                  Searching RFP information...
                </span>
              </div>
            )}
            
            {showTimeoutWarning && (
              <TimeoutWarning />
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <form onSubmit={handleSubmit} className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Elastic Path products, pricing, implementation, or any RFP-related questions..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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