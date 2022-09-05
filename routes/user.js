const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');

const { getUserMe, updateUserInfo } = require('../controllers/users');

router.get('/me', getUserMe);

router.patch(
  '/me',
  celebrate({
    body: Joi.object().keys({
      email: Joi.string().required(),
      name: Joi.string().min(2).max(30).required(),
    }),
  }),
  updateUserInfo,
);

module.exports = router;
