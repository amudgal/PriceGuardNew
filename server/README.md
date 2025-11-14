# PriceGuard Backend Service

This lightweight Express server provides registration and login endpoints backed by PostgreSQL. Passwords are hashed with Argon2id and billing metadata is tokenized.

## Prerequisites

- Node.js 20+
- A PostgreSQL 14+ database
- The `citext` and `pgcrypto` extensions available in the target database (the server attempts to create them automatically on start; if your DB user lacks the privileges, run `CREATE EXTENSION IF NOT EXISTS citext;` and `CREATE EXTENSION IF NOT EXISTS pgcrypto;` manually).

## Setup

```bash
cd server
npm install
```

Create a `.env` file (you can base it on the snippet below):

```bash
DATABASE_URL=postgres://user:password@localhost:5432/priceguard
PGSSLMODE=disable
```

## Development

```bash
npm run dev
```

The server runs on `http://localhost:4000` by default.

## REST Endpoints

### `POST /api/auth/register`

Registers a new account.

```json
{
  "email": "user@example.com",
  "password": "pa55word!",
  "creditCardToken": "tok_123",
  "cardLast4": "4242",
  "billingZip": "94016",
  "expiryMonth": 12,
  "expiryYear": 2027,
  "plan": "premium"
}
```

- Passwords are hashed with Argon2id.
- `cardLast4` is required when a `creditCardToken` is provided.

### `POST /api/auth/login`

Authenticates a user.

```json
{
  "email": "user@example.com",
  "password": "pa55word!"
}
```

On success, the API responds with:

```json
{
  "id": "...",
  "email": "user@example.com",
  "plan": "premium",
  "pastDue": false,
  "cardLast4": "4242"
}
```

If the `past_due` flag is true, the front-end can redirect the customer to the payment collection UI while showing the stored `cardLast4`.
