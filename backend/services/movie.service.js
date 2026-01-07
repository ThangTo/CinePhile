const mongoose = require('mongoose');
const Movie = require('../models/movie.model');
const Genre = require('../models/genre.model');
const Country = require('../models/country.model');
const Episode = require('../models/episode.model');
const Cast = require('../models/cast.model');
const Comment = require('../models/comment.model');
const Rating = require('../models/rating.model');
const redisService = require('./redis.service');
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
    à: 'a',
    á: 'a',
    ạ: 'a',
    ả: 'a',
    ã: 'a',
    â: 'a',
    ầ: 'a',
    ấ: 'a',
    ậ: 'a',
    ẩ: 'a',
    ẫ: 'a',
    ă: 'a',
    ằ: 'a',
    ắ: 'a',
    ặ: 'a',
    ẳ: 'a',
    ẵ: 'a',
    è: 'e',
    é: 'e',
    ẹ: 'e',
    ẻ: 'e',
    ẽ: 'e',
    ê: 'e',
    ề: 'e',
    ế: 'e',
    ệ: 'e',
    ể: 'e',
    ễ: 'e',
    ì: 'i',
    í: 'i',
    ị: 'i',
    ỉ: 'i',
    ĩ: 'i',
    ò: 'o',
    ó: 'o',
    ọ: 'o',
    ỏ: 'o',
    õ: 'o',
    ô: 'o',
    ồ: 'o',
    ố: 'o',
    ộ: 'o',
    ổ: 'o',
    ỗ: 'o',
    ơ: 'o',
    ờ: 'o',
    ớ: 'o',
    ợ: 'o',
    ở: 'o',
    ỡ: 'o',
    ù: 'u',
    ú: 'u',
    ụ: 'u',
    ủ: 'u',
    ũ: 'u',
    ư: 'u',
    ừ: 'u',
    ứ: 'u',
    ự: 'u',
    ử: 'u',
    ữ: 'u',
    ỳ: 'y',
    ý: 'y',
    ỵ: 'y',
    ỷ: 'y',
    ỹ: 'y',
    đ: 'd',
    À: 'A',
    Á: 'A',
    Ạ: 'A',
    Ả: 'A',
    Ã: 'A',
    Â: 'A',
    Ầ: 'A',
    Ấ: 'A',
    Ậ: 'A',
    Ẩ: 'A',
    Ẫ: 'A',
    Ă: 'A',
    Ằ: 'A',
    Ắ: 'A',
    Ặ: 'A',
    Ẳ: 'A',
    Ẵ: 'A',
    È: 'E',
    É: 'E',
    Ẹ: 'E',
    Ẻ: 'E',
    Ẽ: 'E',
    Ê: 'E',
    Ề: 'E',
    Ế: 'E',
    Ệ: 'E',
    Ể: 'E',
    Ễ: 'E',
    Ì: 'I',
    Í: 'I',
    Ị: 'I',
    Ỉ: 'I',
    Ĩ: 'I',
    Ò: 'O',
    Ó: 'O',
    Ọ: 'O',
    Ỏ: 'O',
    Õ: 'O',
    Ô: 'O',
    Ồ: 'O',
    Ố: 'O',
    Ộ: 'O',
    Ổ: 'O',
    Ỗ: 'O',
    Ơ: 'O',
    Ờ: 'O',
    Ớ: 'O',
    Ợ: 'O',
    Ở: 'O',
    Ỡ: 'O',
    Ù: 'U',
    Ú: 'U',
    Ụ: 'U',
    Ủ: 'U',
    Ũ: 'U',
    Ư: 'U',
    Ừ: 'U',
    Ứ: 'U',
    Ự: 'U',
    Ử: 'U',
    Ữ: 'U',
    Ỳ: 'Y',
    Ý: 'Y',
    Ỵ: 'Y',
    Ỷ: 'Y',
    Ỹ: 'Y',
    Đ: 'D',
  };

  return str
    .split('')
    .map((char) => accentsMap[char] || char)
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
    const movie = await Movie.findById(identifier).lean();
    if (movie) return movie;
  }
  return Movie.findOne({ slug: identifier }).lean();
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

  // Genre filter (single or array)
  // - filters.genre: một slug duy nhất
  // - filters.genres: nhiều slug; yêu cầu phim phải chứa ĐỦ tất cả các thể loại đã chọn (AND)
  if (filters.genre) {
    query['categories.slug'] = filters.genre;
  } else if (filters.genres && Array.isArray(filters.genres) && filters.genres.length > 0) {
    // Sử dụng $all để đảm bảo phim chứa đầy đủ tất cả slug trong mảng
    query['categories.slug'] = { $all: filters.genres };
  }

  // Country filter (single or array)
  if (filters.country) {
    query['country.slug'] = filters.country;
  } else if (
    filters.countries &&
    Array.isArray(filters.countries) &&
    filters.countries.length > 0
  ) {
    query['country.slug'] = { $in: filters.countries };
  }

  // Type filter
  switch (filters.type) {
    case 'hoathinh':
      query.type = 'hoathinh';
      if (filters.subType === 'single') {
        query.totalEpisodes = 1;
      } else if (filters.subType === 'series') {
        query.totalEpisodes = { $gt: 1 };
      }
      break;
    case 'tvshows':
      query.type = 'tvshows';
      if (filters.subType === 'single') {
        query.totalEpisodes = 1;
      } else if (filters.subType === 'series') {
        query.totalEpisodes = { $gt: 1 };
      }
      break;
    case 'single':
      query.totalEpisodes = 1;
      break;
    case 'series':
      query.totalEpisodes = { $gt: 1 };
      break;
    default:
      break;
  }

  // Year filter (exact or range or array)
  if (Array.isArray(filters.year) && filters.year.length > 0) {
    // Multiple years: use $in
    query.year = { $in: filters.year.map((y) => Number(y)) };
  } else if (filters.year) {
    // Single year
    query.year = Number(filters.year);
  } else if (filters.yearFrom || filters.yearTo) {
    // Year range
    query.year = {};
    if (filters.yearFrom) query.year.$gte = Number(filters.yearFrom);
    if (filters.yearTo) query.year.$lte = Number(filters.yearTo);
  }

  // Quality filter
  if (filters.quality) {
    query.quality = filters.quality;
  }

  // Age rating filter (single or array)
  if (Array.isArray(filters.ageRating) && filters.ageRating.length > 0) {
    query.age_rating = { $in: filters.ageRating };
  } else if (filters.ageRating) {
    query.age_rating = filters.ageRating;
  }

  // Status filter
  if (filters.status) {
    query.status = filters.status;
  }

  // Rating range filter
  if (filters.ratingMin || filters.ratingMax) {
    query.rating = {};
    if (filters.ratingMin) query.rating.$gte = Number(filters.ratingMin);
    if (filters.ratingMax) query.rating.$lte = Number(filters.ratingMax);
  }

  // Language/Version filter (subtitle, dubbed, etc.)
  // Note: audioType is stored in Episode model, not Movie model
  // This filter will be handled separately in getAll function using aggregation
  // Map frontend values to database values:
  // "subtitle" -> ["vietsub", "thuyet-minh"] (phụ đề)
  // "dubbed" -> ["long-tieng"] (lồng tiếng)
  if (filters.lang) {
    // Store the filter for later processing in getAll function
    query._audioTypeFilter = filters.lang;
  }

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
          { slug: regexNormalized },
        ];
      }
    }
  }
  return query;
};

/**
 * Helper: get sort options
 * Luôn ưu tiên: year giảm dần, sau đó theo sort option, cuối cùng là createdAt giảm dần
 */
const getSortOptions = (sort = 'newest') => {
  let sortOption = {};

  switch (sort) {
    case 'newest':
      sortOption = { createdAt: -1 };
      break;
    case 'updated':
      sortOption = { updatedAt: -1, createdAt: -1 };
      break;
    case 'imdb':
      sortOption = { rating: -1, totalRatings: -1 };
      break;
    case 'views':
      sortOption = { viewCount: -1 };
      break;
    default:
      sortOption = { createdAt: -1 };
  }

  // Luôn ưu tiên year giảm dần trước, sau đó mới đến sort option, cuối cùng là createdAt
  return {
    year: -1, // Ưu tiên năm giảm dần
    ...sortOption, // Sau đó mới đến sort option
    createdAt: -1, // Cuối cùng là createdAt giảm dần (nếu cùng year và cùng sort option)
  };
};

/**
 * Helper: Map frontend audioType filter values to database values
 * @param {string|string[]} audioTypeFilter - Frontend filter value(s) ('subtitle', 'thuyet-minh', 'dubbed')
 * @returns {string[]} Array of database audioType values
 */
const mapAudioTypeFilter = (audioTypeFilter) => {
  const filters = Array.isArray(audioTypeFilter) ? audioTypeFilter : [audioTypeFilter];
  const mappedValues = [];

  filters.forEach((filter) => {
    if (filter === 'subtitle') {
      mappedValues.push('vietsub');
    } else if (filter === 'thuyet-minh') {
      mappedValues.push('thuyet-minh');
    } else if (filter === 'dubbed') {
      mappedValues.push('long-tieng');
    } else {
      // If it's already a database value, use it directly
      mappedValues.push(filter);
    }
  });

  return mappedValues;
};

/**
 * Helper: Create aggregation pipeline to filter movies by audioType
 * @param {Object} baseQuery - Base MongoDB query
 * @param {string[]} audioTypes - Array of audioType values to filter
 * @returns {Array} MongoDB aggregation pipeline
 */
const createAudioTypeFilterPipeline = (baseQuery, audioTypes) => {
  return [
    { $match: baseQuery },
    {
      $lookup: {
        from: 'episodes',
        localField: '_id',
        foreignField: 'movieId',
        as: 'episodes',
      },
    },
    {
      $match: {
        'episodes.audioType': { $in: audioTypes },
      },
    },
  ];
};

/**
 * Helper: paginate a query builder
 */
const paginate = async (builder, { page = 1, limit = 12, sort } = {}) => {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);
  const skip = (currentPage - 1) * perPage;
  const sortOptions = getSortOptions(sort);

  const [rows, total] = await Promise.all([
    builder
      .sort(sortOptions)
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
  const { sort, ...paginationParams } = pagination;

  // Handle audioType filter separately since it's in Episode model, not Movie
  const audioTypeFilter = filters.lang;
  const queryFilters = { ...filters };
  if (audioTypeFilter) {
    // Remove lang from filters to avoid adding it to buildQuery
    delete queryFilters.lang;
  }

  const baseQuery = buildQuery(queryFilters);
  // Remove _audioTypeFilter if it was added by buildQuery
  if (baseQuery._audioTypeFilter) {
    delete baseQuery._audioTypeFilter;
  }

  // If audioType filter is present, use aggregation to filter by episodes
  if (audioTypeFilter) {
    // Map frontend values to database values
    const audioTypes = mapAudioTypeFilter(audioTypeFilter);

    // Use aggregation to find movies with episodes matching audioType
    const currentPage = Math.max(parseInt(paginationParams.page, 10) || 1, 1);
    const perPage = Math.max(parseInt(paginationParams.limit, 10) || 12, 1);
    const skip = (currentPage - 1) * perPage;
    const sortOptions = getSortOptions(sort);

    const pipeline = [
      ...createAudioTypeFilterPipeline(baseQuery, audioTypes),
      // Sort
      { $sort: sortOptions },
      // Count total before pagination
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: perPage }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await Movie.aggregate(pipeline);
    const movies = result?.data || [];
    const total = result?.total[0]?.count || 0;

    return {
      data: transformMovies(movies),
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.max(Math.ceil(total / perPage), 1),
      },
    };
  } else {
    // No audioType filter, use normal query
    const builder = Movie.find(baseQuery);
    const result = await paginate(builder, { ...paginationParams, sort });
    return transformPaginatedResult(result);
  }
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
 * Cached for 10 minutes
 */
const getTrending = async (limit = 10) => {
  const cacheKey = `movies:trending:${limit}`;

  // Try cache first
  if (redisService.isConnected) {
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Cache miss - fetch from DB
  const data = await Movie.find().sort({ viewCount: -1 }).limit(limit).lean();
  const result = {
    data: transformMovies(data),
  };

  // Cache for 10 minutes
  if (redisService.isConnected) {
    await redisService.set(cacheKey, result, 600);
  }

  return result;
};

/**
 * Get top rated movies
 * Cached for 10 minutes
 */
const getTopRated = async (limit = 10) => {
  const cacheKey = `movies:top-rated:${limit}`;

  // Try cache first
  if (redisService.isConnected) {
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Cache miss - fetch from DB
  const data = await Movie.find().sort({ rating: -1, totalRatings: -1 }).limit(limit).lean();
  const result = {
    data: transformMovies(data),
  };

  // Cache for 10 minutes
  if (redisService.isConnected) {
    await redisService.set(cacheKey, result, 600);
  }

  return result;
};

/**
 * Get newest movies
 * Cached for 5 minutes
 */
const getNewReleases = async (limit = 10) => {
  const cacheKey = `movies:new-releases:${limit}`;

  // Try cache first
  if (redisService.isConnected) {
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Cache miss - fetch from DB
  const data = await Movie.find().sort({ createdAt: -1 }).limit(limit).lean();
  const result = {
    data: transformMovies(data),
  };

  // Cache for 5 minutes
  if (redisService.isConnected) {
    await redisService.set(cacheKey, result, 300);
  }

  return result;
};

/**
 * Get movies by genre
 */
const getByGenre = async (genre, options = {}) => {
  const { page, limit, sort, ...filters } = options;
  const pagination = { page, limit, sort };
  const queryFilters = { genre, ...filters };
  const builder = Movie.find(buildQuery(queryFilters));
  const result = await paginate(builder, pagination);
  return transformPaginatedResult(result);
};

/**
 * Get movies by country
 */
const getByCountry = async (country, options = {}) => {
  const { page, limit, sort, ...filters } = options;
  const pagination = { page, limit, sort };
  const queryFilters = { country, ...filters };
  const builder = Movie.find(buildQuery(queryFilters));
  const result = await paginate(builder, pagination);
  return transformPaginatedResult(result);
};

/**
 * Get movies by type (single vs series)
 */
const getByType = async (type, options = {}) => {
  const { page, limit, sort, ...filters } = options;
  const pagination = { page, limit, sort };
  console.log('filters', type, filters);

  let builder;

  const baseQuery = buildQuery(filters);
  const mongoQuery = { type, ...baseQuery };
  builder = Movie.find(mongoQuery);

  const result = await paginate(builder, pagination);
  return transformPaginatedResult(result);
};

/**
 * Get available filter options (genres & countries)
 * Now đọc từ collection Genre/Country riêng thay vì aggregate trên Movie để tối ưu
 * Cached in Redis for 1 hour (3600 seconds)
 */
const getFilterOptions = async () => {
  const cacheKey = 'movies:filter-options';

  // Try cache first
  if (redisService.isConnected) {
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Cache miss - fetch from DB
  const [genres, countries] = await Promise.all([
    Genre.find({ slug: { $ne: '' } })
      .sort({ name: 1 })
      .lean(),
    Country.find({ slug: { $ne: '' } })
      .sort({ name: 1 })
      .lean(),
  ]);

  const result = {
    genres: genres.map((g) => ({
      slug: g.slug,
      name: g.name,
      count: g.count,
    })),
    countries: countries.map((c) => ({
      slug: c.slug,
      name: c.name,
      count: c.count,
    })),
  };

  // Cache for 1 hour (3600 seconds)
  if (redisService.isConnected) {
    await redisService.set(cacheKey, result, 3600);
  }

  return result;
};

/**
 * Get top genres by total view count
 * Cached for 30 minutes
 * @param {number} limit - Number of genres to return (default: 10)
 * @returns {Promise<Array>} Array of { name, slug, totalViews }
 */
const getTopGenresByViews = async (limit = 10) => {
  const cacheKey = `movies:top-genres:${limit}`;

  // Try cache first
  if (redisService.isConnected) {
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Cache miss - fetch from DB
  const topGenres = await Movie.aggregate([
    { $unwind: '$categories' },
    {
      $group: {
        _id: '$categories.name',
        slug: { $first: '$categories.slug' },
        totalViews: { $sum: '$viewCount' },
      },
    },
    { $sort: { totalViews: -1 } },
    { $limit: limit },
  ]);

  const result = topGenres.map((g) => ({
    name: g._id,
    slug: g.slug || g._id,
    totalViews: g.totalViews || 0,
  }));

  // Cache for 30 minutes
  if (redisService.isConnected) {
    await redisService.set(cacheKey, result, 1800);
  }

  return result;
};

/**
 * Search movies using MongoDB $text search (BM25) for relevance scoring
 * Combines BM25 scoring with accent-insensitive regex matching
 * Falls back to regex search if text index is not available
 * Priority: Search first, then apply filters to search results
 */
const search = async (q, options = {}) => {
  const { page, limit, sort, ...filters } = options;
  const pagination = { page, limit, sort };
  const searchQuery = (q || '').trim();
  if (!searchQuery) {
    // Empty query: return all movies with filters, sorted
    const queryFilters = { q: '', ...filters };
    const builder = Movie.find(buildQuery(queryFilters, false));
    const result = await paginate(builder, pagination);
    return transformPaginatedResult(result);
  }

  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.max(parseInt(limit, 10) || 12, 1);
  const skip = (currentPage - 1) * perPage;

  // Normalize query for accent-insensitive search
  const normalizedQuery = removeVietnameseAccents(searchQuery);

  // STEP 1: Search first (without filters) to get matching movie IDs
  // This ensures search results are prioritized, then filters are applied to those results
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexOriginal = new RegExp(escapeRegex(searchQuery), 'i');
  const regexNormalized = new RegExp(escapeRegex(normalizedQuery), 'i');

  // Try to use BM25 ($text search) with accent-insensitive support
  // Since $text search doesn't handle accents well, we'll search with both original and normalized
  try {
    // STEP 1A: Search without filters to get all matching movie IDs
    const textQueries = [];

    // If query has accents, try both versions
    if (normalizedQuery.toLowerCase() !== searchQuery.toLowerCase()) {
      // Query has accents - try both original and normalized
      textQueries.push(
        { $text: { $search: searchQuery } }, // Original (có dấu)
        { $text: { $search: normalizedQuery } }, // Normalized (không dấu)
      );
    } else {
      // No accents - just use normalized
      textQueries.push({ $text: { $search: normalizedQuery } });
    }

    // STEP 1B: Get all matching movie IDs from search (without filters)
    const allTextIds = new Set();
    const allTextResults = [];

    for (const textQuery of textQueries) {
      try {
        const textPipeline = [
          {
            $match: textQuery,
          },
          {
            $addFields: {
              textScore: { $meta: 'textScore' },
            },
          },
          {
            $project: {
              _id: 1,
              textScore: 1,
              createdAt: 1,
            },
          },
        ];

        const results = await Movie.aggregate(textPipeline);
        results.forEach((movie) => {
          const id = movie._id.toString();
          if (!allTextIds.has(id)) {
            allTextIds.add(id);
            allTextResults.push({
              _id: movie._id,
              textScore: movie.textScore || 0,
              createdAt: movie.createdAt,
              relevanceScore: 100 + (movie.textScore || 0) * 10,
            });
          } else {
            // Update if this result has higher score
            const existing = allTextResults.find((r) => r._id.toString() === id);
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

    // Get regex results for accent-insensitive matching (excluding BM25 matches)
    const regexSearchQuery = {
      $or: [
        { name: regexOriginal },
        { name: regexNormalized },
        { original_name: regexOriginal },
        { original_name: regexNormalized },
        { slug: regexOriginal },
        { slug: regexNormalized },
      ],
      _id: { $nin: Array.from(allTextIds).map((id) => new mongoose.Types.ObjectId(id)) },
    };

    const regexResults = await Movie.find(regexSearchQuery)
      .select('_id createdAt')
      .limit(1000) // Limit to avoid too many results
      .lean();

    // Add regex IDs to the set
    regexResults.forEach((movie) => {
      const id = movie._id.toString();
      if (!allTextIds.has(id)) {
        allTextIds.add(id);
        allTextResults.push({
          _id: movie._id,
          textScore: 0,
          createdAt: movie.createdAt,
          relevanceScore: 10, // Lower score for regex matches
        });
      }
    });

    // STEP 2: Now apply filters to the search results
    // Build filter query (without search and without lang filter)
    const queryFilters = { ...filters };
    const audioTypeFilter = filters.lang;
    if (audioTypeFilter) {
      delete queryFilters.lang;
    }
    const filterQuery = buildQuery({ q: '', ...queryFilters }, false);
    // Remove _audioTypeFilter if it was added
    if (filterQuery._audioTypeFilter) {
      delete filterQuery._audioTypeFilter;
    }

    // Combine: search results + filters
    const baseQuery = {
      ...filterQuery,
      _id: { $in: Array.from(allTextIds).map((id) => new mongoose.Types.ObjectId(id)) },
    };

    // STEP 3: Get full movie documents with filters applied
    // If audioType filter is present, use aggregation to filter by episodes
    let movies;
    if (audioTypeFilter) {
      // Map frontend values to database values
      const audioTypes = mapAudioTypeFilter(audioTypeFilter);

      // Use aggregation to filter by audioType
      const aggregationPipeline = createAudioTypeFilterPipeline(baseQuery, audioTypes);

      movies = await Movie.aggregate(aggregationPipeline);
    } else {
      // No audioType filter, use normal query
      movies = await Movie.find(baseQuery).lean();
    }

    // STEP 4: Sort by relevance score (from search) first, then by sort option
    const moviesWithScores = movies.map((movie) => {
      const id = movie._id.toString();
      const searchResult = allTextResults.find((r) => r._id.toString() === id);
      return {
        ...movie,
        relevanceScore: searchResult ? searchResult.relevanceScore : 0,
      };
    });

    // Sort: first by relevance score, then by year (giảm dần), then by sort option, finally by createdAt
    moviesWithScores.sort((a, b) => {
      // First priority: relevance score from search
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // Second priority: year giảm dần
      const yearDiff = (b.year || 0) - (a.year || 0);
      if (yearDiff !== 0) return yearDiff;
      // Third priority: sort option
      if (sort === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sort === 'updated') {
        const updatedDiff =
          new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        if (updatedDiff !== 0) return updatedDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sort === 'imdb') {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        const totalRatingsDiff = (b.totalRatings || 0) - (a.totalRatings || 0);
        if (totalRatingsDiff !== 0) return totalRatingsDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sort === 'views') {
        const viewsDiff = (b.viewCount || 0) - (a.viewCount || 0);
        if (viewsDiff !== 0) return viewsDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      // Default: createdAt giảm dần
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // STEP 5: Paginate
    const paginatedResults = moviesWithScores.slice(skip, skip + perPage);

    return {
      data: transformMovies(paginatedResults),
      pagination: {
        page: currentPage,
        limit: perPage,
        total: moviesWithScores.length,
        totalPages: Math.max(Math.ceil(moviesWithScores.length / perPage), 1),
      },
    };
  } catch (error) {
    // Fallback to regex search if $text search fails (e.g., no text index)
    console.warn('BM25 search failed, falling back to regex:', error.message);

    // Fallback: Search with regex first, then apply filters
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexOriginal = new RegExp(escapeRegex(searchQuery), 'i');
    const normalizedQuery = removeVietnameseAccents(searchQuery);
    const regexNormalized = new RegExp(escapeRegex(normalizedQuery), 'i');

    // Search first (without filters)
    const searchQueryOnly = {
      $or: [
        { name: regexOriginal },
        { name: regexNormalized },
        { original_name: regexOriginal },
        { original_name: regexNormalized },
        { slug: regexOriginal },
        { slug: regexNormalized },
      ],
    };

    const searchResults = await Movie.find(searchQueryOnly).select('_id').lean();
    const searchIds = searchResults.map((m) => m._id);

    // Apply filters to search results
    const queryFilters = { ...filters };
    const audioTypeFilter = filters.lang;
    if (audioTypeFilter) {
      delete queryFilters.lang;
    }
    const filterQuery = buildQuery({ q: '', ...queryFilters }, false);
    // Remove _audioTypeFilter if it was added
    if (filterQuery._audioTypeFilter) {
      delete filterQuery._audioTypeFilter;
    }

    const baseQuery = {
      ...filterQuery,
      _id: { $in: searchIds },
    };

    // Get all matching movies with filters
    // If audioType filter is present, use aggregation
    let movies;
    if (audioTypeFilter) {
      // Map frontend values to database values
      const audioTypes = mapAudioTypeFilter(audioTypeFilter);

      const aggregationPipeline = createAudioTypeFilterPipeline(baseQuery, audioTypes);

      movies = await Movie.aggregate(aggregationPipeline);
    } else {
      movies = await Movie.find(baseQuery).lean();
    }

    // Sort by relevance (all have same relevance in fallback) and then by sort option
    const sortOptions = getSortOptions(sort);
    const moviesWithScores = movies.map((movie) => ({
      ...movie,
      relevanceScore: 10, // Same relevance for all in fallback
    }));

    // Sort: first by year (giảm dần), then by sort option, finally by createdAt
    moviesWithScores.sort((a, b) => {
      // First priority: year giảm dần
      const yearDiff = (b.year || 0) - (a.year || 0);
      if (yearDiff !== 0) return yearDiff;
      // Second priority: sort option
      if (sort === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sort === 'updated') {
        const updatedDiff =
          new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        if (updatedDiff !== 0) return updatedDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sort === 'imdb') {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        const totalRatingsDiff = (b.totalRatings || 0) - (a.totalRatings || 0);
        if (totalRatingsDiff !== 0) return totalRatingsDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sort === 'views') {
        const viewsDiff = (b.viewCount || 0) - (a.viewCount || 0);
        if (viewsDiff !== 0) return viewsDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      // Default: createdAt giảm dần
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Paginate
    const paginatedResults = moviesWithScores.slice(skip, skip + perPage);

    return {
      data: transformMovies(paginatedResults),
      pagination: {
        page: currentPage,
        limit: perPage,
        total: moviesWithScores.length,
        totalPages: Math.max(Math.ceil(moviesWithScores.length / perPage), 1),
      },
    };
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
    Comment.find({ movieId: movieDoc._id, status: 'allowed' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('userId', 'username avatar')
      .lean(),
    Comment.countDocuments({ movieId: movieDoc._id, status: 'allowed' }),
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
const moderationService = require('./moderation.service');

// ...

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

  // AI Moderation Check
  let moderationResult = { flag: null, reason: null };
  let status = 'allowed';

  try {
    moderationResult = await moderationService.checkComment(data.content);
    if (moderationResult.flag) {
      status = 'pending';
    }
  } catch (e) {
    console.error('Moderation check failed, proceeding as allowed', e);
  }

  const comment = await Comment.create({
    movieId: movieDoc._id,
    userId,
    content: data.content,
    episodeId: data.episodeId || null,
    flag: moderationResult.flag,
    flagReason: moderationResult.reason,
    status: status,
  });
  const populated = await comment.populate('userId', 'username avatar');

  // Only map if allowed (technically frontend should handle hiding pending, but API usually returns created object)
  // We return it, frontend will see status=pending and might show "Pending approval" message
  return mapComment({ ...populated.toObject(), status });
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
  if (
    currentMovie.categories &&
    Array.isArray(currentMovie.categories) &&
    currentMovie.categories.length > 0
  ) {
    // Get first category/genre slug
    const firstCategory = currentMovie.categories[0];
    const genreSlug =
      typeof firstCategory === 'object' && firstCategory.slug
        ? firstCategory.slug
        : typeof firstCategory === 'string'
        ? firstCategory
        : null;

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
  getTopGenresByViews,
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
