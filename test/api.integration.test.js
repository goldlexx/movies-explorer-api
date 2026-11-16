require('dotenv').config();

const {
  after,
  before,
  describe,
  test,
} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const testMongoUri = process.env.MONGODB_TEST_URI;
process.env.JWT_SECRET = 'integration-tests-only-secret-value-over-32-chars';
if (testMongoUri) process.env.DATABASE_URL = testMongoUri;
const app = require('../app');
const Movie = require('../models/movie');
const { handleError } = require('../middlewares/handleError');

const testToken = jwt.sign(
  { _id: new mongoose.Types.ObjectId().toString() },
  process.env.JWT_SECRET,
  { algorithm: 'HS256' },
);

const suiteOptions = testMongoUri
  ? {}
  : { skip: 'Set MONGODB_TEST_URI to a disposable database ending in _test' };

function sendRequest(port, path, { method = 'GET', token, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const headers = {};
    if (payload) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers,
    }, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        let parsedBody = responseBody;
        try {
          parsedBody = responseBody ? JSON.parse(responseBody) : null;
        } catch (parseError) {
          parsedBody = { error: parseError.message, response: responseBody };
        }
        resolve({ status: res.statusCode, body: parsedBody });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('rejects invalid signup passwords and movie URLs before database access', async () => {
  const server = await new Promise((resolve) => {
    const httpServer = app.listen(0, () => {
      resolve(httpServer);
    });
  });
  const { port } = server.address();

  try {
    const signup = await sendRequest(port, '/signup', {
      method: 'POST',
      body: { name: 'Test User', email: 'test@example.test', password: 'short' },
    });
    const unauthorizedMovies = await sendRequest(port, '/movies');
    const movie = await sendRequest(port, '/movies', {
      method: 'POST',
      token: testToken,
      body: { image: 'not-a-url' },
    });

    assert.equal(signup.status, 400);
    assert.equal(unauthorizedMovies.status, 401);
    assert.equal(movie.status, 400);
  } finally {
    await new Promise((resolve) => {
      server.close(() => resolve());
    });
  }
});

test('hides internal error details from API responses', () => {
  let responseStatus;
  let responseBody;
  const response = {
    status(status) {
      responseStatus = status;
      return this;
    },
    send(body) {
      responseBody = body;
      return this;
    },
  };

  handleError(new Error('database connection details'), {}, response, () => {});

  assert.equal(responseStatus, 500);
  assert.deepEqual(responseBody, { message: 'На сервере произошла ошибка' });
});

test('Mongoose rejects malformed movie URLs without a database', () => {
  const movie = new Movie({
    country: 'US',
    director: 'Example',
    duration: 90,
    year: '2024',
    description: 'Example',
    image: 'bad',
    trailerLink: 'bad',
    thumbnail: 'bad',
    owner: new mongoose.Types.ObjectId(),
    movieId: 1,
    nameRU: 'Фильм',
    nameEN: 'Film',
  });
  const { errors } = movie.validateSync();

  assert.ok(errors.image);
  assert.ok(errors.trailerLink);
  assert.ok(errors.thumbnail);
});

describe('Movies API integration', suiteOptions, () => {
  let server;
  let port;

  before(async () => {
    const dbName = new URL(testMongoUri).pathname.replace(/^\/+/, '');
    if (!/_test$/i.test(dbName)) {
      throw new Error('Refusing to run integration tests against a database not ending in _test');
    }

    await mongoose.connect(testMongoUri);
    await mongoose.connection.dropDatabase();
    server = await new Promise((resolve) => {
      const httpServer = app.listen(0, () => {
        resolve(httpServer);
      });
    });
    port = server.address().port;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
    if (mongoose && mongoose.connection.readyState) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  test('registers and authenticates users; scopes movies and validates movie data', async () => {
    const suffix = Date.now();
    const owner = {
      name: 'Owner',
      email: `owner-${suffix}@example.test`,
      password: 'valid-password-123',
    };
    const other = {
      name: 'Other',
      email: `other-${suffix}@example.test`,
      password: 'valid-password-456',
    };

    const shortPassword = await sendRequest(port, '/signup', {
      method: 'POST',
      body: {
        ...owner,
        email: `short-${suffix}@example.test`,
        password: 'short',
      },
    });
    assert.equal(shortPassword.status, 400);

    const registration = await sendRequest(port, '/signup', {
      method: 'POST',
      body: owner,
    });
    assert.equal(registration.status, 200);
    assert.equal(Object.hasOwn(registration.body, 'password'), false);
    await sendRequest(port, '/signup', {
      method: 'POST',
      body: other,
    });

    const ownerLogin = await sendRequest(port, '/signin', {
      method: 'POST',
      body: { email: owner.email, password: owner.password },
    });
    const otherLogin = await sendRequest(port, '/signin', {
      method: 'POST',
      body: { email: other.email, password: other.password },
    });
    assert.equal(ownerLogin.status, 200);
    assert.equal(otherLogin.status, 200);

    const profile = await sendRequest(port, '/users/me', { token: ownerLogin.body.token });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.email, owner.email);
    assert.equal(Object.hasOwn(profile.body, 'password'), false);

    const invalidMovie = await sendRequest(port, '/movies', {
      method: 'POST',
      token: ownerLogin.body.token,
      body: { image: 'not-a-url' },
    });
    assert.equal(invalidMovie.status, 400);

    const movieData = {
      country: 'US',
      director: 'Example Director',
      duration: 95,
      year: '2024',
      description: 'An example film',
      image: 'https://example.test/image.jpg',
      nameRU: 'Фильм',
      nameEN: 'Example Film',
      trailerLink: 'https://example.test/trailer',
      thumbnail: 'https://example.test/thumbnail.jpg',
      movieId: suffix,
    };
    const created = await sendRequest(port, '/movies', {
      method: 'POST',
      token: ownerLogin.body.token,
      body: movieData,
    });
    assert.equal(created.status, 200);

    const forbiddenDelete = await sendRequest(port, `/movies/${created.body._id}`, {
      method: 'DELETE',
      token: otherLogin.body.token,
    });
    assert.equal(forbiddenDelete.status, 403);

    const ownerMovies = await sendRequest(port, '/movies', {
      token: ownerLogin.body.token,
    });
    assert.equal(ownerMovies.status, 200);
    assert.ok(ownerMovies.body.some((movie) => movie._id === created.body._id));
  });
});
