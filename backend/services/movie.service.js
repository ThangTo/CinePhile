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
const { isLatinName } = require('../utils/castUtils');

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
      .sort({ count: -1, name: 1 })
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
 * Search movies using MongoDB Atlas Search
 * Uses compound query with must (filters) and should (keyword search)
 * Priority: Filters first (must), then keyword search (should)
 */
const search = async (q, options = {}) => {
  const { page, limit, sort, ...filters } = options;
  const keyword = (q || '').trim();
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.max(parseInt(limit, 10) || 12, 1);
  const skip = (currentPage - 1) * perPage;

  // CASE 1: KHÔNG CÓ KEYWORD -> Dùng Query thường (Fallback)
  if (!keyword || keyword.length === 0) {
    // Gọi lại logic query thường của bạn ở đây
    const queryFilters = { q: '', ...filters };
    // Giả sử bạn có hàm buildQuery và paginate cũ
    const builder = Movie.find(buildQuery(queryFilters, false));
    const result = await paginate(builder, { page, limit, sort });
    return transformPaginatedResult(result);
  }

  // CASE 2: CÓ KEYWORD -> Dùng ATLAS SEARCH (Optimized)
  try {
    // --- BƯỚC 1: Xây dựng điều kiện Filter (MUST) ---
    // Điều kiện bắt buộc: Phải đúng thể loại, năm, quốc gia...
    const mustConditions = [];

    // 1.1 Filter Genres (Slug - Token)
    if (filters.genres && Array.isArray(filters.genres) && filters.genres.length > 0) {
      // Logic: Phim phải chứa ÍT NHẤT 1 trong các genres truyền vào (Dùng compound should trong must hoặc query trực tiếp)
      // Cách đơn giản nhất cho Token array: Dùng 'term' với operator 'in' nếu field là array,
      // nhưng Atlas Search term mặc định là match exact.
      // Để support filter mảng genres: Phim phải có genre A HOẶC genre B
      const genreShoulds = filters.genres.map((g) => ({
        term: { path: 'categories.slug', value: g },
      }));
      mustConditions.push({
        compound: { should: genreShoulds, minimumShouldMatch: 1 },
      });
    } else if (filters.genre) {
      mustConditions.push({ term: { path: 'categories.slug', value: filters.genre } });
    }

    // 1.2 Filter Countries (Slug - Token)
    if (filters.countries && Array.isArray(filters.countries) && filters.countries.length > 0) {
      const countryShoulds = filters.countries.map((c) => ({
        term: { path: 'country.slug', value: c },
      }));
      mustConditions.push({
        compound: { should: countryShoulds, minimumShouldMatch: 1 },
      });
    } else if (filters.country) {
      mustConditions.push({ term: { path: 'country.slug', value: filters.country } });
    }

    // 1.3 Filter Type, Status, Quality, AgeRating (Token)
    if (filters.type) mustConditions.push({ term: { path: 'type', value: filters.type } });
    if (filters.status) mustConditions.push({ term: { path: 'status', value: filters.status } });
    if (filters.quality) mustConditions.push({ term: { path: 'quality', value: filters.quality } });
    if (filters.ageRating) {
      if (Array.isArray(filters.ageRating)) {
        const ratingShoulds = filters.ageRating.map((r) => ({
          term: { path: 'age_rating', value: r },
        }));
        mustConditions.push({ compound: { should: ratingShoulds, minimumShouldMatch: 1 } });
      } else {
        mustConditions.push({ term: { path: 'age_rating', value: filters.ageRating } });
      }
    }

    // 1.4 Filter Year (Number - Equals)
    if (filters.year) {
      if (Array.isArray(filters.year)) {
        const yearShoulds = filters.year.map((y) => ({
          equals: { path: 'year', value: parseInt(y, 10) },
        }));
        mustConditions.push({ compound: { should: yearShoulds, minimumShouldMatch: 1 } });
      } else {
        mustConditions.push({ equals: { path: 'year', value: parseInt(filters.year, 10) } });
      }
    }

    // 1.5 Filter SubType (Logic số tập)
    if (filters.subType) {
      if (filters.subType === 'single') {
        mustConditions.push({ equals: { path: 'totalEpisodes', value: 1 } });
      } else if (filters.subType === 'series') {
        mustConditions.push({ range: { path: 'totalEpisodes', gt: 1 } });
      }
    }

    // --- BƯỚC 2: Xây dựng điều kiện Tìm kiếm (SHOULD) ---
    // Logic thông minh để loại bỏ kết quả rác
    const shouldConditions = [];
    const isShortKeyword = keyword.length < 5; // Định nghĩa từ khóa ngắn

    // 2.1 AUTocomplete SEARCH (Tên phim) - Boost cực cao (10)
    // Sử dụng autocomplete cho name và original_name (edgeGram tokenization)
    shouldConditions.push({
      autocomplete: {
        query: keyword,
        path: 'name',
        score: { boost: { value: 10 } },
      },
    });

    // 2.2 AUTocomplete SEARCH (Tên gốc) - Boost cao (8)
    shouldConditions.push({
      autocomplete: {
        query: keyword,
        path: 'original_name',
        score: { boost: { value: 8 } },
      },
    });

    // 2.3 TEXT SEARCH (Slug) - Boost trung bình (3)
    // Slug vẫn dùng text query vì là token type
    shouldConditions.push({
      text: {
        query: keyword,
        path: 'slug',
        score: { boost: { value: 3 } },
        fuzzy: { maxEdits: 1 },
      },
    });

    // 2.4 TEXT SEARCH (Diễn viên, Đạo diễn) - Boost thấp (1.5)
    shouldConditions.push({
      text: {
        query: keyword,
        path: ['actor', 'director'],
        score: { boost: { value: 1.5 } },
      },
    });

    // 2.5 CONTENT SEARCH - CHỈ TÌM NẾU TỪ KHÓA ĐỦ DÀI
    if (!isShortKeyword) {
      shouldConditions.push({
        text: {
          query: keyword,
          path: ['content', 'categories.name'],
          score: { boost: { value: 0.5 } }, // Boost thấp để không làm loãng kết quả chính
        },
      });
    }

    // --- BƯỚC 3: Audio Type Lookup Logic ---
    const audioTypes = filters.lang ? mapAudioTypeFilter(filters.lang) : [];
    const hasAudioFilter = audioTypes.length > 0;

    // --- BƯỚC 4: Ráp Pipeline ---
    const pipeline = [
      {
        $search: {
          index: 'default',
          compound: {
            must: mustConditions, // Phải thỏa mãn Filter
            should: shouldConditions, // Nên thỏa mãn từ khóa
            minimumShouldMatch: 1, // Bắt buộc match ít nhất 1 điều kiện should (Keyword)
          },
          count: { type: 'total' }, // Đếm tổng số kết quả
        },
      },
      // Lấy Meta và Score
      {
        $addFields: {
          searchMeta: '$$SEARCH_META',
          score: { $meta: 'searchScore' },
        },
      },
    ];

    // --- BƯỚC 5: Xử lý Audio Filter (Nếu có) ---
    // Lưu ý: Filter này chạy sau search nên tốn resource hơn, nhưng bắt buộc vì data nằm ở bảng khác
    if (hasAudioFilter) {
      pipeline.push(
        {
          $lookup: {
            from: 'episodes',
            localField: '_id',
            foreignField: 'movieId',
            as: 'episodes', // Chỉ lookup field cần thiết nếu có thể để tối ưu
          },
        },
        {
          $match: { 'episodes.audioType': { $in: audioTypes } },
        },
      );
    }

    // --- BƯỚC 6: Sắp xếp (Sort) ---
    const sortStage = {};
    // Ưu tiên Score trước (độ phù hợp)
    sortStage.score = -1;

    // Sau đó đến tiêu chí user chọn
    if (sort === 'newest') sortStage.createdAt = -1;
    else if (sort === 'updated') {
      sortStage.updatedAt = -1;
      sortStage.createdAt = -1;
    } else if (sort === 'views') {
      sortStage.viewCount = -1;
    } else if (sort === 'imdb') {
      sortStage.rating = -1;
    } else {
      sortStage.year = -1;
    } // Default

    pipeline.push({ $sort: sortStage });

    // --- BƯỚC 7: Phân trang & Clean Data ---
    pipeline.push(
      { $skip: skip },
      { $limit: perPage },
      {
        $project: {
          // Chỉ lấy field cần thiết
          name: 1,
          original_name: 1,
          slug: 1,
          thumb_url: 1,
          poster_url: 1,
          year: 1,
          quality: 1,
          lang: 1,
          type: 1,
          category: 1,
          score: 1,
          // Giữ lại meta count để return về controller
          totalCount: '$searchMeta.count.total',
        },
      },
    );

    // Chạy Aggregation
    const result = await Movie.aggregate(pipeline);

    // Xử lý kết quả trả về
    const movies = result || [];
    // Lấy total từ record đầu tiên (do searchMeta được gắn vào từng docs)
    // Lưu ý: Nếu có filter Audio (Lookup), totalCount của Atlas Search có thể bị lệch (lớn hơn thực tế).
    // Nhưng chấp nhận được để đổi lấy hiệu năng. Nếu muốn chính xác 100% sau lookup thì phải dùng $facet nhưng sẽ chậm.
    const total = movies.length > 0 ? movies[0].totalCount : 0;

    // Clean up response (bỏ field thừa)
    const cleanedMovies = movies.map((m) => {
      const { totalCount, searchMeta, ...rest } = m;
      return rest;
    });

    return {
      data: transformMovies(cleanedMovies), // Hàm transform của bạn
      pagination: {
        page: currentPage,
        limit: perPage,
        total: hasAudioFilter ? movies.length : total, // Fix tạm total nếu có filter audio sau search
        totalPages: Math.ceil((hasAudioFilter ? movies.length : total) / perPage),
      },
    };
  } catch (error) {
    console.error('Atlas Search Error:', error);
    // --- FALLBACK VỀ MONGODB FIND THƯỜNG ---
    console.warn('Fallback to standard query...');
    const queryFilters = { q: keyword, ...filters };
    const builder = Movie.find(buildQuery(queryFilters, false));
    const result = await paginate(builder, { page, limit, sort });
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
 * - Ưu tiên: Lấy từ castIds (relationship với Cast collection)
 * - Fallback: Lấy từ actor array (backward compatibility)
 * - Giữ nguyên thứ tự theo castIds.order hoặc actor array
 */
const getCast = async (identifier) => {
  const movieDoc = await findMovie(identifier);
  if (!movieDoc) {
    throw new Error('Movie not found');
  }

  // Redis cache key
  const cacheKey = `movie:cast:${movieDoc._id}`;

  // Try cache first
  if (redisService.isConnected) {
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Ưu tiên: Lấy từ castIds nếu có
  if (movieDoc.castIds && Array.isArray(movieDoc.castIds) && movieDoc.castIds.length > 0) {
    const castIds = movieDoc.castIds
      .map((item) => item.castId)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    if (castIds.length > 0) {
      // Query Cast documents từ DB (chỉ query, không xử lý logic khác)
      const castDocs = await Cast.find({ _id: { $in: castIds } }).lean();

      // Tạo Map để lookup nhanh
      const castMap = new Map();
      castDocs.forEach((doc) => {
        castMap.set(doc._id.toString(), doc);
      });

      // Build kết quả theo thứ tự castIds (có order field)
      const result = movieDoc.castIds
        .map((item) => {
          const castDoc = castMap.get(item.castId?.toString());
          if (!castDoc) return null;

          return {
            id: castDoc._id?.toString() || null,
            name: isLatinName(castDoc.name)
              ? castDoc.name
              : castDoc.nameLatin || castDoc.name || 'Không rõ',
            avatar: castDoc.profileUrl || castDoc.profilePath || null,
            profileUrl: castDoc.profileUrl || null,
            profilePath: castDoc.profilePath || null,
            character: item.character || null, // Vai diễn từ castIds
            order: item.order || 999,
            tmdbId: castDoc.tmdbId || null,
            knownForDepartment: castDoc.knownForDepartment || null,
            popularity: castDoc.popularity || 0,
            alsoKnownAs: castDoc.alsoKnownAs || [],
          };
        })
        .filter(Boolean)
        .sort((a, b) => (a.order || 999) - (b.order || 999)); // Sort theo order

      // Cache kết quả (30 phút)
      if (redisService.isConnected) {
        await redisService.set(cacheKey, result, 1800);
      }

      return result;
    }
  }

  // Fallback: Lấy từ actor array (backward compatibility cho phim cũ)
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
      character: null, // Không có character từ actor array
      order: 999,
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
 * Get recommended movies based on a movie using Atlas Search
 * Logic: Atlas Search (genre, director, actor, country) -> Fallback (trending, top rated, newest)
 * @param {string} movieId - Movie ID or slug
 * @param {number} limit - Maximum number of recommendations (default: 10)
 * @returns {Object} { data: Array }
 */
const getRecommendations = async (movieId, limit = 10) => {
  try {
    // 1. Lấy thông tin phim hiện tại
    const currentMovie = await findMovie(movieId);
    if (!currentMovie) {
      throw new Error('Movie not found');
    }

    const currentMovieId = currentMovie._id;

    // 2. Chuẩn bị dữ liệu để tìm kiếm
    const genreSlugs =
      currentMovie.categories?.map((c) => (typeof c === 'object' ? c.slug : c)).filter(Boolean) ||
      [];
    const directors = Array.isArray(currentMovie.director)
      ? currentMovie.director.map((d) => (d || '').trim()).filter(Boolean)
      : [];
    const countrySlugs =
      currentMovie.country?.map((c) => (typeof c === 'object' ? c.slug : c)).filter(Boolean) || [];

    // 3. Lấy tên diễn viên từ Cast collection nếu có castIds (ưu tiên)
    let actorNames = [];
    if (
      currentMovie.castIds &&
      Array.isArray(currentMovie.castIds) &&
      currentMovie.castIds.length > 0
    ) {
      const castIds = currentMovie.castIds
        .map((item) => item.castId)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
        .slice(0, 10); // Chỉ lấy 10 diễn viên đầu tiên để tối ưu

      if (castIds.length > 0) {
        const castDocs = await Cast.find({ _id: { $in: castIds } })
          .select('name')
          .lean();
        actorNames = castDocs.map((doc) => doc.name).filter(Boolean);
      }
    }

    // Fallback: Lấy từ actor array nếu không có castIds
    if (actorNames.length === 0 && Array.isArray(currentMovie.actor)) {
      actorNames = currentMovie.actor
        .map((n) => (n || '').trim())
        .filter(Boolean)
        .slice(0, 10);
    }

    // 4. Xây dựng Pipeline Atlas Search
    const shouldConditions = [];

    // Ưu tiên 1: Cùng thể loại (Quan trọng nhất) - Boost x3
    if (genreSlugs.length > 0) {
      // Sử dụng text query cho slug để có thể boost (hoặc wrap term trong compound)
      // Dùng text query vì slug thường là exact match và có thể search được
      shouldConditions.push({
        text: {
          query: genreSlugs,
          path: 'categories.slug',
          score: { boost: { value: 3 } },
        },
      });
    }

    // Ưu tiên 2: Cùng đạo diễn - Boost x2
    if (directors.length > 0) {
      shouldConditions.push({
        text: {
          query: directors,
          path: 'director',
          score: { boost: { value: 2 } },
        },
      });
    }

    // Ưu tiên 3: Cùng diễn viên - Boost x1.5
    if (actorNames.length > 0) {
      shouldConditions.push({
        text: {
          query: actorNames,
          path: 'actor',
          score: { boost: { value: 1.5 } },
        },
      });
    }

    // Ưu tiên 4: Cùng quốc gia - Boost x1
    if (countrySlugs.length > 0) {
      shouldConditions.push({
        text: {
          query: countrySlugs,
          path: 'country.slug',
          score: { boost: { value: 1 } },
        },
      });
    }

    // Nếu không có điều kiện nào, fallback về logic cũ
    if (shouldConditions.length === 0) {
      return await getRecommendationsFallback(currentMovie, currentMovieId, limit);
    }

    // 5. Tạo Pipeline Atlas Search
    const pipeline = [
      {
        $search: {
          index: 'default',
          compound: {
            // Điều kiện SHOULD (Càng khớp nhiều càng lên đầu)
            should: shouldConditions,
            // Phải khớp ít nhất 1 tiêu chí mới lấy
            minimumShouldMatch: 1,
          },
        },
      },
      // Loại trừ phim hiện tại (đảm bảo chắc chắn)
      {
        $match: {
          _id: { $ne: currentMovieId },
        },
      },
      // Lấy Score để sắp xếp
      {
        $addFields: {
          score: { $meta: 'searchScore' },
        },
      },
      // Sắp xếp: Score cao nhất, sau đó viewCount, rating
      {
        $sort: {
          score: -1,
          viewCount: -1,
          rating: -1,
          year: -1,
        },
      },
      // Lấy dư ra một chút để có nhiều lựa chọn
      { $limit: limit * 2 },
      // Project các trường cần thiết
      {
        $project: {
          name: 1,
          original_name: 1,
          slug: 1,
          thumb_url: 1,
          poster_url: 1,
          year: 1,
          quality: 1,
          time: 1,
          age_rating: 1,
          lang: 1,
          type: 1,
          viewCount: 1,
          rating: 1,
          score: 1,
        },
      },
    ];

    // 6. Chạy Atlas Search
    const relatedMovies = await Movie.aggregate(pipeline);

    // 7. Transform dữ liệu
    let recommendedMovies = transformMovies(relatedMovies);

    // 8. Nếu không đủ kết quả, bổ sung bằng fallback logic
    if (recommendedMovies.length < limit) {
      const excludedIds = [currentMovieId, ...relatedMovies.map((m) => m._id).filter(Boolean)];
      const additional = await getRecommendationsFallback(
        currentMovie,
        currentMovieId,
        limit - recommendedMovies.length,
        excludedIds,
      );
      recommendedMovies = [...recommendedMovies, ...additional.data];
    }

    // 9. Giới hạn và trả về
    return {
      data: recommendedMovies.slice(0, limit),
    };
  } catch (error) {
    console.error('Get Recommendations Error (Atlas Search):', error);
    // Fallback về logic cũ nếu Atlas Search lỗi
    try {
      const currentMovie = await findMovie(movieId);
      if (!currentMovie) {
        throw new Error('Movie not found');
      }
      return await getRecommendationsFallback(currentMovie, currentMovie._id, limit);
    } catch (fallbackError) {
      console.error('Get Recommendations Fallback Error:', fallbackError);
      return { data: [] };
    }
  }
};

/**
 * Fallback logic for recommendations when Atlas Search fails or returns insufficient results
 * @param {Object} currentMovie - Current movie document
 * @param {ObjectId} currentMovieId - Current movie ID
 * @param {number} limit - Number of recommendations needed
 * @param {Array} excludedIds - Array of movie IDs to exclude
 * @returns {Object} { data: Array }
 */
const getRecommendationsFallback = async (
  currentMovie,
  currentMovieId,
  limit,
  excludedIds = [],
) => {
  const excluded = [currentMovieId, ...excludedIds];
  let recommendedMovies = [];

  // Priority 1: Get movies with same genre/category
  if (
    currentMovie.categories &&
    Array.isArray(currentMovie.categories) &&
    currentMovie.categories.length > 0
  ) {
    const genreSlugs = currentMovie.categories
      .map((c) => (typeof c === 'object' ? c.slug : c))
      .filter(Boolean);

    if (genreSlugs.length > 0) {
      const sameGenreMovies = await Movie.find({
        'categories.slug': { $in: genreSlugs },
        _id: { $nin: excluded },
      })
        .sort({ viewCount: -1, rating: -1, year: -1 })
        .limit(limit * 2)
        .lean();

      if (sameGenreMovies && sameGenreMovies.length > 0) {
        sameGenreMovies.forEach((movie) => {
          if (movie._id) {
            excluded.push(movie._id);
          }
        });
        recommendedMovies = transformMovies(sameGenreMovies);
      }
    }
  }

  // Priority 2: If not enough, add trending movies (by viewCount)
  if (recommendedMovies.length < limit) {
    const needed = limit - recommendedMovies.length;
    const trendingMovies = await Movie.find({
      _id: { $nin: excluded },
    })
      .sort({ viewCount: -1, createdAt: -1 })
      .limit(needed * 2)
      .lean();

    if (trendingMovies && trendingMovies.length > 0) {
      trendingMovies.forEach((movie) => {
        if (movie._id) {
          excluded.push(movie._id);
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
      _id: { $nin: excluded },
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
      _id: { $nin: excluded },
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
