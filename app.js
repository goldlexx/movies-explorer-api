const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const { celebrate, Joi, errors } = require('celebrate');
const { PORT, DATABASE_URL } = require('./configuration');
const { limiter } = require('./utils/limiter');
const { ErrorNotFound } = require('./errors/allErrors');
const { createUser, login } = require('./controllers/users');

const { auth } = require('./middlewares/auth');
const { handleError } = require('./middlewares/handleError');
const { requestLogger, errorLogger } = require('./middlewares/logger');

const app = express();

app.use(helmet());
app.use(limiter);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(requestLogger);

app.use(cors());

app.post(
  '/signin',
  celebrate({
    body: Joi.object().keys({
      email: Joi.string().required().email(),
      password: Joi.string().required(),
    }),
  }),
  login,
);

app.post(
  '/signup',
  celebrate({
    body: Joi.object().keys({
      name: Joi.string().min(2).max(30),
      email: Joi.string().required().email(),
      password: Joi.string().required(),
    }),
  }),
  createUser,
);

app.use(auth);

app.use('/users', require('./routes/user'));
app.use('/movies', require('./routes/movie'));

app.use(errorLogger);

app.use(errors());

app.use((req, res, next) => {
  next(new ErrorNotFound('Путь не найден'));
});

app.use(handleError);

async function main() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to db');

  await app.listen(PORT);
  console.log(`App listening on port ${PORT}`);
}

main();
