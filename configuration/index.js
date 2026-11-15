require('dotenv').config();

const { PORT = 3001, JWT_SECRET, DATABASE_URL = 'mongodb://127.0.0.1:27017/bitfilmsdb' } = process.env;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a secret of at least 32 characters');
}

const JWT_STORAGE_TIME = '7d';
const SALT_LENGTH = 10;

module.exports = {
  PORT,
  JWT_SECRET,
  DATABASE_URL,
  SALT_LENGTH,
  JWT_STORAGE_TIME,
};
