const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { errors } = require('celebrate');
const { PORT, DATABASE_URL } = require('./configuration');
const { limiter } = require('./utils/limiter');
const { ErrorNotFound } = require('./errors/allErrors');

const { auth } = require('./middlewares/auth');
const { handleError } = require('./middlewares/handleError');
const { requestLogger, errorLogger } = require('./middlewares/logger');

const app = express();

app.use(requestLogger);
app.use(helmet());
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use(require('./routes/login'));

app.use(auth);

app.use(require('./routes/user'));
app.use(require('./routes/movie'));

app.use(errors());

app.use(errorLogger);

app.use((req, res, next) => {
  next(new ErrorNotFound('Путь не найден'));
});

app.use(handleError);

async function main() {
  await mongoose.connect(DATABASE_URL);
  await new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.info(`App listening on port ${PORT}`);
      resolve();
    });
    server.once('error', reject);
  });
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error('Failed to start the server:', err.message);
    await mongoose.disconnect().catch((disconnectError) => {
      console.error('Failed to disconnect from MongoDB after startup error:', disconnectError.message);
    });
    process.exitCode = 1;
  });
}

module.exports = app;
