// Credit system logic

export const PLAN_CREDITS = {
  none: 0,
  monthly_starter: 30,
  monthly_professional: 100,
  monthly_enterprise: 500,
  yearly_starter: 360,
  yearly_professional: 1200,
  yearly_enterprise: 6000,
};

// Check if subscription allows processing
export function isActive(subscription) {
  if (!subscription) return false;
  if (subscription.status === 'active') return true;
  if (subscription.status === 'cancelled' && creditsRemaining(subscription) > 0) return true;
  return false;
}

// Calculate remaining credits
export function creditsRemaining(subscription) {
  if (!subscription) return 0;
  return Math.max(0, subscription.credits_total - subscription.credits_used);
}

// Check if user has credits available
export function hasCredits(subscription) {
  return creditsRemaining(subscription) > 0;
}

// Get credits for a plan name
export function getCreditsForPlan(planName) {
  return PLAN_CREDITS[planName] || 0;
}

// Determine if a plan change is a downgrade
export function isDowngrade(currentPlan, newPlan) {
  const currentCredits = PLAN_CREDITS[currentPlan] || 0;
  const newCredits = PLAN_CREDITS[newPlan] || 0;
  return newCredits < currentCredits;
}
