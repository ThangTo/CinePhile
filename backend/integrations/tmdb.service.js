const axios = require('axios');
const { getHttpsAgent } = require('../utils/httpFetch');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_TIMEOUT_MS = Math.max(3000, Number(process.env.TMDB_TIMEOUT_MS || 15000));

const tmdbClient = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: TMDB_TIMEOUT_MS,
  httpsAgent: getHttpsAgent(),
  headers: {
    Accept: 'application/json',
    'User-Agent': 'CinePhine-TMDB/1.0',
  },
});

if (!TMDB_API_KEY) {
  console.warn('TMDB_API_KEY is not set. TMDb enrichment will be skipped.');
}

async function tmdbGet(path, params = {}) {
  return tmdbClient.get(path, {
    params: {
      api_key: TMDB_API_KEY,
      ...params,
    },
  });
}

async function searchPersonByName(name) {
  if (!TMDB_API_KEY) return null;
  if (!name || !name.trim()) return null;

  try {
    const response = await tmdbGet('/search/person', {
      query: name,
      language: 'vi-VN',
      include_adult: false,
    });

    const results = response.data?.results || [];
    if (!results.length) return null;

    const person = results[0];

    const result = {
      tmdbId: person.id,
      name: person.name || name,
      profilePath: person.profile_path || null,
      profileUrl: person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : null,
      knownForDepartment: person.known_for_department || null,
      popularity: person.popularity || 0,
      alsoKnownAs: person.also_known_as || [],
    };

    console.log(
      `TMDb matched "${name}" -> "${result.name}" (ID: ${result.tmdbId}, ${
        result.profileUrl ? 'with image' : 'no image'
      })`,
    );

    return result;
  } catch (error) {
    console.error(`TMDb searchPersonByName error for "${name}": ${error.message}`);
    return null;
  }
}

async function getCreditsFromTmdb(tmdbId, type = 'movie', season = null) {
  if (!TMDB_API_KEY || !tmdbId) return null;

  try {
    let endpoint;
    if (type === 'tv' && season !== null) {
      endpoint = `/tv/${tmdbId}/season/${season}/credits`;
    } else if (type === 'tv') {
      endpoint = `/tv/${tmdbId}/credits`;
    } else {
      endpoint = `/movie/${tmdbId}/credits`;
    }

    const response = await tmdbGet(endpoint, {
      language: 'vi-VN',
    });

    const cast = (response.data?.cast || []).map((person) => ({
      tmdbId: person.id,
      name: person.name,
      character: person.character || null,
      profilePath: person.profile_path || null,
      profileUrl: person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : null,
      knownForDepartment: person.known_for_department || 'Acting',
      popularity: person.popularity || 0,
      order: person.order || 999,
      alsoKnownAs: person.also_known_as || [],
    }));

    const crew = (response.data?.crew || []).map((person) => ({
      tmdbId: person.id,
      name: person.name,
      job: person.job || null,
      department: person.department || null,
      profilePath: person.profile_path || null,
      profileUrl: person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : null,
      knownForDepartment: person.known_for_department || null,
      popularity: person.popularity || 0,
      alsoKnownAs: person.also_known_as || [],
    }));

    return { cast, crew };
  } catch (error) {
    console.error(`TMDb getCreditsFromTmdb error for ${type}/${tmdbId}: ${error.message}`);
    return null;
  }
}

async function getPersonDetails(personId) {
  if (!TMDB_API_KEY || !personId) return null;

  try {
    const response = await tmdbGet(`/person/${personId}`, {
      language: 'vi-VN',
      append_to_response: 'images,external_ids',
    });

    const person = response.data;
    return {
      tmdbId: person.id,
      name: person.name,
      biography: person.biography || null,
      birthday: person.birthday || null,
      deathday: person.deathday || null,
      place_of_birth: person.place_of_birth || null,
      profilePath: person.profile_path || null,
      profileUrl: person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : null,
      knownForDepartment: person.known_for_department || null,
      popularity: person.popularity || 0,
      gender: person.gender || 0,
      alsoKnownAs: person.also_known_as || [],
      images: person.images?.profiles || [],
      imdbId: person.external_ids?.imdb_id || null,
    };
  } catch (error) {
    console.error(`TMDb getPersonDetails error for person ${personId}: ${error.message}`);
    return null;
  }
}

async function getPersonCredits(personId) {
  if (!TMDB_API_KEY || !personId) return null;

  try {
    const response = await tmdbGet(`/person/${personId}/combined_credits`, {
      language: 'vi-VN',
    });

    const cast = (response.data?.cast || []).map((item) => ({
      id: item.id,
      title: item.title || item.name,
      original_title: item.original_title || item.original_name,
      character: item.character || null,
      release_date: item.release_date || item.first_air_date || null,
      poster_path: item.poster_path || null,
      poster_url: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
      media_type: item.media_type,
      popularity: item.popularity || 0,
      vote_average: item.vote_average || 0,
      vote_count: item.vote_count || 0,
    }));

    const crew = (response.data?.crew || []).map((item) => ({
      id: item.id,
      title: item.title || item.name,
      original_title: item.original_title || item.original_name,
      job: item.job || null,
      department: item.department || null,
      release_date: item.release_date || item.first_air_date || null,
      poster_path: item.poster_path || null,
      poster_url: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
      media_type: item.media_type,
      popularity: item.popularity || 0,
      vote_average: item.vote_average || 0,
      vote_count: item.vote_count || 0,
    }));

    return { cast, crew };
  } catch (error) {
    console.error(`TMDb getPersonCredits error for person ${personId}: ${error.message}`);
    return null;
  }
}

async function getMovieImages(tmdbId, type = 'movie') {
  if (!TMDB_API_KEY || !tmdbId) return null;

  try {
    const endpoint = type === 'tv' ? `/tv/${tmdbId}/images` : `/movie/${tmdbId}/images`;
    const response = await tmdbGet(endpoint, {
      include_image_language: 'en,vi,null',
    });

    const backdrops = (response.data?.backdrops || [])
      .slice(0, 5)
      .map((img) => `https://image.tmdb.org/t/p/original${img.file_path}`);

    const posters = (response.data?.posters || [])
      .slice(0, 5)
      .map((img) => `https://image.tmdb.org/t/p/original${img.file_path}`);

    return { backdrops, posters };
  } catch (error) {
    console.error(`TMDb getMovieImages error for ${type}/${tmdbId}: ${error.message}`);
    return null;
  }
}

async function getMovieLogo(tmdbId, type = 'movie') {
  if (!TMDB_API_KEY || !tmdbId) return null;

  try {
    const endpoint = type === 'tv' ? `/tv/${tmdbId}/images` : `/movie/${tmdbId}/images`;
    const response = await tmdbGet(endpoint, {
      include_image_language: 'vi,en,null',
    });

    const logos = response.data?.logos || [];

    if (logos.length === 0) {
      return null;
    }

    const viLogo = logos.find((logo) => logo.iso_639_1 === 'vi');
    if (viLogo) {
      return `https://image.tmdb.org/t/p/original${viLogo.file_path}`;
    }

    const enLogo = logos.find((logo) => logo.iso_639_1 === 'en');
    if (enLogo) {
      return `https://image.tmdb.org/t/p/original${enLogo.file_path}`;
    }

    return `https://image.tmdb.org/t/p/original${logos[0].file_path}`;
  } catch (error) {
    console.error(`TMDb getMovieLogo error for ${type}/${tmdbId}: ${error.message}`);
    return null;
  }
}

module.exports = {
  searchPersonByName,
  getCreditsFromTmdb,
  getPersonDetails,
  getPersonCredits,
  getMovieImages,
  getMovieLogo,
};
