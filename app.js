const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

app.use(require('./routes/login'));

app.use(auth);

app.use(require('./routes/user'));
app.use(require('./routes/movie'));

app.use(errors());

app.use((req, res, next) => {
  next(new ErrorNotFound('Путь не найден'));
});

app.use(errorLogger);
app.use(handleError);

async function main() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to db');

  await app.listen(PORT);
  console.log(`App listening on port ${PORT}`);
}

main();
