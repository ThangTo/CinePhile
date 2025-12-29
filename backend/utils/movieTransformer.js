/**
 * Transform a single movie document to frontend format
 * @param {Object} movieDoc - Mongoose document or plain object
 * @returns {Object} Transformed movie object
 */
const transformMovie = (movieDoc) => {
  if (!movieDoc) return null;

  // Convert mongoose document to plain object if needed
  const movie = movieDoc.toObject ? movieDoc.toObject({ versionKey: false }) : movieDoc;

  // Transform _id to id
  const transformed = {
    id: movie._id?.toString() || movie.id,
    ...movie,
  };
  delete transformed._id;

  // Field name mappings: DB → Frontend
  // We keep both old and new field names for backward compatibility
  const fieldMappings = {
    // Basic info
    name: 'title',
    original_name: 'englishTitle',
    content: 'description',
    time: 'duration',

    // Media URLs
    poster_url: 'poster',
    thumb_url: 'backgroundImage',
    trailer_url: 'trailer',

    // Collections
    categories: 'genres', // Also keep 'categories' for backward compatibility
    actor: 'actors',
    director: 'directors',

    // Stats
    viewCount: 'views',
    commentCount: 'comments',

    // Other
    age_rating: 'ageRating',
    isNewRelease: 'isNew',
  };

  // Apply transformations - add frontend fields while keeping original fields
  Object.keys(fieldMappings).forEach((dbField) => {
    // Include empty strings for URL fields (poster_url, thumb_url, trailer_url)
    // Empty string means user wants to clear the URL
    if (transformed[dbField] !== undefined) {
      const frontendField = fieldMappings[dbField];
      // Add frontend field name, keep original for backward compatibility
      transformed[frontendField] = transformed[dbField];
    } else if ((dbField === 'poster_url' || dbField === 'thumb_url' || dbField === 'trailer_url') && transformed[dbField] === '') {
      // Handle empty string explicitly for URL fields
      const frontendField = fieldMappings[dbField];
      transformed[frontendField] = '';
    }
  });

  // Transform categories to genres (array of labels/names only)
  if (transformed.categories && Array.isArray(transformed.categories)) {
    // Extract only the name/label from each category object
    transformed.genres = transformed.categories.map((cat) => {
      // If it's already a string, return as is
      if (typeof cat === 'string') return cat;
      // If it's an object, extract the name
      return cat.name || cat.label || cat;
    });
  } else if (transformed.genres && Array.isArray(transformed.genres)) {
    // If genres already exists, ensure it's array of strings
    transformed.genres = transformed.genres.map((genre) => {
      if (typeof genre === 'string') return genre;
      return genre.name || genre.label || genre;
    });
  } else {
    // Ensure genres is always an array
    transformed.genres = [];
  }

  // Ensure categories is always an array (keep original structure for backward compatibility)
  if (!transformed.categories || !Array.isArray(transformed.categories)) {
    transformed.categories = [];
  }

  // Ensure actors is always an array
  if (!transformed.actors || !Array.isArray(transformed.actors)) {
    transformed.actors = [];
  }

  // Ensure directors is always an array
  if (!transformed.directors || !Array.isArray(transformed.directors)) {
    transformed.directors = [];
  }

  // Transform country to string (take first country's name if array, or use as is if string)
  if (transformed.country) {
    if (Array.isArray(transformed.country) && transformed.country.length > 0) {
      // If it's an array, take the first country's name
      const firstCountry = transformed.country[0];
      if (typeof firstCountry === 'string') {
        transformed.country = firstCountry;
      } else if (firstCountry && typeof firstCountry === 'object') {
        transformed.country = firstCountry.name || firstCountry.label || '';
      } else {
        transformed.country = '';
      }
    } else if (typeof transformed.country === 'object' && transformed.country !== null) {
      // If it's a single object, extract the name
      transformed.country = transformed.country.name || transformed.country.label || '';
    } else if (typeof transformed.country !== 'string') {
      // If it's not a string, convert to empty string
      transformed.country = '';
    }
    // If it's already a string, keep it as is
  } else {
    // If country doesn't exist, set to empty string
    transformed.country = '';
  }

  return transformed;
};

/**
 * Transform an array of movie documents
 * @param {Array} movies - Array of movie documents
 * @returns {Array} Array of transformed movie objects
 */
const transformMovies = (movies) => {
  if (!Array.isArray(movies)) return [];
  return movies.map(transformMovie).filter(Boolean);
};

/**
 * Transform paginated result
 * @param {Object} result - { data: Array, pagination: Object }
 * @returns {Object} Transformed result with transformed data
 */
const transformPaginatedResult = (result) => {
  if (!result) return null;

  return {
    ...result,
    data: transformMovies(result.data || result.movies || []),
    // Also handle 'movies' key for backward compatibility
    // movies: transformMovies(result.movies || result.data || []),
  };
};

module.exports = {
  transformMovie,
  transformMovies,
  transformPaginatedResult,
};
