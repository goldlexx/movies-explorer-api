# Movies Explorer API

REST API for the [Movies Explorer frontend](https://github.com/goldlexx/movies-explorer-frontend), deployed on Cloudflare Workers with Cloudflare D1.

## Features

- User registration and sign-in with signed JWTs
- Password hashing with PBKDF2 and Web Crypto
- Authenticated profile read/update
- User-owned saved movie list, create, and delete operations
- D1 foreign-key ownership and parameterized SQL queries
- CORS restricted to `https://goldlexx.github.io`

## API

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/signup` | Public |
| `POST` | `/signin` | Public |
| `GET`, `PATCH` | `/users/me` | Bearer token |
| `GET`, `POST` | `/movies` | Bearer token |
| `DELETE` | `/movies/:_id` | Bearer token; owner only |

## Local development

Install dependencies, create `.dev.vars` with a `JWT_SECRET` of at least 32 characters, then apply the local D1 schema and start Wrangler:

```sh
npm ci
npm run db:migrate:local
npm run dev
```

The local D1 database is separate from the deployed database. Never commit `.dev.vars` or production credentials.

## Deployment

The D1 database binding and schema are defined in `wrangler.jsonc` and `migrations/`. Apply the migration to the remote database before deploying. Store `JWT_SECRET` with Wrangler's secret management; it is intentionally absent from source control.

```sh
npm run db:migrate:remote
npx wrangler secret put JWT_SECRET
npm run deploy
```
