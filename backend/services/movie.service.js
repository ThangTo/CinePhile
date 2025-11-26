const mongoose = require('mongoose');
const Movie = require('../models/movie.model');
const Episode = require('../models/episode.model');
const Comment = require('../models/comment.model');
const Rating = require('../models/rating.model');

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/**
 * Helper: convert mongoose document to plain object with string id
 */
const toPlain = (doc) => {
  const data = doc.toObject({ versionKey: false });
  data.id = data._id.toString();
  delete data._id;
  return data;
};

/**
 * Helper: find movie by ObjectId or slug
 */
const findMovie = async (identifier) => {
  if (!identifier) return null;
  if (isObjectId(identifier)) {
    const movie = await Movie.findById(identifier);
    if (movie) return movie;
  }
  return Movie.findOne({ slug: identifier });
};

/**
 * Helper: shape episode document
 */
const mapEpisode = (episode) => ({
  id: episode._id.toString(),
  episode: episode.episodeId,
  slug: episode.slug,
  duration: episode.duration,
  link_embed: episode.link_embed,
  link_m3u8: episode.link_m3u8,
  videoUrl: episode.link_m3u8 || episode.link_embed,
});

/**
 * Helper: shape comment
 */
const mapComment = (comment) => ({
  id: comment._id.toString(),
  user: comment.userId?.username || 'Ẩn danh',
  avatar: comment.userId?.avatar || 'https://i.pravatar.cc/150?img=5',
  content: comment.content,
  episode: comment.episodeId,
  likes: comment.likes,
  createdAt: comment.createdAt,
});

/**
 * Helper: build Mongo filters from query params
 */
const buildQuery = (filters = {}) => {
  const query = {};
  if (filters.genre) query.genres = filters.genre;
  if (filters.country) query.country = filters.country;
  if (filters.year) query.year = Number(filters.year);
  if (filters.q) {
    const regex = new RegExp(filters.q, 'i');
    query.$or = [{ title: regex }, { englishTitle: regex }, { slug: regex }];
  }
  return query;
};

/**
 * Helper: paginate a query builder
 */
const paginate = async (builder, { page = 1, limit = 12 } = {}) => {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.max(parseInt(limit, 10) || 12, 1);
  const skip = (currentPage - 1) * perPage;

  const [rows, total] = await Promise.all([
    builder
      .skip(skip)
      .limit(perPage)
      .lean()
      .then((docs) =>
        docs.map((doc) => {
          const payload = { ...doc, id: doc._id.toString() };
          delete payload._id;
          return payload;
        }),
      ),
    Movie.countDocuments(builder.getFilter()),
  ]);

  return {
    data: rows,
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    },
  };
};

/**
 * Get all movies
 */
const getAll = async (filters = {}, pagination = {}) => {
  const builder = Movie.find(buildQuery(filters)).sort({ createdAt: -1 });
  return paginate(builder, pagination);
};

/**
 * Get movie by ID or slug with episodes
 */
const getById = async (identifier) => {
  const movieDoc = await findMovie(identifier);
  if (!movieDoc) {
    throw new Error('Movie not found');
  }
  const movie = toPlain(movieDoc);
  const episodes = await Episode.find({ movieId: movieDoc._id }).sort({ episodeId: 1 }).lean();
  movie.episodes = episodes.map(mapEpisode);
  return movie;
};

/**
 * Get trending movies by view count
 */
const getTrending = async (limit = 10) => {
  const data = await Movie.find().sort({ viewCount: -1 }).limit(limit).lean();
  return {
    data: data.map((doc) => {
      const payload = { ...doc, id: doc._id.toString() };
      delete payload._id;
      return payload;
    }),
  };
};

/**
 * Get top rated movies
 */
const getTopRated = async (limit = 10) => {
  const data = await Movie.find().sort({ rating: -1, totalRatings: -1 }).limit(limit).lean();
  return {
    data: data.map((doc) => {
      const payload = { ...doc, id: doc._id.toString() };
      delete payload._id;
      return payload;
    }),
  };
};

/**
 * Get newest movies
 */
const getNewReleases = async (limit = 10) => {
  const data = await Movie.find().sort({ createdAt: -1 }).limit(limit).lean();
  return {
    data: data.map((doc) => {
      const payload = { ...doc, id: doc._id.toString() };
      delete payload._id;
      return payload;
    }),
  };
};

/**
 * Get movies by genre
 */
const getByGenre = async (genre, pagination = {}) => {
  const builder = Movie.find(buildQuery({ genre })).sort({ createdAt: -1 });
  return paginate(builder, pagination);
};

/**
 * Search movies
 */
const search = async (q, pagination = {}) => {
  const builder = Movie.find(buildQuery({ q })).sort({ createdAt: -1 });
  return paginate(builder, pagination);
};

/**
 * Get episodes for a movie
 */
const getEpisodes = async (identifier) => {
  const movieDoc = await findMovie(identifier);
  if (!movieDoc) {
    throw new Error('Movie not found');
  }
  const episodes = await Episode.find({ movieId: movieDoc._id }).sort({ episodeId: 1 }).lean();
  return episodes.map(mapEpisode);
};

/**
 * Get cast list (schema does not store cast -> return empty array)
 */
const getCast = async (identifier) => {
  const movieDoc = await findMovie(identifier);
  if (!movieDoc) {
    throw new Error('Movie not found');
  }
  return [];
};

/**
 * Get comments with pagination
 */
const getComments = async (identifier, filters = {}) => {
  const movieDoc = await findMovie(identifier);
  if (!movieDoc) {
    throw new Error('Movie not found');
  }
  const currentPage = Math.max(parseInt(filters.page, 10) || 1, 1);
  const perPage = Math.max(parseInt(filters.limit, 10) || 10, 1);
  const skip = (currentPage - 1) * perPage;

  const [rows, total] = await Promise.all([
    Comment.find({ movieId: movieDoc._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('userId', 'username avatar')
      .lean(),
    Comment.countDocuments({ movieId: movieDoc._id }),
  ]);

  return {
    data: rows.map(mapComment),
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    },
  };
};

/**
 * Create new comment (requires auth)
 */
const postComment = async (identifier, userId, data = {}) => {
  if (!userId) {
    throw new Error('Authentication required');
  }
  if (!data.content) {
    throw new Error('Content is required');
  }
  const movieDoc = await findMovie(identifier);
  if (!movieDoc) {
    throw new Error('Movie not found');
  }
  const comment = await Comment.create({
    movieId: movieDoc._id,
    userId,
    content: data.content,
    episodeId: data.episodeId || null,
  });
  const populated = await comment.populate('userId', 'username avatar');
  return mapComment(populated);
};

/**
 * Rate movie (requires auth)
 */
const rateMovie = async (identifier, userId, rating) => {
  if (!userId) {
    throw new Error('Authentication required');
  }
  const movieDoc = await findMovie(identifier);
  if (!movieDoc) {
    throw new Error('Movie not found');
  }
  const value = Math.min(Math.max(Number(rating) || 0, 1), 10);
  await Rating.findOneAndUpdate(
    { movieId: movieDoc._id, userId },
    { rating: value },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const agg = await Rating.aggregate([
    { $match: { movieId: movieDoc._id } },
    {
      $group: {
        _id: '$movieId',
        avgRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  if (agg.length) {
    await Movie.findByIdAndUpdate(movieDoc._id, {
      rating: Number(agg[0].avgRating.toFixed(1)),
      totalRatings: agg[0].totalRatings,
    });
  }

  return {
    message: 'Đánh giá thành công',
    rating: value,
    movieId: movieDoc._id.toString(),
  };
};

module.exports = {
  getAll,
  getById,
  getTrending,
  getTopRated,
  getNewReleases,
  getByGenre,
  search,
  getEpisodes,
  getCast,
  getComments,
  postComment,
  rateMovie,
};
