const Movie = require('../models/movie');
const { ErrorNotFound, Forbidden } = require('../errors/allErrors');
const { errorMessage } = require('../utils/errorMessage');

module.exports.getMovies = (req, res, next) => {
  const owner = req.user._id;
  Movie.find({ owner })
    .then((movies) => res.send(movies))
    .catch(next);
};

module.exports.createMovie = (req, res, next) => {
  const ownerId = req.user._id;
  const {
    country,
    director,
    duration,
    year,
    description,
    image,
    nameRU,
    nameEN,
    trailerLink,
    thumbnail,
    movieId,
  } = req.body;

  Movie.create({
    country,
    director,
    duration,
    year,
    description,
    image,
    nameRU,
    nameEN,
    trailerLink,
    thumbnail,
    movieId,
    owner: ownerId,
  })
    .then((movie) => res.send(movie))
    .catch((err) => errorMessage(err, req, res, next));
};

module.exports.deleteMovie = (req, res, next) => {
  Movie.findById(req.params._id)
    .orFail(() => {
      throw new ErrorNotFound('Карточка с таким ID - не найдена');
    })
    .then((movie) => {
      if (!movie.owner.equals(req.user._id)) {
        return next(new Forbidden('Нельзя удалить чужую карточку'));
      }
      return movie
        .remove()
        .then(() => res.status(200).send({ message: 'Карточка удалена' }));
    })
    .catch((err) => errorMessage(err, req, res, next));
};
