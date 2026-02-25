/**
 * Movie Admin Utilities
 * Helper functions for transforming movie data between frontend and database formats
 */

/**
 * Convert Vietnamese string to URL-safe slug
 * @param {string} str - String to slugify
 * @returns {string} URL-safe slug
 */
const slugify = (str = '') => {
  return String(str)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
};

/**
 * Transform categories/genres from frontend format to DB format
 * Frontend can send: ['Action', 'Drama'] or [{name: 'Action', slug: 'action'}, ...]
 * DB needs: [{name: 'Action', slug: 'action'}, ...]
 * @param {Array} categories - Categories array from frontend
 * @returns {Array} Transformed categories array
 */
const transformCategories = (categories) => {
  if (!Array.isArray(categories)) return [];

  return categories
    .map((cat) => {
      if (typeof cat === 'string') {
        return {
          name: cat,
          slug: slugify(cat),
        };
      }
      if (cat && typeof cat === 'object') {
        return {
          name: cat.name || cat.label || '',
          slug: cat.slug || slugify(cat.name || cat.label || ''),
        };
      }
      return null;
    })
    .filter(Boolean);
};

/**
 * Transform country from frontend format to DB format
 * Frontend can send: 'Vietnam' or ['Vietnam'] or [{name: 'Vietnam', slug: 'vietnam'}]
 * DB needs: [{name: 'Vietnam', slug: 'vietnam'}]
 * @param {string|Array} country - Country from frontend
 * @returns {Array} Transformed country array
 */
const transformCountry = (country) => {
  if (!country) return [];

  if (typeof country === 'string') {
    return [
      {
        name: country,
        slug: slugify(country),
      },
    ];
  }

  if (Array.isArray(country)) {
    return country
      .map((c) => {
        if (typeof c === 'string') {
          return {
            name: c,
            slug: slugify(c),
          };
        }
        if (c && typeof c === 'object') {
          return {
            name: c.name || c.label || '',
            slug: c.slug || slugify(c.name || c.label || ''),
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  if (country && typeof country === 'object') {
    return [
      {
        name: country.name || country.label || '',
        slug: country.slug || slugify(country.name || country.label || ''),
      },
    ];
  }

  return [];
};

/**
 * Transform movie data from frontend format to DB format
 * @param {Object} movieData - Movie data from frontend
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {Object} Transformed movie data for DB
 */
const transformMovieData = (movieData, isUpdate = false) => {
  const transformed = {};

  // Map frontend field names to DB field names
  const fieldMappings = {
    title: 'name',
    englishTitle: 'original_name',
    description: 'content',
    duration: 'time',
    poster: 'poster_url',
    backgroundImage: 'thumb_url',
    trailer: 'trailer_url',
    genres: 'categories',
    views: 'viewCount',
    comments: 'commentCount',
    ageRating: 'age_rating',
    isNew: 'isNewRelease',
    isFeatured: 'isFeatured',
  };

  // Apply field mappings
  Object.keys(fieldMappings).forEach((frontendField) => {
    // For URL fields (poster, backgroundImage, trailer), include empty strings
    // For other fields, skip undefined and null
    const isUrlField = frontendField === 'poster' || frontendField === 'backgroundImage' || frontendField === 'trailer';
    
    if (isUrlField) {
      // URL fields: include if not undefined (empty string is valid)
      if (movieData[frontendField] !== undefined) {
        const dbField = fieldMappings[frontendField];
        transformed[dbField] = movieData[frontendField] || '';
      }
    } else {
      // Other fields: skip undefined and null
      if (movieData[frontendField] !== undefined && movieData[frontendField] !== null) {
        const dbField = fieldMappings[frontendField];
        transformed[dbField] = movieData[frontendField];
      }
    }
  });

  // Keep original DB field names if they exist (but exclude actors/directors)
  const excludedFields = ['actors', 'actor', 'directors', 'director'];
  Object.keys(movieData).forEach((key) => {
    if (!fieldMappings[key] && !transformed[key] && !excludedFields.includes(key)) {
      transformed[key] = movieData[key];
    }
  });

  // Transform categories/genres
  if (movieData.genres !== undefined || movieData.categories !== undefined) {
    transformed.categories = transformCategories(movieData.genres || movieData.categories);
  }

  // Transform country
  if (movieData.country !== undefined) {
    transformed.country = transformCountry(movieData.country);
  }

  // Explicitly exclude actors and directors from transformation
  // These fields should not be updated via create/update endpoints
  delete transformed.actor;
  delete transformed.actors;
  delete transformed.director;
  delete transformed.directors;

  // Handle slug generation (only for create, not for update)
  if (!isUpdate && !transformed.slug && transformed.name) {
    transformed.slug = slugify(transformed.name);
  }
  // For update, slug generation is handled in controller/service

  // Set default values for new movies
  if (!isUpdate) {
    transformed.viewCount = transformed.viewCount || 0;
    transformed.commentCount = transformed.commentCount || 0;
    transformed.rating = transformed.rating || 0;
    transformed.totalRatings = transformed.totalRatings || 0;
    transformed.imdb = transformed.imdb || 0;
    transformed.quality = transformed.quality || 'HD';
    transformed.status = transformed.status || 'ongoing';

    // Validate and set age_rating (must be one of: T12, T16, 18+)
    const validAgeRatings = ['T12', 'T16', '18+'];
    if (transformed.age_rating && validAgeRatings.includes(transformed.age_rating)) {
      // Keep the valid value
    } else {
      // Map invalid values to valid ones or use default
      const ageRatingMap = {
        P: 'T12',
        T13: 'T12',
        T14: 'T12',
        T15: 'T16',
        T18: '18+',
      };
      transformed.age_rating = ageRatingMap[transformed.age_rating] || 'T12';
    }

    transformed.type = transformed.type || 'movie'; // Default to 'movie' if not provided
    transformed.isNewRelease = transformed.isNewRelease || false;
    transformed.season = transformed.season || 0;
    transformed.totalEpisodes = transformed.totalEpisodes || 0;
  }

  return transformed;
};

module.exports = {
  slugify,
  transformCategories,
  transformCountry,
  transformMovieData,
};
