# Movies Explorer API

The Express API for [Movies Explorer](https://github.com/goldlexx/movies-explorer-frontend). It manages user accounts, authentication, profile data, and saved movies.

## Features

- Register and sign in with JWT authentication
- Read and update the authenticated user's profile
- List, save, and delete the authenticated user's movies
- Validate request data and URLs
- Apply rate limiting and centralized request/error logging

## Stack

Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, Celebrate/Joi, Winston, Helmet.

## Run locally

Run MongoDB locally and create `.env` from `.env.example`. Set a random `JWT_SECRET` of at least 32 characters and a local `DATABASE_URL`.

```bash
npm ci
npm run dev
```

Use `npm start` to run the production server and `npm run lint` for ESLint.

## API routes

- `POST /signup` and `POST /signin`
- `GET /users/me` and `PATCH /users/me`
- `GET /movies/`, `POST /movies/`, and `DELETE /movies/:_id`

The API requires JWT and MongoDB settings from the environment; no secret fallback is used.

## Integration tests

The API integration suite is in `test/api.integration.test.js`. Set `MONGODB_TEST_URI` to a disposable MongoDB database whose name ends in `_test`, then run:

```bash
npm test
```

The test suite drops the selected database before and after its run. Never point `MONGODB_TEST_URI` at a working or production database. Without this variable, the integration suite is skipped.

## Demo

No live API endpoint is listed because the previous deployment could not be verified.
