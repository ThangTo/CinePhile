import { useEffect, useRef, useState } from "react";
import movieService from "services/movie.service";

const STORAGE_KEY = "cinephine.filterOptions.v1";
const defaultOptions = { genres: [], countries: [] };

const useFilterOptions = () => {
  const [options, setOptions] = useState(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : defaultOptions;
    } catch (error) {
      console.warn("Failed to parse cached filter options:", error);
      return defaultOptions;
    }
  });
  const [loading, setLoading] = useState(
    () => options.genres.length === 0 && options.countries.length === 0
  );
  const [error, setError] = useState(null);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    if (options.genres.length || options.countries.length) {
      setLoading(false);
      return () => {
        abortRef.current = true;
      };
    }

    const fetchOptions = async () => {
      try {
        setLoading(true);
        const response = await movieService.getFilterOptions();
        const payload = response?.data?.genres ? response : { data: response };
        const normalized = {
          genres: payload.data?.genres || payload.genres || [],
          countries: payload.data?.countries || payload.countries || [],
        };

        if (!abortRef.current) {
          setOptions(normalized);
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          setError(null);
        }
      } catch (err) {
        if (!abortRef.current) {
          console.error("Failed to load filter options:", err);
          setError(err);
        }
      } finally {
        if (!abortRef.current) {
          setLoading(false);
        }
      }
    };

    fetchOptions();

    return () => {
      abortRef.current = true;
    };
  }, [options.countries.length, options.genres.length]);

  const refresh = async () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setOptions(defaultOptions);
  };

  return { options, loading, error, refresh };
};

export default useFilterOptions;
