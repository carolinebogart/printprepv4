import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Map Stripe price IDs to internal plan names
export function getPlanFromPriceId(priceId) {
  const map = {
    [process.env.STRIPE_PRICE_MONTHLY_STARTER]: 'monthly_starter',
    [process.env.STRIPE_PRICE_MONTHLY_PROFESSIONAL]: 'monthly_professional',
    [process.env.STRIPE_PRICE_MONTHLY_ENTERPRISE]: 'monthly_enterprise',
    [process.env.STRIPE_PRICE_YEARLY_STARTER]: 'yearly_starter',
    [process.env.STRIPE_PRICE_YEARLY_PROFESSIONAL]: 'yearly_professional',
    [process.env.STRIPE_PRICE_YEARLY_ENTERPRISE]: 'yearly_enterprise',
  };
  return map[priceId] || null;
}

// Map internal plan names to Stripe price IDs
export function getPriceIdFromPlan(planName) {
  const map = {
    monthly_starter: process.env.STRIPE_PRICE_MONTHLY_STARTER,
    monthly_professional: process.env.STRIPE_PRICE_MONTHLY_PROFESSIONAL,
    monthly_enterprise: process.env.STRIPE_PRICE_MONTHLY_ENTERPRISE,
    yearly_starter: process.env.STRIPE_PRICE_YEARLY_STARTER,
    yearly_professional: process.env.STRIPE_PRICE_YEARLY_PROFESSIONAL,
    yearly_enterprise: process.env.STRIPE_PRICE_YEARLY_ENTERPRISE,
  };
  return map[planName] || null;
}

// Pricing tiers for display
export const PRICING_TIERS = [
  {
    id: 'monthly_starter',
    name: 'Starter',
    billing: 'Monthly',
    price: 29.99,
    credits: 30,
    perImage: 1.0,
  },
  {
    id: 'monthly_professional',
    name: 'Professional',
    billing: 'Monthly',
    price: 89.99,
    credits: 100,
    perImage: 0.9,
    popular: true,
  },
  {
    id: 'monthly_enterprise',
    name: 'Enterprise',
    billing: 'Monthly',
    price: 399.99,
    credits: 500,
    perImage: 0.8,
  },
  {
    id: 'yearly_starter',
    name: 'Starter',
    billing: 'Yearly',
    price: 251.99,
    credits: 360,
    perImage: 0.7,
    savings: '$108/year',
  },
  {
    id: 'yearly_professional',
    name: 'Professional',
    billing: 'Yearly',
    price: 720.0,
    credits: 1200,
    perImage: 0.6,
    popular: true,
    savings: '$359.88/year',
  },
  {
    id: 'yearly_enterprise',
    name: 'Enterprise',
    billing: 'Yearly',
    price: 2999.99,
    credits: 6000,
    perImage: 0.5,
    savings: '$1,799.89/year',
  },
];
