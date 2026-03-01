# Stripe Test Cards

Use any future expiry date, any 3-digit CVC, any ZIP code.

| Card Number | Result |
|---|---|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Card declined |
| 4000 0025 0000 3155 | 3D Secure required |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0000 0000 0069 | Expired card |

## Webhook Testing

Use `stripe listen --forward-to localhost:3000/api/stripe/webhook` for local testing.

**Gotcha:** The webhook secret changes every time `stripe listen` is restarted. Update `STRIPE_WEBHOOK_SECRET` in `.env.local` and restart the dev server.
