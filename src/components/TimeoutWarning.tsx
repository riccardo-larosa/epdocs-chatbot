import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface TimeoutWarningProps {
  isVisible: boolean;
  onDismiss?: () => void;
}

export const TimeoutWarning: React.FC<TimeoutWarningProps> = ({ isVisible, onDismiss }) => {
  if (!isVisible) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
            This is taking longer than usual...
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
            Complex questions can take more time to process. Your response is still being generated.
          </p>
          <div className="text-xs text-yellow-600 dark:text-yellow-400">
            <p>💡 <strong>Tip:</strong> For faster responses, try breaking complex questions into smaller parts.</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 ml-2"
            aria-label="Dismiss warning"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

interface TimeoutErrorProps {
  error: Error;
  onRetry?: () => void;
}

export const TimeoutError: React.FC<TimeoutErrorProps> = ({ error, onRetry }) => {
  const isTimeoutError = error.message.includes('timeout') || error.message.includes('aborted');

  return (
    <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            {isTimeoutError ? 'Request Timed Out' : 'Error'}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-2">
            {isTimeoutError 
              ? 'The response took longer than expected to generate.'
              : error.message
            }
          </p>
          {isTimeoutError && (
            <div className="text-xs text-red-600 dark:text-red-400 space-y-1">
              <p><strong>This can happen when:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>Questions are very complex or require extensive research</li>
                <li>The AI needs to search through many documents</li>
                <li>Server load is high</li>
              </ul>
              <p className="mt-2"><strong>Try:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>Breaking your question into smaller, more specific parts</li>
                <li>Asking about one topic at a time</li>
                <li>Waiting a moment and trying again</li>
              </ul>
            </div>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 