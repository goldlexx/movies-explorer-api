CREATE TABLE IF NOT EXISTS users (
  _id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 30),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movies (
  _id TEXT PRIMARY KEY NOT NULL,
  country TEXT NOT NULL,
  director TEXT NOT NULL,
  duration REAL NOT NULL,
  year TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  trailerLink TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  owner TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  movieId REAL NOT NULL,
  nameRU TEXT NOT NULL,
  nameEN TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS movies_owner_idx ON movies(owner);
