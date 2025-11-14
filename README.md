# PriceGuard

This repository contains the PriceGuard marketing front-end and a lightweight Node/Express backend used for account storage and authentication. The original design is available at https://www.figma.com/design/p8bpmXSibznjENbTVKIIZ4/PriceGuard.

## Front-end

```bash
npm install
npm run dev
```

The Vite dev server runs on http://localhost:3000.

## Backend

```bash
cd server
npm install
```

Copy `env.example` to `.env` (or provide these variables via your secret manager):

```
DATABASE_URL=postgres://user:password@localhost:5432/priceguard
PGSSLMODE=disable
```

> Ensure the `citext` and `pgcrypto` extensions are available on your PostgreSQL instance. The server attempts to enable them automatically at startup.

Start the API locally:

```bash
npm run dev
```

### REST Endpoints

- `POST /api/auth/register` - creates a new account, hashing the password with Argon2id and storing billing metadata (card token, last four digits, billing ZIP, expiry month/year, plan).
- `POST /api/auth/login` - verifies credentials and returns the account status including the `pastDue` flag and the masked `cardLast4` value so the UI can decide whether to prompt for payment.
