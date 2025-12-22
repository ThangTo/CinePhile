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
 * Remove Vietnamese accents/diacritics from a string
 * Example: "phim việt" -> "phim viet"
 */
function removeVietnameseAccents(str) {
  if (!str) return '';
  
  // Map Vietnamese characters with accents to without accents
  const accentsMap = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D',
  };
  
  return str
    .split('')
    .map(char => accentsMap[char] || char)
    .join('');
}

/**
 * Create regex pattern that matches both accented and non-accented Vietnamese text
 * Example: "phim việt" -> /phim\s+vi[eệ]t/i (matches both "phim việt" and "phim viet")
 */
function createVietnameseRegex(pattern) {
  if (!pattern) return null;
  
  // Normalize pattern to remove accents for regex building
  const normalized = removeVietnameseAccents(pattern.toLowerCase());
  
  // Escape special regex characters
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create regex that matches both accented and non-accented versions
  // This is a simplified approach - for exact matching, we'll use $or with both versions
  return new RegExp(escaped, 'i');
}

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
 * Uses MongoDB $text search (BM25-like) for better relevance scoring
 */
const buildQuery = (filters = {}, useTextSearch = true) => {
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
    const searchQuery = filters.q.trim();
    if (searchQuery) {
      // Normalize Vietnamese accents for accent-insensitive search
      const normalizedQuery = removeVietnameseAccents(searchQuery);
      const hasAccents = normalizedQuery.toLowerCase() !== searchQuery.toLowerCase();
      
      // Escape special regex characters
      const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      if (useTextSearch) {
        // MongoDB $text search doesn't handle Vietnamese accents well
        // We need to use aggregation with $facet to combine $text search with regex
        // But for simplicity, we'll use normalized query for $text search
        // and add regex fallback in the search function itself
        query.$text = { $search: normalizedQuery };
      } else {
        // Regex search - support both accented and non-accented Vietnamese
        // Create regex patterns for both original and normalized queries
        const regexOriginal = new RegExp(escapeRegex(searchQuery), 'i');
        const regexNormalized = new RegExp(escapeRegex(normalizedQuery), 'i');
        
        // Always search with both versions to match both accented and non-accented text in DB
        query.$or = [
          { name: regexOriginal },
          { name: regexNormalized },
          { original_name: regexOriginal },
          { original_name: regexNormalized },
          { slug: regexOriginal },
          { slug: regexNormalized }
        ];
      }
    }
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
 * Search movies using MongoDB $text search (BM25) for relevance scoring
 * Combines BM25 scoring with accent-insensitive regex matching
 * Falls back to regex search if text index is not available
 */
const search = async (q, pagination = {}) => {
  const searchQuery = (q || '').trim();
  if (!searchQuery) {
    // Empty query: return all movies sorted by createdAt
    const builder = Movie.find(buildQuery({ q: '' }, false)).sort({ createdAt: -1 });
    const result = await paginate(builder, pagination);
    return transformPaginatedResult(result);
  }

  const { page = 1, limit = 12 } = pagination;
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.max(parseInt(limit, 10) || 12, 1);
  const skip = (currentPage - 1) * perPage;

  // Normalize query for accent-insensitive search
  const normalizedQuery = removeVietnameseAccents(searchQuery);
  
  // Build base query (filters without search)
  const baseQuery = buildQuery({ q: '' }, false);
  
  // Escape regex special characters
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexOriginal = new RegExp(escapeRegex(searchQuery), 'i');
  const regexNormalized = new RegExp(escapeRegex(normalizedQuery), 'i');

  // Try to use BM25 ($text search) with accent-insensitive support
  // Since $text search doesn't handle accents well, we'll search with both original and normalized
  try {
    // Try BM25 search with both original query (có dấu) and normalized query (không dấu)
    // This ensures we match both accented and non-accented text in DB
    const textQueries = [];
    
    // If query has accents, try both versions
    if (normalizedQuery.toLowerCase() !== searchQuery.toLowerCase()) {
      // Query has accents - try both original and normalized
      textQueries.push(
        { ...baseQuery, $text: { $search: searchQuery } },      // Original (có dấu)
        { ...baseQuery, $text: { $search: normalizedQuery } }   // Normalized (không dấu)
      );
    } else {
      // No accents - just use normalized
      textQueries.push({ ...baseQuery, $text: { $search: normalizedQuery } });
    }

    // Get BM25 results from all text queries
    const allTextResults = [];
    const allTextIds = new Set();
    
    for (const textQuery of textQueries) {
      try {
        const textPipeline = [
          {
            $match: textQuery
          },
          {
            $addFields: {
              textScore: { $meta: 'textScore' }
            }
          },
          {
            $sort: {
              textScore: -1,
              createdAt: -1
            }
          },
          {
            $limit: perPage * 2
          }
        ];

        const results = await Movie.aggregate(textPipeline);
        results.forEach(movie => {
          const id = movie._id.toString();
          if (!allTextIds.has(id)) {
            allTextIds.add(id);
            allTextResults.push({
              ...movie,
              relevanceScore: 100 + (movie.textScore || 0) * 10,
              matchType: 'bm25'
            });
          } else {
            // Update if this result has higher score
            const existing = allTextResults.find(r => r._id.toString() === id);
            if (existing && (movie.textScore || 0) > (existing.textScore || 0)) {
              existing.textScore = movie.textScore;
              existing.relevanceScore = 100 + (movie.textScore || 0) * 10;
            }
          }
        });
      } catch (textError) {
        // Continue with next query if this one fails
        console.warn(`Text search failed for query: ${textError.message}`);
      }
    }

    // Sort BM25 results by score
    allTextResults.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Get regex results for accent-insensitive matching (excluding BM25 matches)
    const regexQuery = {
      ...baseQuery,
      $or: [
        { name: regexOriginal },
        { name: regexNormalized },
        { original_name: regexOriginal },
        { original_name: regexNormalized },
        { slug: regexOriginal },
        { slug: regexNormalized }
      ],
      _id: { $nin: Array.from(allTextIds).map(id => new mongoose.Types.ObjectId(id)) }
    };

    const regexResults = await Movie.find(regexQuery)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .lean();

    // Combine and score results
    const allResults = [...allTextResults];

    // Add regex matches with lower score
    regexResults.forEach(movie => {
      allResults.push({
        ...movie,
        relevanceScore: 10, // Lower score for regex matches
        matchType: 'regex'
      });
    });

    // Sort by relevance score
    const sortedResults = allResults.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Paginate
    const paginatedResults = sortedResults.slice(skip, skip + perPage);
    
    // Count total
    const [textCount, regexCount] = await Promise.all([
      Promise.all(textQueries.map(q => Movie.countDocuments(q))).then(counts => 
        counts.reduce((sum, count) => sum + count, 0)
      ),
      Movie.countDocuments(regexQuery)
    ]);
    
    // Approximate total (may have some overlap between text queries)
    const total = Math.max(textCount, allTextIds.size) + regexCount;

    return {
      data: transformMovies(paginatedResults),
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.max(Math.ceil(total / perPage), 1),
      },
    };

  } catch (error) {
    // Fallback to regex search if $text search fails (e.g., no text index)
    console.warn('BM25 search failed, falling back to regex:', error.message);
    
    const fallbackQuery = buildQuery({ q }, false);
    const builder = Movie.find(fallbackQuery).sort({ createdAt: -1 });
    const result = await paginate(builder, pagination);
    return transformPaginatedResult(result);
  }
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


/**
 * Get recommended movies based on a movie
 * Logic: Same genre -> Trending -> Top Rated
 * @param {string} movieId - Movie ID or slug
 * @param {number} limit - Maximum number of recommendations (default: 10)
 * @returns {Object} { data: Array }
 */
const getRecommendations = async (movieId, limit = 10) => {
  // Find the current movie
  const currentMovie = await findMovie(movieId);
  if (!currentMovie) {
    throw new Error('Movie not found');
  }

  const currentMovieId = currentMovie._id;
  const excludedIds = [currentMovieId]; // Array of ObjectIds for MongoDB queries
  let recommendedMovies = [];

  // Priority 1: Get movies with same genre/category
  if (currentMovie.categories && Array.isArray(currentMovie.categories) && currentMovie.categories.length > 0) {
    // Get first category/genre slug
    const firstCategory = currentMovie.categories[0];
    const genreSlug = typeof firstCategory === 'object' && firstCategory.slug 
      ? firstCategory.slug 
      : (typeof firstCategory === 'string' ? firstCategory : null);
    
    if (genreSlug) {
      // Query movies with same genre, excluding current movie
      const sameGenreMovies = await Movie.find({
        'categories.slug': genreSlug,
        _id: { $ne: currentMovieId },
      })
        .sort({ viewCount: -1, rating: -1 })
        .limit(limit * 2) // Get more to have options
        .lean();

      if (sameGenreMovies && sameGenreMovies.length > 0) {
        // Store ObjectIds before transformation
        sameGenreMovies.forEach((movie) => {
          if (movie._id) {
            excludedIds.push(movie._id);
          }
        });

        const transformed = transformMovies(sameGenreMovies);
        recommendedMovies = [...transformed];
      }
    }
  }

  // Priority 2: If not enough, add trending movies (by viewCount)
  if (recommendedMovies.length < limit) {
    const needed = limit - recommendedMovies.length;
    const trendingMovies = await Movie.find({
      _id: { $nin: excludedIds },
    })
      .sort({ viewCount: -1, createdAt: -1 })
      .limit(needed * 2)
      .lean();

    if (trendingMovies && trendingMovies.length > 0) {
      // Store ObjectIds before transformation
      trendingMovies.forEach((movie) => {
        if (movie._id) {
          excludedIds.push(movie._id);
        }
      });

      const transformed = transformMovies(trendingMovies);
      const additional = transformed.slice(0, needed);
      recommendedMovies = [...recommendedMovies, ...additional];
    }
  }

  // Priority 3: If still not enough, add top rated movies
  if (recommendedMovies.length < limit) {
    const needed = limit - recommendedMovies.length;
    const topRatedMovies = await Movie.find({
      _id: { $nin: excludedIds },
    })
      .sort({ rating: -1, totalRatings: -1, viewCount: -1 })
      .limit(needed * 2)
      .lean();

    if (topRatedMovies && topRatedMovies.length > 0) {
      const transformed = transformMovies(topRatedMovies);
      const additional = transformed.slice(0, needed);
      recommendedMovies = [...recommendedMovies, ...additional];
    }
  }

  // Priority 4: If still not enough, add newest movies
  if (recommendedMovies.length < limit) {
    const needed = limit - recommendedMovies.length;
    const newestMovies = await Movie.find({
      _id: { $nin: excludedIds },
    })
      .sort({ createdAt: -1 })
      .limit(needed)
      .lean();

    if (newestMovies && newestMovies.length > 0) {
      const transformed = transformMovies(newestMovies);
      const additional = transformed.slice(0, needed);
      recommendedMovies = [...recommendedMovies, ...additional];
    }
  }

  // Limit to requested number and return
  return {
    data: recommendedMovies.slice(0, limit),
  };
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
  getRecommendations,
};
