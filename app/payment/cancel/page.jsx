import Link from 'next/link';

export default function PaymentCancelPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
      <p className="text-gray-600 mb-6">
        No charges were made. You can try again whenever you&apos;re ready.
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/pricing" className="btn-primary">
          View Plans
        </Link>
        <Link href="/" className="btn-secondary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
