const mongoose = require('mongoose');
const Movie = require('../models/movie.model');
const Episode = require('../models/episode.model');
const Cast = require('../models/cast.model');
const Comment = require('../models/comment.model');
const Rating = require('../models/rating.model');
const {
  transformMovie,
  transformMovies,
  transformPaginatedResult,
} = require('../utils/movieTransformer');

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
  serverName: episode.serverName,
  audioType: episode.audioType,
  filename: episode.filename,
  duration: episode.duration,
  link_embed: episode.link_embed,
  link_m3u8: episode.link_m3u8,
  videoUrl: episode.link_m3u8 || episode.link_embed,
});

/**
 * Helper: shape comment
 */
const mapComment = (comment) => {
  return {
    id: comment._id?.toString() || comment.id,
    userId: comment.userId?._id?.toString() || comment.userId?.toString() || comment.userId,
    user: comment.userId?.username || 'Ẩn danh',
    avatar: comment.userId?.avatar || 'https://i.pravatar.cc/150?img=5',
    content: comment.content,
    episode: comment.episodeId,
    likes: comment.likes || 0,
    dislikes: comment.dislikes || 0,
    createdAt: comment.createdAt,
  };
};

/**
 * Helper: build Mongo filters from query params
 */
const buildQuery = (filters = {}) => {
  const query = {};
  if (filters.genre) {
    // Support both 'categories.slug' and 'genres' for backward compatibility
    query['categories.slug'] = filters.genre;
  }
  if (filters.country) {
    // Countries are stored as [{ name, slug }]
    query['country.slug'] = filters.country;
  }
  if (filters.type === 'single') {
    query.totalEpisodes = 1;
  } else if (filters.type === 'series') {
    query.totalEpisodes = { $gt: 1 };
  }
  if (filters.year) query.year = Number(filters.year);
  if (filters.q) {
    const regex = new RegExp(filters.q, 'i');
    // Search in DB fields: name (title), original_name (englishTitle), slug
    query.$or = [{ name: regex }, { original_name: regex }, { slug: regex }];
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
      .then((docs) => transformMovies(docs)),
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
  const result = await paginate(builder, pagination);
  return transformPaginatedResult(result);
};

/**
 * Get movie by ID or slug with episodes
 */
const getById = async (identifier) => {
  const movieDoc = await findMovie(identifier);
  if (!movieDoc) {
    throw new Error('Movie not found');
  }
  const movie = transformMovie(movieDoc);
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
    data: transformMovies(data),
  };
};

/**
 * Get top rated movies
 */
const getTopRated = async (limit = 10) => {
  const data = await Movie.find().sort({ rating: -1, totalRatings: -1 }).limit(limit).lean();
  return {
    data: transformMovies(data),
  };
};

/**
 * Get newest movies
 */
const getNewReleases = async (limit = 10) => {
  const data = await Movie.find().sort({ createdAt: -1 }).limit(limit).lean();
  return {
    data: transformMovies(data),
  };
};

/**
 * Get movies by genre
 */
const getByGenre = async (genre, pagination = {}) => {
  const builder = Movie.find(buildQuery({ genre })).sort({ createdAt: -1 });
  const result = await paginate(builder, pagination);
  return transformPaginatedResult(result);
};

/**
 * Get movies by country
 */
const getByCountry = async (country, pagination = {}) => {
  const builder = Movie.find(buildQuery({ country })).sort({ createdAt: -1 });
  const result = await paginate(builder, pagination);
  return transformPaginatedResult(result);
};

/**
 * Get movies by type (single vs series)
 */
const getByType = async (type, pagination = {}) => {
  const builder = Movie.find(buildQuery({ type })).sort({ createdAt: -1 });
  const result = await paginate(builder, pagination);
  return transformPaginatedResult(result);
};

/**
 * Get available filter options (genres & countries)
 */
const getFilterOptions = async () => {
  const [genresRaw, countriesRaw] = await Promise.all([
    Movie.aggregate([
      { $unwind: { path: '$categories', preserveNullAndEmptyArrays: false } },
      { $match: { 'categories.slug': { $ne: null } } },
      {
        $group: {
          _id: '$categories.slug',
          name: { $first: '$categories.name' },
        },
      },
      { $sort: { name: 1 } },
    ]),
    Movie.aggregate([
      { $unwind: { path: '$country', preserveNullAndEmptyArrays: false } },
      { $match: { 'country.slug': { $ne: null } } },
      {
        $group: {
          _id: '$country.slug',
          name: { $first: '$country.name' },
        },
      },
      { $sort: { name: 1 } },
    ]),
  ]);

  return {
    genres: genresRaw.map((item) => ({
      slug: item._id,
      name: item.name || item._id,
    })),
    countries: countriesRaw.map((item) => ({
      slug: item._id,
      name: item.name || item._id,
    })),
  };
};

/**
 * Search movies
 */
const search = async (q, pagination = {}) => {
  const builder = Movie.find(buildQuery({ q })).sort({ createdAt: -1 });
  const result = await paginate(builder, pagination);
  return transformPaginatedResult(result);
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
 * Get cast list for a movie
 * - Dựa trên danh sách tên actor trong movie
 * - Join với collection Cast (nếu đã được backfill từ TMDb)
 * - Giữ nguyên thứ tự theo movie.actor
 */
const getCast = async (identifier) => {
  const movieDoc = await findMovie(identifier);
  if (!movieDoc) {
    throw new Error('Movie not found');
  }

  const actorNames = Array.isArray(movieDoc.actor)
    ? movieDoc.actor.map((n) => (n || '').trim()).filter(Boolean)
    : [];

  if (!actorNames.length) return [];

  const uniqueNames = [...new Set(actorNames)];

  // Lấy cast từ collection Cast theo MỘT query lớn:
  // - name
  // - alsoKnownAs (bao gồm alias + tên gốc từ movies đã được lưu)
  // - nameLatin
  const castDocs = await Cast.find({
    $or: [
      { name: { $in: uniqueNames } },
      { alsoKnownAs: { $in: uniqueNames } },
      { nameLatin: { $in: uniqueNames } },
    ],
  })
    .lean()
    .exec();

  // Map theo nhiều key để truy xuất nhanh trong bộ nhớ
  const byName = new Map(); // key: name
  const byAlias = new Map(); // key: alsoKnownAs item
  const byLatin = new Map(); // key: nameLatin

  const chooseBetter = (existing, candidate) => {
    if (!existing) return candidate;
    const p1 = existing.popularity || 0;
    const p2 = candidate.popularity || 0;
    return p2 > p1 ? candidate : existing;
  };

  for (const doc of castDocs) {
    const name = (doc.name || '').trim();
    if (name) {
      byName.set(name, chooseBetter(byName.get(name), doc));
    }

    const latin = (doc.nameLatin || '').trim();
    if (latin) {
      byLatin.set(latin, chooseBetter(byLatin.get(latin), doc));
    }

    if (Array.isArray(doc.alsoKnownAs)) {
      for (const aliasRaw of doc.alsoKnownAs) {
        const alias = (aliasRaw || '').trim();
        if (!alias) continue;
        byAlias.set(alias, chooseBetter(byAlias.get(alias), doc));
      }
    }
  }

  // Build kết quả theo thứ tự actorNames ban đầu
  const result = actorNames.map((name) => {
    // Ưu tiên: name exact -> alsoKnownAs -> nameLatin
    const doc = byName.get(name) || byAlias.get(name) || byLatin.get(name) || null;
    const avatar = doc?.profileUrl || doc?.profilePath || null;

    return {
      id: doc?._id?.toString() || null,
      name,
      avatar,
      profileUrl: doc?.profileUrl || null,
      profilePath: doc?.profilePath || null,
      tmdbId: doc?.tmdbId || null,
      knownForDepartment: doc?.knownForDepartment || null,
      popularity: doc?.popularity || 0,
    };
  });

  return result;
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
 * Delete a comment (requires auth)
 * Only the comment owner can delete their own comment
 */
const deleteComment = async (commentId, userId) => {
  if (!userId) {
    throw new Error('Authentication required');
  }

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new Error('Invalid comment ID');
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new Error('Comment not found');
  }

  // Check if user is the owner of the comment
  const userIdStr = userId.toString();
  const commentUserIdStr = comment.userId.toString();

  if (userIdStr !== commentUserIdStr) {
    throw new Error('You can only delete your own comments');
  }

  await Comment.findByIdAndDelete(commentId);

  return {
    message: 'Comment deleted successfully',
    commentId: commentId,
  };
};

/**
 * Increment view count for a movie
 * No authentication required - anyone can view
 */
const incrementView = async (identifier) => {
  const movieDoc = await findMovie(identifier);
  if (!movieDoc) {
    throw new Error('Movie not found');
  }

  // Use $inc to atomically increment viewCount
  await Movie.findByIdAndUpdate(movieDoc._id, {
    $inc: { viewCount: 1 },
  });

  // Return updated view count
  const updated = await Movie.findById(movieDoc._id).select('viewCount').lean();
  return {
    message: 'View count updated',
    viewCount: updated.viewCount,
    movieId: movieDoc._id.toString(),
  };
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

/**
 * Get ratings list for a movie
 * @param {string} identifier - Movie ID or slug
 * @param {Object} filters - Pagination filters
 * @returns {Promise<Object>} Ratings with user info
 */
const getRatings = async (identifier, filters = {}) => {
  const movieDoc = await findMovie(identifier);
  if (!movieDoc) {
    throw new Error('Movie not found');
  }

  const currentPage = Math.max(parseInt(filters.page, 10) || 1, 1);
  const perPage = Math.max(parseInt(filters.limit, 10) || 20, 1);
  const skip = (currentPage - 1) * perPage;

  const User = require('../models/user.model');

  const [rows, total] = await Promise.all([
    Rating.find({ movieId: movieDoc._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('userId', 'username avatar')
      .lean(),
    Rating.countDocuments({ movieId: movieDoc._id }),
  ]);

  const ratings = rows.map((rating) => ({
    id: rating._id.toString(),
    userId: rating.userId?._id?.toString() || rating.userId?.toString() || rating.userId,
    user: rating.userId?.username || 'Ẩn danh',
    avatar: rating.userId?.avatar || 'https://i.pravatar.cc/150?img=5',
    rating: rating.rating,
    createdAt: rating.createdAt,
  }));

  return {
    data: ratings,
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    },
  };
};

/**
 * Like a comment (requires auth)
 * Logic đơn giản: chỉ tăng/giảm số like
 * Frontend sẽ quản lý trạng thái active (isLiked/isDisliked) bằng localStorage
 */
const likeComment = async (
  commentId,
  userId,
  isCurrentlyLiked = false,
  isCurrentlyDisliked = false,
) => {
  if (!userId) {
    throw new Error('Authentication required');
  }

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new Error('Invalid comment ID');
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new Error('Comment not found');
  }

  let result;

  if (isCurrentlyLiked) {
    // User đã like -> bỏ like (toggle off) -> giảm số like
    await Comment.findByIdAndUpdate(commentId, {
      $inc: { likes: -1 },
    });
    const updatedComment = await Comment.findById(commentId);
    result = {
      message: 'Đã bỏ like',
      likes: Math.max(0, updatedComment.likes),
      dislikes: updatedComment.dislikes,
    };
  } else {
    // User chưa like -> thêm like -> tăng số like
    // Nếu đang dislike, cần giảm dislike và tăng like
    if (isCurrentlyDisliked) {
      await Comment.findByIdAndUpdate(commentId, {
        $inc: { likes: 1, dislikes: -1 },
      });
    } else {
      await Comment.findByIdAndUpdate(commentId, {
        $inc: { likes: 1 },
      });
    }
    const updatedComment = await Comment.findById(commentId);
    result = {
      message: 'Đã like comment',
      likes: updatedComment.likes,
      dislikes: Math.max(0, updatedComment.dislikes),
    };
  }
  console.log(result);

  return result;
};

/**
 * Dislike a comment (requires auth)
 * Logic đơn giản: chỉ tăng/giảm số dislike
 * Frontend sẽ quản lý trạng thái active (isLiked/isDisliked) bằng localStorage
 */
const dislikeComment = async (
  commentId,
  userId,
  isCurrentlyDisliked = false,
  isCurrentlyLiked = false,
) => {
  if (!userId) {
    throw new Error('Authentication required');
  }

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new Error('Invalid comment ID');
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new Error('Comment not found');
  }

  let result;

  if (isCurrentlyDisliked) {
    // User đã dislike -> bỏ dislike (toggle off) -> giảm số dislike
    await Comment.findByIdAndUpdate(commentId, {
      $inc: { dislikes: -1 },
    });
    const updatedComment = await Comment.findById(commentId);
    result = {
      message: 'Đã bỏ dislike',
      likes: updatedComment.likes,
      dislikes: Math.max(0, updatedComment.dislikes),
    };
  } else {
    // User chưa dislike -> thêm dislike -> tăng số dislike
    // Nếu đang like, cần giảm like và tăng dislike
    if (isCurrentlyLiked) {
      await Comment.findByIdAndUpdate(commentId, {
        $inc: { likes: -1, dislikes: 1 },
      });
    } else {
      await Comment.findByIdAndUpdate(commentId, {
        $inc: { dislikes: 1 },
      });
    }
    const updatedComment = await Comment.findById(commentId);
    result = {
      message: 'Đã dislike comment',
      likes: Math.max(0, updatedComment.likes),
      dislikes: updatedComment.dislikes,
    };
  }

  return result;
};

module.exports = {
  getAll,
  getById,
  getTrending,
  getTopRated,
  getNewReleases,
  getByGenre,
  getByCountry,
  getByType,
  getFilterOptions,
  search,
  getEpisodes,
  getCast,
  getComments,
  postComment,
  rateMovie,
  getRatings,
  incrementView,
  likeComment,
  dislikeComment,
  deleteComment,
};
