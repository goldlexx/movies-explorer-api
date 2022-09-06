require('dotenv').config();

const { PORT = 3000, JWT_SECRET = '07d4f632cf354c662d6c566528858693a9c5b8603bdb26e26ca9a8bdcafabf64', DATABASE_URL = 'mongodb://127.0.0.1:27017/bitfilmsdb' } = process.env;

const JWT_STORAGE_TIME = '7d';
const SALT_LENGTH = 10;

module.exports = {
  PORT,
  JWT_SECRET,
  DATABASE_URL,
  SALT_LENGTH,
  JWT_STORAGE_TIME,
};
