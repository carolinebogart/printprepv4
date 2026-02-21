'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PricingCards({ tiers, currentPlan, isLoggedIn }) {
  const router = useRouter();
  const [billing, setBilling] = useState('Monthly');
  const [loading, setLoading] = useState(null);

  const filteredTiers = tiers.filter((t) => t.billing === billing);

  const handleSubscribe = async (priceId, tierId) => {
    if (!isLoggedIn) {
      router.push('/auth/register');
      return;
    }

    setLoading(tierId);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1 flex">
          {['Monthly', 'Yearly'].map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billing === b
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {b}
              {b === 'Yearly' && (
                <span className="ml-1 text-green-600 text-xs">Save up to 50%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {filteredTiers.map((tier) => {
          const isCurrent = currentPlan === tier.id;
          const priceId = getPriceEnvKey(tier.id);

          return (
            <div
              key={tier.id}
              className={`relative bg-white rounded-xl border-2 p-6 ${
                tier.popular ? 'border-blue-500 shadow-lg' : 'border-gray-200'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>

              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">
                  ${tier.price}
                </span>
                <span className="text-gray-500 text-sm ml-1">
                  /{billing === 'Monthly' ? 'mo' : 'yr'}
                </span>
              </div>

              {tier.savings && (
                <p className="text-green-600 text-sm mt-1">{tier.savings}</p>
              )}

              <ul className="mt-6 space-y-3">
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  {tier.credits} credits/{billing === 'Monthly' ? 'month' : 'year'}
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  ${tier.perImage.toFixed(2)} per image
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  All print sizes included
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  300 DPI output
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  ZIP downloads
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(priceId, tier.id)}
                disabled={isCurrent || loading === tier.id}
                className={`w-full mt-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : tier.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {loading === tier.id
                  ? 'Redirecting...'
                  : isCurrent
                  ? 'Current Plan'
                  : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Map tier IDs to environment variable names for price IDs
function getPriceEnvKey(tierId) {
  // These are passed to the checkout API which resolves them
  return tierId;
}
