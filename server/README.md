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

Copy `env.example` to `.env` (or set the variables through your preferred secret manager):

```bash
cp env.example .env
```

Update the values to match your environment, including the database connection string you provide for testing.

### Verify the Database Connection

After your `.env` is configured, you can confirm connectivity:

```bash
npm run db:check
```

The command prints the database name and timestamp on success. It exits with a non-zero code if the connection fails.

### Run Database Migrations

Once the database connection is confirmed, create the required tables:

```bash
npm run db:migrate
```

The script creates the `accounts` table and required extensions if they do not already exist.

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
