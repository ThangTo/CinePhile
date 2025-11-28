import { useEffect, useState } from "react";
import movieService from "services/movie.service";
import { slugify } from "utils/slugify";
import { normalizeArray } from "utils/ultils";

const createDropdownItems = (map, basePath) =>
  Array.from(map.entries())
    .sort((a, b) => a[1].localeCompare(b[1], "vi"))
    .map(([slug, label]) => ({
      label,
      href: `${basePath}/${slug}`,
    }));

const extractTaxonomies = (movies) => {
  const genreMap = new Map();
  const countryMap = new Map();

  const addToMap = (map, label) => {
    if (!label) return;
    const normalized = label.trim();
    if (!normalized) return;
    const slug = slugify(normalized);
    if (!slug || map.has(slug)) return;
    map.set(slug, normalized);
  };

  movies.forEach((movie) => {
    normalizeArray(movie.genres).forEach((genre) => addToMap(genreMap, genre));
    normalizeArray(movie.country).forEach((country) => addToMap(countryMap, country));
  });

  return {
    genres: createDropdownItems(genreMap, "/genre"),
    countries: createDropdownItems(countryMap, "/country"),
  };
};

const useMovieTaxonomies = ({ limit = 200 } = {}) => {
  const [genres, setGenres] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTaxonomies = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await movieService.getAll({ limit });
        const movies = response?.data || [];

        if (!isMounted || !movies.length) {
          setLoading(false);
          return;
        }

        const { genres: genreItems, countries: countryItems } = extractTaxonomies(movies);
        if (!isMounted) return;
        setGenres(genreItems);
        setCountries(countryItems);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load movie taxonomies:", err);
        setError(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTaxonomies();

    return () => {
      isMounted = false;
    };
  }, [limit]);

  return { genres, countries, loading, error };
};

export default useMovieTaxonomies;
