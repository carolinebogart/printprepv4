'use client';
import { useState } from 'react';

export default function EventDetailsViewer({ details }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(details, null, 2);

  function handleCopy() {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <details className="cursor-pointer">
      <summary className="text-xs text-blue-600 hover:underline select-none">View</summary>
      <div className="relative mt-1">
        <button
          onClick={handleCopy}
          title="Copy to clipboard"
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 transition-colors z-10"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
          )}
        </button>
        <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 pr-8 overflow-auto w-[560px] max-w-[80vw] max-h-60 whitespace-pre-wrap break-all">
          {json}
        </pre>
      </div>
    </details>
  );
}
