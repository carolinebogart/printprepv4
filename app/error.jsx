'use client';

export default function Error({ error, reset }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="bg-red-50 border border-red-200 rounded-lg p-8">
        <h1 className="text-2xl font-bold text-red-800 mb-2">Something went wrong</h1>
        <p className="text-red-600 mb-6">
          {error?.message === 'NEXT_NOT_FOUND'
            ? "The page you're looking for doesn't exist."
            : "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => reset()} className="btn-primary">
            Try Again
          </button>
          <a href="/" className="btn-secondary">
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
