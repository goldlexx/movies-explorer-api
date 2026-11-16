const encoder = new TextEncoder();
const allowedOrigin = 'https://goldlexx.github.io';
const jwtLifetime = 7 * 24 * 60 * 60;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    ...(origin === allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
  };
}

function respond(request, data, status = 200) {
  return json(data, status, corsHeaders(request));
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function base64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function newId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100000 }, key, 256);
  return base64Url(new Uint8Array(bits));
}

async function signToken(userId, secret) {
  const header = base64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = base64Url(encoder.encode(JSON.stringify({ _id: userId, exp: Math.floor(Date.now() / 1000) + jwtLifetime })));
  const input = `${header}.${payload}`;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(input));
  return `${input}.${base64Url(new Uint8Array(signature))}`;
}

async function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) fail(401, 'Необходима авторизация');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('HMAC', key, decodeBase64Url(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
  if (!valid) fail(401, 'Необходима авторизация');
  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
  if (!payload._id || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) fail(401, 'Необходима авторизация');
  return payload;
}

async function readJson(request) {
  try {
    const value = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'Некорректный JSON');
    return value;
  } catch {
    fail(400, 'Некорректный JSON');
  }
}

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateMovie(movie) {
  const strings = ['country', 'director', 'year', 'description', 'nameRU', 'nameEN'];
  if (!movie || strings.some((key) => typeof movie[key] !== 'string') || !Number.isFinite(movie.duration) || !Number.isFinite(movie.movieId)) return false;
  return ['image', 'trailerLink', 'thumbnail'].every((key) => {
    try { return ['http:', 'https:'].includes(new URL(movie[key]).protocol); } catch { return false; }
  });
}

async function authenticate(request, env) {
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) fail(401, 'Необходима авторизация');
  return verifyToken(authorization.slice(7), env.JWT_SECRET);
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method;

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) return respond(request, { message: 'Метод не поддерживается' }, 405);
  if (!env.DB || !env.JWT_SECRET || env.JWT_SECRET.length < 32) return respond(request, { message: 'Сервис не настроен' }, 500);

  if (method === 'POST' && path === '/signup') {
    const { name, email, password } = await readJson(request);
    if (typeof name !== 'string' || name.length < 2 || name.length > 30 || !validateEmail(email) || typeof password !== 'string' || password.length < 8) fail(400, 'Некорректные данные пользователя');
    const id = newId();
    const salt = base64Url(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await passwordHash(password, salt);
    try {
      await env.DB.prepare('INSERT INTO users (_id, name, email, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)').bind(id, name, email.toLowerCase(), hash, salt).run();
    } catch (error) {
      if (/unique|constraint/i.test(error.message)) fail(409, 'Пользователь с таким email уже существует');
      throw error;
    }
    return respond(request, { _id: id, name, email: email.toLowerCase() });
  }

  if (method === 'POST' && path === '/signin') {
    const { email, password } = await readJson(request);
    if (!validateEmail(email) || typeof password !== 'string') fail(400, 'Некорректные данные для входа');
    const user = await env.DB.prepare('SELECT _id, password_hash, password_salt FROM users WHERE email = ?').bind(email.toLowerCase()).first();
    if (!user || await passwordHash(password, user.password_salt) !== user.password_hash) fail(401, 'Неправильные почта или пароль');
    return respond(request, { token: await signToken(user._id, env.JWT_SECRET) });
  }

  const payload = await authenticate(request, env);

  if (method === 'GET' && path === '/users/me') {
    const user = await env.DB.prepare('SELECT _id, name, email FROM users WHERE _id = ?').bind(payload._id).first();
    if (!user) fail(404, 'Пользователь не найден');
    return respond(request, user);
  }

  if (method === 'PATCH' && path === '/users/me') {
    const { email, name } = await readJson(request);
    if (!validateEmail(email) || typeof name !== 'string' || name.length < 2 || name.length > 30) fail(400, 'Некорректные данные пользователя');
    try {
      const result = await env.DB.prepare('UPDATE users SET email = ?, name = ? WHERE _id = ?').bind(email.toLowerCase(), name, payload._id).run();
      if (!result.meta.changes) fail(404, 'Пользователь с таким id не найден');
    } catch (error) {
      if (/unique|constraint/i.test(error.message)) fail(409, 'Пользователь с таким email уже существует');
      throw error;
    }
    return respond(request, await env.DB.prepare('SELECT _id, name, email FROM users WHERE _id = ?').bind(payload._id).first());
  }

  if (method === 'GET' && path === '/movies') {
    const { results } = await env.DB.prepare('SELECT _id, country, director, duration, year, description, image, trailerLink, thumbnail, owner, movieId, nameRU, nameEN FROM movies WHERE owner = ? ORDER BY rowid DESC').bind(payload._id).all();
    return respond(request, results);
  }

  if (method === 'POST' && path === '/movies') {
    const movie = await readJson(request);
    if (!validateMovie(movie)) fail(400, 'Некорректные данные фильма');
    const id = newId();
    await env.DB.prepare('INSERT INTO movies (_id, country, director, duration, year, description, image, trailerLink, thumbnail, owner, movieId, nameRU, nameEN) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, movie.country, movie.director, movie.duration, movie.year, movie.description, movie.image, movie.trailerLink, movie.thumbnail, payload._id, movie.movieId, movie.nameRU, movie.nameEN).run();
    return respond(request, { _id: id, ...movie, owner: payload._id });
  }

  const movieMatch = path.match(/^\/movies\/([a-f\d]{24})$/i);
  if (method === 'DELETE' && movieMatch) {
    const movie = await env.DB.prepare('SELECT _id, owner FROM movies WHERE _id = ?').bind(movieMatch[1]).first();
    if (!movie) fail(404, 'Карточка с таким ID - не найдена');
    if (movie.owner !== payload._id) fail(403, 'Нельзя удалить чужую карточку');
    await env.DB.prepare('DELETE FROM movies WHERE _id = ? AND owner = ?').bind(movieMatch[1], payload._id).run();
    return respond(request, { message: 'Карточка удалена' });
  }

  return respond(request, { message: 'Путь не найден' }, 404);
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (error) {
      const status = error.status || 500;
      return json({ message: status === 500 ? 'На сервере произошла ошибка' : error.message }, status, corsHeaders(request));
    }
  },
};
