const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { JWT_STORAGE_TIME, SALT_LENGTH, JWT_SECRET } = require('../configuration');
const { errorMessage } = require('../utils/errorMessage');
const { ErrorNotFound } = require('../errors/allErrors');

module.exports.getUserMe = (req, res, next) => {
  User.findById(req.user._id)
    .orFail(() => {
      throw new ErrorNotFound('Пользователь не найден');
    })
    .then((user) => {
      res.status(200).send(user);
    })
    .catch((err) => errorMessage(err, req, res, next));
};

module.exports.updateUserInfo = (req, res, next) => {
  const { email, name } = req.body;
  const userId = req.user._id;

  User.findByIdAndUpdate(
    userId,
    { email, name },
    { new: true, runValidators: true },
  )
    .orFail(() => {
      throw new ErrorNotFound('Пользователь с таким id не найден');
    })
    .then((user) => res.send(user))
    .catch((err) => errorMessage(err, req, res, next));
};

module.exports.createUser = (req, res, next) => {
  const {
    name, email, password,
  } = req.body;
  bcrypt
    .hash(password, SALT_LENGTH)
    .then((hash) => User.create({
      name,
      email,
      password: hash,
    }))
    .then((user) => User.findOne({ _id: user._id }))
    .then((user) => res.send(user))
    .catch((err) => errorMessage(err, req, res, next));
};

module.exports.login = (req, res, next) => {
  const { email, password } = req.body;

  return User.findUserByCredentials(email, password)
    .then((user) => {
      const token = jwt.sign({ _id: user._id }, JWT_SECRET, {
        expiresIn: JWT_STORAGE_TIME,
      });
      res.send({ token });
    })
    .catch(next);
};
